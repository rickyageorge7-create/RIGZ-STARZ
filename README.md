# RIGZA — Starz Student Guide

RIGZA is a web + Android-installable student guide built for Ricky A. George at Starz University.

## Included now

- Weekly class schedule from the uploaded Starz billing form.
- Manual class editor.
- Assignment/classwork tracker.
- Optional assignment percentage grades and a credit-weighted GPA estimate on a 4.0 scale (A 90–100, B 80–89, C 70–79, D 60–69, F below 60).
- Notifications for assignments: 2 days before, 1 day before, and 30 minutes before.
- Class reminders: 30 minutes and 10 minutes before class.
- Campus check-in using device GPS.
- Configurable campus check-in radius, initially set to 300 meters.
- Check-in status explains location permission, GPS, campus-distance, and save failures; successful visits are confirmed only after saving to the signed-in account.
- Sign out is available from the app header and Settings.
- Daily checkmark rule: Mon–Sat count, Sunday ignored. On class days, the checkmark counts only if you reach campus before the first class.
- Progress dashboard with streak, consistency percentage, assignment completion, and recent daily checkmarks.
- Aurora-inspired visual theme with animated buttons, cards, gradients, and reduced-motion support.
- Dual-mode Campus Copilot: local answers for classes, assignments, streaks, check-ins, simple maths, and study guidance, plus an optional OpenAI-compatible online provider for broader questions.
- Supabase email/password authentication with per-user cloud workspace data.
- Profile fields for name, program, and academic level, plus a stable RIGZA Student ID and digital ID card in Settings.
- Settings for Aurora/dark/light/system themes, accent colors, compact layout, reduced motion, and reminder preferences.
- Installable as a PWA on Android from Chrome.

## Your imported schedule

- MATH 108 — Math for Decision-Making — Mon/Wed/Fri — 8:00–9:20 — LAB10-NC
- ENGL 102 — Freshman English II — Mon/Wed/Fri — 10:00–11:00 — LAB3-NC
- FREN 102 — French Grammar II — Mon/Wed/Fri — 1:00–2:20 — LHALL-NC
- ART 277 — Introduction to Digital Media I — Monday — 4:00–7:00 — LAB6-M
- EE 101 — Environmental Education — Friday — 11:00–12:00 — TBA

## How to run locally

Open `index.html` in a browser, or serve the folder with a local static server.

```bash
cd starz-student-app
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Android install

1. Upload/host the folder on any HTTPS web host.
2. Open the site in Chrome on Android.
3. Tap Chrome menu > Add to Home screen / Install app.
4. Enable notification permission.
5. In Settings, when you are physically at Starz University, tap **Set to my current location** and save it for highest GPS accuracy. Check-in requires HTTPS or localhost, browser and device location permission, and an internet connection so the visit can be saved to your account.

## Important limitation

This PWA version can check location when you tap **Check campus location**. True background geofencing that works even when the app is closed requires a native Android build using Expo/React Native background location permissions. This prototype is the working web/PWA foundation and can be converted into that native Android version next.

Campus Copilot works offline by default. To enable broader online answers, open **Settings > Copilot connection**, choose **Auto** or **Online**, and provide an OpenAI-compatible chat-completions endpoint, model, and API key. Auto mode falls back to the local assistant when the provider is unavailable; Online mode reports connection errors instead. When online, RIGZA sends the question and a short context summary (school name, class count, next class, and open assignment titles) to the configured provider. The endpoint and API key are stored only in browser storage, separately for each signed-in account; they are excluded from Supabase workspace writes. Use only a key you are comfortable storing locally and ensure the provider supports browser requests (CORS).

## Supabase setup

1. Create a Supabase project and enable Email provider authentication.
2. In the Supabase SQL editor, run [`supabase-schema.sql`](./supabase-schema.sql). The table policies restrict every workspace row to its authenticated owner.
3. Put the project URL and public `anon` (or publishable) key in [`supabase-config.js`](./supabase-config.js). Never use a service-role key in this file.
4. Add the deployed site URL to Supabase Authentication > URL Configuration, including the password-reset redirect URL.

The app uses Supabase Auth for sessions and stores each user's profile and RIGZA workspace in `rigza_workspaces`. Passwords are handled by Supabase and are never stored in browser storage. New accounts start with an empty workspace and receive practical dashboard prompts to add their first class, assignment, or profile details.

### Per-class QR attendance

1. In Supabase SQL Editor, run [`supabase-attendance-schema.sql`](./supabase-attendance-schema.sql). It adds private instructor approvals, class sessions, and attendance records; students can read only their own records, and clients cannot create attendance entries directly.
2. From the project folder, link the existing Supabase project and deploy the function with JWT verification enabled: `supabase link --project-ref nhjmytyskodzloxexpcr` then `supabase functions deploy rigza-attendance`. Supabase's `SUPABASE_SERVICE_ROLE_KEY` is used only inside the Edge Function runtime and must never be copied into frontend files.
3. Create/confirm each instructor's Supabase Auth account. In Supabase SQL Editor, look up the instructor's `auth.users.id`, then approve only their course codes by inserting rows into `public.rigza_course_instructors` with `instructor_user_id` and the exact `course_code` used in student schedules. For example:

   ```sql
   select id, email from auth.users where email = 'instructor@starz.edu';
   insert into public.rigza_course_instructors (instructor_user_id, course_code)
   values ('PASTE-THE-INSTRUCTOR-UUID-HERE', 'COURSE-CODE')
   on conflict (instructor_user_id, course_code) do nothing;
   ```

   Do not grant instructors direct table access.
4. Students open Settings and show their digital ID QR. An approved instructor opens Progress > Instructor attendance, starts the course's session for that day, and scans each present student's code. Duplicate scans are ignored. Each course's percentage is based on instructor-started sessions recorded in RIGZA.

The camera requires HTTPS (GitHub Pages) or localhost and the instructor must grant camera permission. QR attendance needs an internet connection and a deployed Edge Function; existing daily location check-ins continue to work independently.
