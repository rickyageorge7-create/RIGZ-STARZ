import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isInstructor(userId: string, courseCode: string) {
  const { data, error } = await admin
    .from("rigza_course_instructors")
    .select("course_code")
    .eq("instructor_user_id", userId)
    .eq("course_code", courseCode)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond(405, { error: "POST required." });

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return respond(401, { error: "Sign in to continue." });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: "Your session is invalid. Sign in again." });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return respond(400, { error: "Request body must be valid JSON." });
  }

  try {
    if (body.action === "load-data") {
      const [{ data: instructorRows, error: instructorError }, { data: workspace, error: workspaceError }] = await Promise.all([
        admin
          .from("rigza_course_instructors")
          .select("course_code")
          .eq("instructor_user_id", authData.user.id)
          .order("course_code"),
        admin
          .from("rigza_workspaces")
          .select("state")
          .eq("user_id", authData.user.id)
          .maybeSingle(),
      ]);
      if (instructorError) throw instructorError;
      if (workspaceError) throw workspaceError;
      const courses = (instructorRows ?? []).map((row) => row.course_code);
      const classes = Array.isArray(workspace?.state?.classes) ? workspace.state.classes : [];
      const codes = [...new Set(classes.map((item) => item?.code).filter((code): code is string => typeof code === "string" && code.length > 0))];
      const summaries = await Promise.all(codes.map(async (courseCode) => {
        const [{ count: total, error: totalError }, { count: attended, error: attendanceError }] = await Promise.all([
          admin.from("rigza_attendance_sessions").select("id", { count: "exact", head: true }).eq("course_code", courseCode),
          admin.from("rigza_attendance_records").select("id", { count: "exact", head: true }).eq("user_id", authData.user.id).eq("course_code", courseCode),
        ]);
        if (totalError) throw totalError;
        if (attendanceError) throw attendanceError;
        return { courseCode, attended: attended ?? 0, total: total ?? 0 };
      }));
      return respond(200, { courses, summaries });
    }

    if (body.action === "start-session") {
      const courseCode = typeof body.courseCode === "string" ? body.courseCode.trim() : "";
      if (!courseCode) return respond(400, { error: "Choose a course first." });
      if (!(await isInstructor(authData.user.id, courseCode))) return respond(403, { error: "This account is not approved to teach that course." });

      const sessionDate = new Date().toISOString().slice(0, 10);
      const { data: existing, error: existingError } = await admin
        .from("rigza_attendance_sessions")
        .select("id")
        .eq("course_code", courseCode)
        .eq("session_date", sessionDate)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return respond(200, { sessionId: existing.id, courseCode, sessionDate, alreadyStarted: true });

      const { data: created, error: createError } = await admin
        .from("rigza_attendance_sessions")
        .insert({ course_code: courseCode, session_date: sessionDate, instructor_user_id: authData.user.id })
        .select("id")
        .single();
      if (createError?.code === "23505") {
        const { data: concurrentSession, error: concurrentError } = await admin
          .from("rigza_attendance_sessions")
          .select("id")
          .eq("course_code", courseCode)
          .eq("session_date", sessionDate)
          .single();
        if (concurrentError) throw concurrentError;
        return respond(200, { sessionId: concurrentSession.id, courseCode, sessionDate, alreadyStarted: true });
      }
      if (createError) throw createError;
      return respond(200, { sessionId: created.id, courseCode, sessionDate, alreadyStarted: false });
    }

    if (body.action === "record-scan") {
      const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
      const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
      if (!sessionId || !studentId) return respond(400, { error: "A class session and student QR are required." });
      if (!/^RIGZA-[0-9A-F-]{36}$/.test(studentId)) return respond(400, { error: "That QR code is not a valid RIGZA Student ID." });

      const { data: session, error: sessionError } = await admin
        .from("rigza_attendance_sessions")
        .select("id, course_code, session_date, instructor_user_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (sessionError) throw sessionError;
      if (!session) return respond(404, { error: "That class session could not be found." });
      if (!(await isInstructor(authData.user.id, session.course_code))) return respond(403, { error: "This account is not approved to record attendance for that course." });

      const { data: workspace, error: workspaceError } = await admin
        .from("rigza_workspaces")
        .select("user_id, profile, state")
        .eq("profile->>studentId", studentId)
        .maybeSingle();
      if (workspaceError) throw workspaceError;
      if (!workspace) return respond(404, { error: "No RIGZA student profile matches that ID." });
      const classes = Array.isArray(workspace.state?.classes) ? workspace.state.classes : [];
      if (!classes.some((item) => item?.code === session.course_code)) {
        return respond(403, { error: "This student does not have that course in their RIGZA schedule." });
      }

      const { error: insertError } = await admin.from("rigza_attendance_records").insert({
        session_id: session.id,
        user_id: workspace.user_id,
        course_code: session.course_code,
        session_date: session.session_date,
      });
      if (insertError?.code === "23505") {
        return respond(200, { alreadyRecorded: true, studentName: workspace.profile?.name || "Student", courseCode: session.course_code });
      }
      if (insertError) throw insertError;
      return respond(200, { alreadyRecorded: false, studentName: workspace.profile?.name || "Student", courseCode: session.course_code });
    }

    return respond(400, { error: "Unknown attendance action." });
  } catch (error) {
    console.error("RIGZA attendance function failed:", error);
    return respond(500, { error: "Attendance could not be processed. Check the Edge Function logs." });
  }
});
