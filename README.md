# RIGZA — Starz Student Guide

RIGZA is a web + Android-installable student guide built for Ricky A. George at Starz University.

## Included now

- Weekly class schedule from the uploaded Starz billing form.
- Manual class editor.
- Assignment/classwork tracker.
- Notifications for assignments: 2 days before, 1 day before, and 30 minutes before.
- Class reminders: 30 minutes and 10 minutes before class.
- Campus check-in using device GPS.
- 300 meter campus radius.
- Daily checkmark rule: Mon–Sat count, Sunday ignored. On class days, the checkmark counts only if you reach campus before the first class.
- Progress dashboard with streak, consistency percentage, assignment completion, and recent daily checkmarks.
- Aurora-inspired visual theme with animated buttons, cards, gradients, and reduced-motion support.
- Dual-mode Campus Copilot: local answers for classes, assignments, streaks, check-ins, simple maths, and study guidance, plus an optional OpenAI-compatible online provider for broader questions.
- Local student profile creation with a hashed device-only account password.
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
5. In Settings, when you are physically at Starz University, tap **Set to my current location** and save it for highest GPS accuracy.

## Important limitation

This PWA version can check location when you tap **Check campus location**. True background geofencing that works even when the app is closed requires a native Android build using Expo/React Native background location permissions. This prototype is the working web/PWA foundation and can be converted into that native Android version next.

Campus Copilot works offline by default. To enable broader online answers, open **Settings > Copilot connection**, choose **Auto** or **Online**, and provide an OpenAI-compatible chat-completions endpoint, model, and API key. Auto mode falls back to the local assistant when the provider is unavailable; Online mode reports connection errors instead. When online, RIGZA sends the question and a short context summary (school name, class count, next class, and open assignment titles) to the configured provider. The endpoint and API key are stored in this browser, so only use a key you are comfortable storing locally and ensure the provider supports browser requests (CORS).

Student accounts are currently local to the browser/device because this PWA has no server account system. A future hosted version can connect the profile and password flow to a secure backend for sign-in across devices.
