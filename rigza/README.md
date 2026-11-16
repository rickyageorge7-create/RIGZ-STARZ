# RIGZA rebuild — stage 1

This is the new mobile-first RIGZA app, kept alongside the current app so each stage can be tested before replacing anything. It uses plain HTML, CSS, JavaScript modules, and Supabase.

## Stage 1 included

- Email and password sign-up and sign-in.
- Google sign-in (enable Google in Supabase Auth first).
- Student onboarding and editable profile details.
- Private profile photo upload to the `rigza-private` storage bucket.
- Generated RIGZA Student ID.
- Sign-out and confirmed soft deactivation.
- Responsive dashboard shell for the next stages.

Attendance is the next major stage. It will use short-lived QR tokens validated by a server-side Supabase function, course enrolment checks, and one attendance record per student per session. A static student ID QR alone will not mark attendance.

## Setup and test

1. Run `sql/stage1.sql` in the Supabase SQL editor.
2. Check `js/config.js` has the active project URL and its public publishable key. Never put a secret or service-role key in this file.
3. In Supabase Authentication, enable Email. To use Google, add the Google provider and its OAuth credentials in the Supabase dashboard.
4. Add the local or deployed site URL to Authentication > URL Configuration. For local testing allow `http://localhost:8000/rigza/index.html` (or `http://localhost:8000/**`).
5. Start a static server from the repository root, then open `http://localhost:8000/rigza/`:

   ```sh
   python -m http.server 8000
   ```

6. Create a student account, complete onboarding, sign out, and sign back in. Profile photos remain in a private bucket; their object paths are stored in `rigza_profiles`.

## Publish with GitHub Pages

The repository already has a root `index.html`, so publish the repository root and open the rebuild from its `rigza/` subfolder.

1. Push the repository changes to GitHub.
2. In the repository, open **Settings > Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select branch `main` and folder `/(root)`, then save.
5. Wait for the Pages deployment to finish in **Actions**. Open `https://rickyageorge7-create.github.io/RIGZ-STARZ/rigza/`.
6. Add that deployed URL to Supabase Authentication > URL Configuration, including the deployed `index.html` redirect URL.

If Settings > Pages is set to **GitHub Actions**, switch it to **Deploy from a branch** for this no-build vanilla app. GitHub Pages is public, so do not put private student data, passwords, or Supabase secret/service-role keys in repository files.

## Stages

1. Auth and onboarding (this stage).
2. Student ID card, private registration document upload, schedule review/extraction, and course library.
3. Attendance enrollment and face consent/enrollment.
4. Lecturer sessions and student check-in with rotating QR tokens, liveness prompt, server-side validation, and course attendance reporting.
5. Grades, GPA, and semester history.

The library will be a private collection of course materials and saved learning resources, added alongside schedules so materials can be grouped by course.
