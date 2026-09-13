const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SCHOOL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
const DAY_ORDER = Object.fromEntries(WEEK_DAYS.map((day, index) => [day, index]));
const DEFAULT_STATE = {
  settings: {
    schoolName: 'Starz University',
    campusAddress: '76RP+22W Starz University New Campus, Cheeseman Ave, Monrovia, Liberia',
    // Approximate fallback for Sinkor/Cheeseman Ave. Use Settings > Set to my current location while on campus for exact accuracy.
    campusLat: 6.2889,
    campusLng: -10.7747,
    radiusMeters: 300,
    reminders: { assignment2d: true, assignment1d: true, assignment30m: true, class30m: true, class10m: true },
    appearance: { theme: 'aurora', accent: 'blue', compact: false, reducedMotion: false },
    notificationsEnabled: true,
    copilot: { mode: 'auto', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', apiKey: '' }
  },
  profile: { name: '', email: '' },
  classes: [
    { id: crypto.randomUUID(), code: 'MATH 108', name: 'Math for Decision-Making', days: ['Mon', 'Wed', 'Fri'], start: '08:00', end: '09:20', room: 'LAB10-NC', credits: 4 },
    { id: crypto.randomUUID(), code: 'ENGL 102', name: 'Freshman English II', days: ['Mon', 'Wed', 'Fri'], start: '10:00', end: '11:00', room: 'LAB3-NC', credits: 3 },
    { id: crypto.randomUUID(), code: 'FREN 102', name: 'French Grammar II', days: ['Mon', 'Wed', 'Fri'], start: '13:00', end: '14:20', room: 'LHALL-NC', credits: 3 },
    { id: crypto.randomUUID(), code: 'ART 277', name: 'Introduction to Digital Media I', days: ['Mon'], start: '16:00', end: '19:00', room: 'LAB6-M', credits: 3 },
    { id: crypto.randomUUID(), code: 'EE 101', name: 'Environmental Education', days: ['Fri'], start: '11:00', end: '12:00', room: 'TBA', credits: 3 }
  ],
  assignments: [
    { id: crypto.randomUUID(), title: 'Add your first classwork', courseCode: 'MATH 108', due: nextDateTime(2, '18:00'), priority: 'Medium', done: false, notified: {} }
  ],
  checkins: {}
};

let state = loadState();
let deferredInstallPrompt = null;
let calculatorExpression = '';

function nextDateTime(days, time) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return toLocalInputValue(d);
}
function toLocalInputValue(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function loadState() {
  const saved = localStorage.getItem('campuscheck-state');
  if (!saved) return structuredClone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(saved);
    return { ...structuredClone(DEFAULT_STATE), ...parsed, settings: { ...DEFAULT_STATE.settings, ...parsed.settings, reminders: { ...DEFAULT_STATE.settings.reminders, ...(parsed.settings?.reminders || {}) }, appearance: { ...DEFAULT_STATE.settings.appearance, ...(parsed.settings?.appearance || {}) }, copilot: { ...DEFAULT_STATE.settings.copilot, ...(parsed.settings?.copilot || {}) }, notificationsEnabled: parsed.settings?.notificationsEnabled ?? DEFAULT_STATE.settings.notificationsEnabled }, profile: { ...DEFAULT_STATE.profile, ...(parsed.profile || {}) } };
  } catch { return structuredClone(DEFAULT_STATE); }
}
function saveState() { localStorage.setItem('campuscheck-state', JSON.stringify(state)); }
function fmtTime(time) {
  const [h, m] = time.split(':').map(Number);
  const date = new Date(); date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
function fmtDate(dateString) {
  return new Date(dateString).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function todayKey(date = new Date()) { return date.toISOString().slice(0, 10); }
function minutesOf(time) { const [h,m]=time.split(':').map(Number); return h*60+m; }
function isSchoolDay(date = new Date()) { return SCHOOL_DAYS.includes(DAY_NAMES[date.getDay()]); }
function classesForDay(dayName) {
  return state.classes
    .filter(c => c.days.includes(dayName))
    .sort((a, b) => minutesOf(a.start) - minutesOf(b.start) || a.code.localeCompare(b.code));
}
function firstClassToday(date = new Date()) {
  return classesForDay(DAY_NAMES[date.getDay()])[0] || null;
}
function classStartDate(cls, base = new Date()) {
  const d = new Date(base);
  const [h,m] = cls.start.split(':').map(Number);
  d.setHours(h,m,0,0);
  return d;
}
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3300);
}
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dp = (lat2-lat1) * Math.PI / 180;
  const dl = (lon2-lon1) * Math.PI / 180;
  const a = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === viewId));
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewId));
  document.getElementById('viewTitle').textContent = viewId[0].toUpperCase() + viewId.slice(1);
  document.querySelector(`.mobile-nav .nav-item[data-view="${viewId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  render();
}
function render() {
  applyPreferences(); renderDashboard(); renderSchedule(); renderAssignments(); renderProgress(); renderSettings(); hydrateCourseOptions();
}
function applyPreferences() {
  document.documentElement.dataset.theme = state.settings.appearance.theme;
  document.documentElement.dataset.accent = state.settings.appearance.accent;
  document.documentElement.classList.toggle('compact-mode', state.settings.appearance.compact);
  document.documentElement.classList.toggle('reduced-motion', state.settings.appearance.reducedMotion);
}
function previewAppearance() {
  document.documentElement.dataset.theme = themePreference.value;
  document.documentElement.dataset.accent = accentPreference.value;
  document.documentElement.classList.toggle('compact-mode', compactPreference.checked);
  document.documentElement.classList.toggle('reduced-motion', motionPreference.checked);
}
function renderDashboard() {
  const now = new Date();
  const day = DAY_NAMES[now.getDay()];
  const first = firstClassToday(now);
  const checked = state.checkins[todayKey(now)];
  const todayStatus = document.getElementById('todayStatus');
  const todayDetail = document.getElementById('todayDetail');
  if (!isSchoolDay(now)) {
    todayStatus.textContent = 'Today is not counted for school consistency';
    todayDetail.textContent = 'Sunday is ignored in your streak and consistency score.';
  } else if (checked?.status === 'on-time') {
    todayStatus.textContent = 'Campus checkmark earned ✅';
    todayDetail.textContent = `Checked in at ${new Date(checked.time).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}.`;
  } else if (checked?.status === 'late') {
    todayStatus.textContent = 'You reached campus after first class';
    todayDetail.textContent = 'The visit is saved, but it does not count as an on-time daily checkmark.';
  } else if (first) {
    todayStatus.textContent = `Get to campus before ${fmtTime(first.start)}`;
    todayDetail.textContent = `First class: ${first.code} — ${first.name} in ${first.room}. Enter the 300m campus zone before class for your daily ✅.`;
  } else {
    todayStatus.textContent = 'No class today — campus visit can still count';
    todayDetail.textContent = 'Because Saturday is counted, reaching campus today will earn a consistency checkmark.';
  }
  renderPulse(now, checked, first);

  const next = getNextClass();
  document.getElementById('nextClassBadge').textContent = next ? next.day : 'None';
  document.getElementById('nextClass').innerHTML = next ? `<div class="item"><strong>${next.cls.code} — ${next.cls.name}</strong><span class="meta">${next.day}, ${fmtTime(next.cls.start)}–${fmtTime(next.cls.end)} · ${next.cls.room}</span></div>` : '<div class="empty">No upcoming class found.</div>';
  const dueSoon = upcomingAssignments().slice(0, 4);
  document.getElementById('dueSoon').innerHTML = dueSoon.length ? dueSoon.map(renderAssignmentItem).join('') : '<div class="empty">No assignments due soon.</div>';
  const stats = computeStats();
  document.getElementById('streakStat').textContent = `${stats.streak} day${stats.streak === 1 ? '' : 's'}`;
  document.getElementById('consistencyStat').textContent = `${stats.consistency}%`;
  document.getElementById('assignmentStat').textContent = `${stats.assignmentRate}%`;
}
function renderPulse(now, checked, first) {
  const next = getNextClass();
  const openAssignments = upcomingAssignments();
  const nextAssignment = openAssignments[0];
  const stats = computeStats();
  const pulseDate = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  let headline = 'Your day, in focus.';
  let message = 'A clear plan makes a powerful student day.';
  let nextMove = 'Stay steady';
  if (checked?.status === 'on-time') {
    headline = 'You showed up. Keep going.';
    message = 'Your campus checkmark is secured. Use the momentum on one small task.';
    nextMove = nextAssignment ? 'One assignment' : 'Take a breather';
  } else if (first) {
    headline = `Make it before ${fmtTime(first.start)}.`;
    message = `${first.code} is your first class. RIGZA will keep the rest of the day in view.`;
    nextMove = 'Campus check-in';
  } else if (nextAssignment) {
    headline = 'Turn free time into progress.';
    message = `${nextAssignment.title} is your next open task. A focused 20 minutes can move it forward.`;
    nextMove = 'Open task';
  } else if (next) {
    headline = 'Your next chapter is ready.';
    message = `${next.cls.code} is coming up ${next.day.toLowerCase()}. Review your notes before then.`;
    nextMove = 'View schedule';
  }
  document.getElementById('pulseDate').textContent = pulseDate;
  document.getElementById('pulseHeadline').textContent = headline;
  document.getElementById('pulseMessage').textContent = message;
  document.getElementById('pulseNext').textContent = nextMove;
  document.getElementById('pulseWork').textContent = `${openAssignments.length} task${openAssignments.length === 1 ? '' : 's'}`;
  document.getElementById('pulseStreak').textContent = `${stats.streak} day${stats.streak === 1 ? '' : 's'}`;
}
function getNextClass() {
  const now = new Date();
  for (let offset = 0; offset < 8; offset++) {
    const d = new Date(now); d.setDate(now.getDate()+offset);
    const day = DAY_NAMES[d.getDay()];
    for (const cls of classesForDay(day)) {
      const start = classStartDate(cls, d);
      if (start > now) return { cls, day: offset === 0 ? 'Today' : day };
    }
  }
  return null;
}
function renderSchedule() {
  const today = DAY_NAMES[new Date().getDay()];
  document.getElementById('weeklySchedule').innerHTML = WEEK_DAYS.map(day => {
    const list = classesForDay(day);
    const isToday = day === today;
    return `<div class="day-column ${isToday ? 'today' : ''}"><h3>${DAY_LABELS[day]}${isToday ? '<span class="day-today">Today</span>' : ''}</h3>${list.length ? list.map(cls => `<div class="class-pill"><strong>${cls.code}</strong><span>${cls.name}</span><span>${fmtTime(cls.start)}–${fmtTime(cls.end)}</span><span>${cls.room}</span><div class="actions"><button onclick="editClass('${cls.id}')">Edit</button><button onclick="deleteClass('${cls.id}')">Delete</button></div></div>`).join('') : '<div class="empty">No class</div>'}</div>`;
  }).join('');
}
function renderAssignmentItem(a) {
  const due = new Date(a.due);
  const late = !a.done && due < new Date();
  return `<div class="item"><div class="item-row"><div><strong>${a.done ? '✅ ' : ''}${a.title}</strong><div class="meta">${a.courseCode} · Due ${fmtDate(a.due)} · ${a.priority}</div></div><span class="badge ${a.done ? 'green' : late ? 'red' : 'orange'}">${a.done ? 'Done' : late ? 'Late' : 'Open'}</span></div><div class="actions"><button onclick="toggleAssignment('${a.id}')">${a.done ? 'Mark open' : 'Mark done'}</button><button onclick="editAssignment('${a.id}')">Edit</button><button onclick="deleteAssignment('${a.id}')">Delete</button></div></div>`;
}
function renderAssignments() {
  const sorted = [...state.assignments].sort((a,b) => new Date(a.due)-new Date(b.due));
  document.getElementById('assignmentList').innerHTML = sorted.length ? sorted.map(renderAssignmentItem).join('') : '<div class="empty">No assignments yet.</div>';
}
function upcomingAssignments() { return state.assignments.filter(a => !a.done).sort((a,b) => new Date(a.due)-new Date(b.due)); }
function computeStats() {
  const today = new Date();
  let counted = 0, earned = 0, streak = 0, streakLive = true;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    if (!isSchoolDay(d)) continue;
    counted++;
    const ok = state.checkins[todayKey(d)]?.status === 'on-time';
    if (ok) earned++;
  }
  for (let i = 0; i < 60; i++) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    if (!isSchoolDay(d)) continue;
    if (state.checkins[todayKey(d)]?.status === 'on-time' && streakLive) streak++;
    else if (todayKey(d) !== todayKey(today) || state.checkins[todayKey(d)]) break;
  }
  const done = state.assignments.filter(a => a.done).length;
  return { streak, consistency: counted ? Math.round((earned/counted)*100) : 0, assignmentRate: state.assignments.length ? Math.round((done/state.assignments.length)*100) : 0 };
}
function renderProgress() {
  const today = new Date();
  const cells = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate()-i);
    const key = todayKey(d);
    const checked = state.checkins[key]?.status === 'on-time';
    cells.push(`<div class="day-cell ${checked ? 'checked' : ''} ${key === todayKey(today) ? 'today' : ''}"><span>${DAY_NAMES[d.getDay()]}</span><strong>${d.getDate()}</strong><span>${checked ? '✅' : isSchoolDay(d) ? '—' : 'off'}</span></div>`);
  }
  document.getElementById('calendarGrid').innerHTML = cells.join('');
}
function renderSettings() {
  schoolName.value = state.settings.schoolName;
  campusAddress.value = state.settings.campusAddress;
  campusLat.value = state.settings.campusLat;
  campusLng.value = state.settings.campusLng;
  reminder2d.checked = state.settings.reminders.assignment2d;
  reminder1d.checked = state.settings.reminders.assignment1d;
  reminder30m.checked = state.settings.reminders.assignment30m;
  class30m.checked = state.settings.reminders.class30m;
  class10m.checked = state.settings.reminders.class10m;
  themePreference.value = state.settings.appearance.theme;
  accentPreference.value = state.settings.appearance.accent;
  compactPreference.checked = state.settings.appearance.compact;
  motionPreference.checked = state.settings.appearance.reducedMotion;
  notificationsPreference.checked = state.settings.notificationsEnabled;
  copilotMode.value = state.settings.copilot.mode;
  copilotEndpoint.value = state.settings.copilot.endpoint;
  copilotModel.value = state.settings.copilot.model;
  copilotApiKey.value = state.settings.copilot.apiKey;
  setCopilotStatus(state.settings.copilot.mode === 'offline' ? 'Offline assistant ready' : copilotOnlineConfigured() ? 'Online assistant available' : 'Offline assistant ready', copilotOnlineConfigured() && state.settings.copilot.mode !== 'offline' ? 'is-online' : '');
  profileName.value = state.profile.name;
  profileEmail.value = state.profile.email;
  const hasAccount = Boolean(localStorage.getItem('campuscheck-account-hash'));
  accountFormFields.hidden = hasAccount;
  signOutAccount.hidden = !hasAccount;
  accountSummary.hidden = !hasAccount;
  accountSummary.textContent = hasAccount ? `${state.profile.name || 'Student'} · ${state.profile.email || 'Local account'}` : '';
}
function hydrateCourseOptions() {
  const sel = document.getElementById('assignmentCourse');
  const current = sel.value;
  sel.innerHTML = state.classes.map(c => `<option value="${c.code}">${c.code} — ${c.name}</option>`).join('');
  if (current) sel.value = current;
}

function addCopilotMessage(text, type) {
  const messages = document.getElementById('copilotMessages');
  const message = document.createElement('div');
  message.className = `copilot-message ${type}`;
  message.textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
  return message;
}
function copilotClassSummary(cls) {
  const days = cls.days.map(day => DAY_LABELS[day] || day).join(', ');
  return `${cls.code} — ${cls.name} (${days}, ${fmtTime(cls.start)}–${fmtTime(cls.end)}, ${cls.room})`;
}
function normalizeCopilotQuestion(question) {
  return question
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s()+\-*/.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function hasAnyPhrase(prompt, phrases) {
  return phrases.some(phrase => prompt.includes(phrase));
}
function copilotDayAnswer(dayName) {
  const classes = classesForDay(dayName);
  return classes.length
    ? `${DAY_LABELS[dayName] || dayName}: ${classes.map(copilotClassSummary).join('; ')}.`
    : `${DAY_LABELS[dayName] || dayName} is clear — you have no scheduled classes.`;
}
function assignmentHelpReply(prompt) {
  const mathQuestion = prompt.match(/(?:what is|calculate|solve|evaluate)\s+([0-9\s()+\-*/.]+?)(?:\s+for\s+(?:my\s+)?(?:assignment|homework))?$/);
  if (mathQuestion) {
    const expression = mathQuestion[1].trim();
    try {
      const answer = Function(`"use strict"; return (${expression})`)();
      if (!Number.isFinite(answer)) throw new Error('Invalid result');
      return `Let’s work it out: ${expression} = ${answer}. For a graded assignment, show each operation and check that your answer makes sense.`;
    } catch (error) {
      return 'I could not safely read that math expression. Paste it using numbers and operators such as 2*(8+3), and I can calculate it step by step.';
    }
  }
  if (hasAnyPhrase(prompt, ['essay', 'paragraph', 'report', 'writing', 'thesis', 'introduction'])) {
    return 'For a writing assignment, start with the question, write a one-sentence answer or thesis, then support it with 2–3 clear points and evidence from your course material. Finish by connecting the evidence back to the question. Paste your exact prompt and I can help you build an outline without writing the whole submission for you.';
  }
  if (hasAnyPhrase(prompt, ['study', 'revise', 'revision', 'prepare', 'exam', 'test'])) {
    return 'For study help, send the topic and what you already understand. I can help break it into smaller ideas, make practice questions, explain terms, and check your reasoning. I will guide you rather than pretend to do the entire graded work for you.';
  }
  return 'Yes. Paste the exact assignment question, include the subject, and tell me what you have tried so far. I can explain the concept, break the task into steps, check your work, and help you make an outline. I am an offline assistant, so detailed help works best when you provide the full question.';
}
function copilotOnlineConfigured() {
  const config = state.settings.copilot;
  return Boolean(config.endpoint && config.model && config.apiKey);
}
function setCopilotStatus(text, stateClass = '') {
  const status = document.getElementById('copilotStatus');
  status.textContent = text;
  status.className = stateClass;
}
function onlineCopilotContext() {
  const next = getNextClass();
  const due = upcomingAssignments().slice(0, 3);
  return [
    `Student app: RIGZA for ${state.settings.schoolName}.`,
    `Saved classes: ${state.classes.length}.`,
    next ? `Next class: ${next.cls.code} on ${next.day} at ${fmtTime(next.cls.start)}.` : 'No upcoming class is scheduled.',
    due.length ? `Open assignments: ${due.map(a => a.title).join(', ')}.` : 'No open assignments.'
  ].join(' ');
}
async function onlineCopilotReply(question) {
  const config = state.settings.copilot;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.3,
        messages: [
          { role: 'system', content: `You are RIGZA, a concise and encouraging student assistant. Explain concepts and guide academic work without doing dishonest graded work. ${onlineCopilotContext()}` },
          { role: 'user', content: question }
        ]
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Online provider returned ${response.status}.`);
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error('Online provider returned no answer.');
    return answer;
  } finally {
    window.clearTimeout(timeout);
  }
}
async function answerCopilot(question) {
  const mode = state.settings.copilot.mode;
  const configured = copilotOnlineConfigured();
  if (mode !== 'offline' && configured) {
    setCopilotStatus('Connecting online…', 'is-online');
    try {
      const answer = await onlineCopilotReply(question);
      setCopilotStatus('Online assistant connected', 'is-online');
      return answer;
    } catch (error) {
      setCopilotStatus(mode === 'online' ? 'Online connection failed' : 'Offline fallback', 'is-warning');
      if (mode === 'online') return `I could not reach the online assistant. ${error.name === 'AbortError' ? 'The request timed out.' : 'Check the endpoint, API key, and internet connection.'}`;
    }
  } else if (mode === 'online') {
    setCopilotStatus('Online setup needed', 'is-warning');
    return 'Online mode is selected, but the endpoint, model, or API key is missing. Open Settings → Copilot connection, or switch to Auto/Offline mode.';
  }
  setCopilotStatus('Offline assistant ready');
  return copilotReply(question);
}
function copilotReply(question) {
  const prompt = normalizeCopilotQuestion(question);
  const hasAccount = Boolean(localStorage.getItem('campuscheck-account-hash'));
  const studentName = state.profile.name || 'student';
  const creatorQuestion = hasAnyPhrase(prompt, ['creator', 'who made', 'who built', 'who created', 'developer', 'author', 'owner', 'who is ricky']);
  const identityQuestion = hasAnyPhrase(prompt, ['who am i', 'my name', 'my email', 'my account', 'my profile']);
  const greeting = /^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(prompt);

  if (creatorQuestion) {
    return 'This page and RIGZA were created by Ricky A. George for Starz University students. Ricky built it to make schedules, classwork, campus check-ins, reminders, progress, and student tools easier to manage.';
  }
  if (identityQuestion) {
    return hasAccount
      ? `You are ${studentName}. Your local RIGZA account uses ${state.profile.email || 'the email saved on this device'}. I can use your saved schedule, assignments, check-ins, progress, and preferences.`
      : 'You have not created a local student account yet. Open Settings to create one; your profile stays on this device.';
  }
  if (greeting) {
    return hasAccount
      ? `Hi ${studentName}! I can help with your schedule, assignments, check-ins, progress, settings, or questions about RIGZA.`
      : 'Hi! I can help with your schedule, assignments, check-ins, progress, or questions about RIGZA. Create a local account in Settings so I can address you by name.';
  }
  if (hasAnyPhrase(prompt, ['help with assignment', 'help me with my assignment', 'assignment question', 'solve my assignment', 'explain my assignment', 'help with homework', 'help me with homework', 'homework question', 'solve this', 'explain this question']) || (prompt.includes('assignment') && hasAnyPhrase(prompt, ['help', 'what is', 'calculate', 'solve', 'explain']))) {
    return assignmentHelpReply(prompt);
  }
  if (hasAnyPhrase(prompt, ['what can you do', 'what do you do', 'help me', 'how do you work', 'how can you help'])) {
    return 'I can answer questions about RIGZA, help you work through an assignment, solve simple math expressions, suggest essay outlines, read your saved classes and times, check today’s schedule, list upcoming assignments, explain your check-in and streak, review progress, and explain settings. I work offline, so detailed assignment help works best when you paste the exact question.';
  }
  if (hasAnyPhrase(prompt, ['what is campuscheck', 'what is this app', 'what does this app do', 'about campuscheck', 'about this page'])) {
    return 'RIGZA is a local Starz University student guide. It keeps your schedule, assignments, campus check-ins, reminders, progress, calculator, StarzAccess link, and student profile together on this device.';
  }
  if (hasAnyPhrase(prompt, ['privacy', 'private', 'where is my data', 'data stored', 'is my data safe'])) {
    return 'Your schedule, assignments, profile, and preferences are stored locally in this browser. They are not uploaded by RIGZA. The app password and account password are stored as local cryptographic hashes.';
  }
  if (hasAnyPhrase(prompt, ['how check in', 'how do i check in', 'check in', 'campus check', 'location'])) {
    const checked = state.checkins[todayKey()];
    return checked?.status === 'on-time'
      ? 'You already earned today’s on-time campus checkmark. The app checks whether your device is within the configured 300-meter campus zone.'
      : 'Open Dashboard and tap “Check campus location” while you are on campus. Location permission must be allowed, and you need to be within the configured 300-meter campus zone. On class days, arrive before your first class for an on-time checkmark.';
  }
  if (hasAnyPhrase(prompt, ['tomorrow', 'next day'])) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return copilotDayAnswer(DAY_NAMES[tomorrow.getDay()]);
  }
  if (hasAnyPhrase(prompt, ['today', 'now']) && hasAnyPhrase(prompt, ['class', 'schedule', 'course'])) {
    const today = DAY_NAMES[new Date().getDay()];
    return `Today is ${copilotDayAnswer(today)}`;
  }
  if (hasAnyPhrase(prompt, ['all class', 'all course', 'my classes', 'my courses', 'class list', 'course list'])) {
    return state.classes.length
      ? `You have ${state.classes.length} saved classes: ${state.classes.map(copilotClassSummary).join('; ')}.`
      : 'You do not have any classes saved yet.';
  }
  if (hasAnyPhrase(prompt, ['next class', 'upcoming class', 'when is my class', 'class schedule', 'course schedule'])) {
    const next = getNextClass();
    return next
      ? `Your next class is ${next.cls.code}, ${next.cls.name}, ${next.day.toLowerCase()} at ${fmtTime(next.cls.start)} in ${next.cls.room}.`
      : 'You are clear! There are no upcoming classes in the next week.';
  }
  if (hasAnyPhrase(prompt, ['due', 'assignment', 'homework', 'classwork', 'what do i have to submit'])) {
    const due = upcomingAssignments().slice(0, 3);
    return due.length
      ? `Coming up: ${due.map(a => `${a.title} (${fmtDate(a.due)})`).join('; ')}.`
      : 'You have no open assignments right now. Nice work!';
  }
  if (hasAnyPhrase(prompt, ['streak', 'progress', 'score', 'consistency', 'how am i doing'])) {
    const stats = computeStats();
    return `You are at a ${stats.streak}-day campus streak, ${stats.consistency}% consistency, and ${stats.assignmentRate}% assignments completed.`;
  }
  if (hasAnyPhrase(prompt, ['setting', 'theme', 'appearance', 'notification', 'reminder', 'dark mode', 'light mode'])) {
    const appearance = state.settings.appearance;
    return `Your current settings use the ${appearance.theme} theme with the ${appearance.accent} accent. ${appearance.compact ? 'Compact layout is on' : 'Compact layout is off'}, and ${appearance.reducedMotion ? 'reduced motion is on' : 'animations are on'}.`;
  }
  if (hasAnyPhrase(prompt, ['app', 'campuscheck', 'starzaccess', 'tool', 'calculator'])) {
    return 'RIGZA is a local Starz University student guide. It includes your weekly schedule, classwork tracker, reminders, campus check-in, progress dashboard, calculator, StarzAccess link, and this offline Copilot.';
  }
  return `I’m ready to help, ${studentName}. Try asking “Help me with an assignment”, paste a math question, ask for an essay outline, or ask “Who created this page?” I can use your saved app data offline. For broader questions, switch to Auto or Online mode and configure a provider in Settings.`;
}
function setCopilotOpen(open) {
  const panel = document.getElementById('copilotPanel');
  const toggle = document.getElementById('copilotToggle');
  panel.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (open) document.getElementById('copilotInput').focus();
}

function updateCalculator() {
  document.getElementById('calculatorDisplay').textContent = calculatorExpression || '0';
}
function calculateExpression() {
  if (!calculatorExpression || !/^[0-9+\-*/.() ]+$/.test(calculatorExpression)) return;
  try {
    const result = Function(`"use strict"; return (${calculatorExpression})`)();
    if (!Number.isFinite(result)) throw new Error('Invalid result');
    calculatorExpression = String(result);
  } catch (error) {
    calculatorExpression = '';
    showToast('That calculation could not be completed.');
  }
  updateCalculator();
}
async function setupBiometric() {
  const status = document.getElementById('biometricStatus');
  if (!window.PublicKeyCredential || !navigator.credentials) {
    status.textContent = 'Biometric unlock is not supported in this browser.';
    return showToast('Use a supported HTTPS browser for biometric unlock.');
  }
  try {
    const credential = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'RIGZA' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'rigza-user', displayName: 'RIGZA student' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
      attestation: 'none'
    }});
    if (!credential) throw new Error('No credential created');
    localStorage.setItem('campuscheck-biometric-ready', '1');
    status.textContent = 'Biometric unlock is ready on this device.';
    showToast('Biometric unlock set up.');
  } catch (error) {
    status.textContent = 'Setup cancelled or unavailable on this device.';
    showToast('Biometric setup was not completed.');
  }
}
async function hashAppPassword(password, salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, material, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
function bytesFromBase64(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}
function openPasswordSetup() {
  document.getElementById('passwordDialogTitle').textContent = 'Protect RIGZA';
  document.getElementById('passwordDialogHint').textContent = 'This password stays on this device as a secure hash.';
  document.getElementById('newPasswordLabel').hidden = false;
  document.getElementById('confirmPasswordLabel').hidden = false;
  document.getElementById('unlockPasswordLabel').hidden = true;
  document.getElementById('passwordSubmit').textContent = 'Save password';
  document.getElementById('passwordDialog').showModal();
}
async function saveAppPassword(event) {
  event.preventDefault();
  const password = document.getElementById('newAppPassword').value;
  const confirmation = document.getElementById('confirmAppPassword').value;
  if (password.length < 6 || password !== confirmation) return showToast('Use 6+ matching password characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem('campuscheck-password-salt', btoa(String.fromCharCode(...salt)));
  localStorage.setItem('campuscheck-password-hash', await hashAppPassword(password, salt));
  document.getElementById('passwordStatus').textContent = 'App password is set on this device.';
  document.getElementById('passwordDialog').close();
  document.getElementById('passwordForm').reset();
  showToast('App password saved.');
}
async function unlockApp() {
  const password = document.getElementById('lockPassword').value;
  const saltValue = localStorage.getItem('campuscheck-password-salt');
  const savedHash = localStorage.getItem('campuscheck-password-hash');
  if (!saltValue || !savedHash) return;
  const candidate = await hashAppPassword(password, bytesFromBase64(saltValue));
  if (candidate !== savedHash) {
    document.getElementById('lockStatus').textContent = 'That password does not match.';
    return;
  }
  document.getElementById('appLock').hidden = true;
  document.getElementById('lockPassword').value = '';
}
function lockAppIfConfigured() {
  const configured = localStorage.getItem('campuscheck-password-hash');
  document.getElementById('passwordStatus').textContent = configured ? 'App password is set on this device.' : 'No app password set';
  if (configured) document.getElementById('appLock').hidden = false;
}
async function createLocalAccount() {
  const name = profileName.value.trim();
  const email = profileEmail.value.trim();
  const password = accountPassword.value;
  if (!name || !email || !email.includes('@')) return showToast('Enter your name and a valid email address.');
  if (password.length < 6) return showToast('Use an account password with at least 6 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  state.profile = { name, email };
  localStorage.setItem('campuscheck-account-salt', btoa(String.fromCharCode(...salt)));
  localStorage.setItem('campuscheck-account-hash', await hashAppPassword(password, salt));
  accountPassword.value = '';
  saveState();
  render();
  showToast('Your local student account was created.');
}
function signOutAccount() {
  state.profile = { name: '', email: '' };
  localStorage.removeItem('campuscheck-account-salt');
  localStorage.removeItem('campuscheck-account-hash');
  saveState();
  render();
  showToast('Signed out on this device.');
}

async function checkCampusLocation() {
  if (!navigator.geolocation) return showToast('Location is not available on this device.');
  navigator.geolocation.getCurrentPosition(pos => {
    const dist = distanceMeters(pos.coords.latitude, pos.coords.longitude, Number(state.settings.campusLat), Number(state.settings.campusLng));
    const today = new Date();
    if (dist > state.settings.radiusMeters) return showToast(`You are about ${Math.round(dist)}m away — not inside the campus zone yet.`);
    if (!isSchoolDay(today)) return showToast('Today is not counted for your school streak.');
    const first = firstClassToday(today);
    let status = 'on-time';
    if (first && today > classStartDate(first, today)) status = 'late';
    state.checkins[todayKey(today)] = { time: today.toISOString(), status, distanceMeters: Math.round(dist) };
    saveState(); render();
    showToast(status === 'on-time' ? 'Campus checkmark earned ✅' : 'Campus visit saved, but it was after first class.');
  }, err => showToast(`Location error: ${err.message}`), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}
function openClassDialog(cls = null) {
  classForm.reset(); classId.value = cls?.id || ''; courseCode.value = cls?.code || ''; courseName.value = cls?.name || ''; startTime.value = cls?.start || '08:00'; endTime.value = cls?.end || '09:00'; room.value = cls?.room || '';
  [...courseDays.options].forEach(o => o.selected = cls?.days?.includes(o.value) || false);
  classDialog.showModal();
}
function editClass(id) { openClassDialog(state.classes.find(c => c.id === id)); }
function deleteClass(id) { state.classes = state.classes.filter(c => c.id !== id); saveState(); render(); showToast('Class deleted.'); }
function saveClassFromForm(e) {
  e.preventDefault();
  const days = [...courseDays.selectedOptions].map(o => o.value).sort((a, b) => DAY_ORDER[a] - DAY_ORDER[b]);
  if (!days.length) return showToast('Pick at least one day.');
  const cls = { id: classId.value || crypto.randomUUID(), code: courseCode.value.trim(), name: courseName.value.trim(), days, start: startTime.value, end: endTime.value, room: room.value.trim() || 'TBA', credits: 0 };
  state.classes = classId.value ? state.classes.map(c => c.id === cls.id ? cls : c) : [...state.classes, cls];
  saveState(); classDialog.close(); render(); showToast('Class saved.'); scheduleReminderChecks();
}
function openAssignmentDialog(a = null) {
  assignmentForm.reset(); hydrateCourseOptions(); assignmentId.value = a?.id || ''; assignmentTitle.value = a?.title || ''; assignmentCourse.value = a?.courseCode || state.classes[0]?.code || ''; assignmentDue.value = a?.due || nextDateTime(1, '18:00'); assignmentPriority.value = a?.priority || 'Medium'; assignmentDialog.showModal();
}
function editAssignment(id) { openAssignmentDialog(state.assignments.find(a => a.id === id)); }
function deleteAssignment(id) { state.assignments = state.assignments.filter(a => a.id !== id); saveState(); render(); showToast('Assignment deleted.'); }
function toggleAssignment(id) { state.assignments = state.assignments.map(a => a.id === id ? { ...a, done: !a.done } : a); saveState(); render(); }
function saveAssignmentFromForm(e) {
  e.preventDefault();
  const a = { id: assignmentId.value || crypto.randomUUID(), title: assignmentTitle.value.trim(), courseCode: assignmentCourse.value, due: assignmentDue.value, priority: assignmentPriority.value, done: false, notified: {} };
  const existing = state.assignments.find(x => x.id === a.id);
  state.assignments = assignmentId.value ? state.assignments.map(x => x.id === a.id ? { ...existing, ...a, done: existing?.done || false, notified: {} } : x) : [...state.assignments, a];
  saveState(); assignmentDialog.close(); render(); showToast('Assignment saved.'); scheduleReminderChecks();
}
async function requestNotifications() {
  if (!('Notification' in window)) return showToast('This browser does not support notifications.');
  const permission = await Notification.requestPermission();
  showToast(permission === 'granted' ? 'Notifications enabled.' : 'Notifications not allowed yet.');
  if ('serviceWorker' in navigator) await navigator.serviceWorker.register('sw.js');
  scheduleReminderChecks();
}
function notify(title, body) {
  if (!state.settings.notificationsEnabled || Notification.permission !== 'granted') return;
  if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, icon: 'icons/starz.jpg', badge: 'icons/starz.jpg' }));
  else new Notification(title, { body });
}
function scheduleReminderChecks() { checkReminders(); }
function checkReminders() {
  const now = new Date();
  const windows = [
    ['2d', 48*60, state.settings.reminders.assignment2d], ['1d', 24*60, state.settings.reminders.assignment1d], ['30m', 30, state.settings.reminders.assignment30m]
  ];
  for (const a of state.assignments) {
    if (a.done) continue;
    const due = new Date(a.due);
    const mins = Math.round((due-now)/60000);
    for (const [key, target, enabled] of windows) {
      if (enabled && mins <= target && mins > target-5 && !a.notified?.[key]) {
        notify(`Assignment reminder: ${a.title}`, `${a.courseCode} is due ${fmtDate(a.due)}.`);
        a.notified = { ...(a.notified || {}), [key]: true };
      }
    }
  }
  const todayClasses = classesForDay(DAY_NAMES[now.getDay()]);
  for (const cls of todayClasses) {
    const start = classStartDate(cls, now);
    const mins = Math.round((start-now)/60000);
    const keyBase = `${todayKey(now)}-${cls.id}`;
    if (state.settings.reminders.class30m && mins <= 30 && mins > 25 && !localStorage.getItem(`${keyBase}-30`)) { notify(`Class soon: ${cls.code}`, `${cls.name} starts in 30 minutes at ${cls.room}.`); localStorage.setItem(`${keyBase}-30`, '1'); }
    if (state.settings.reminders.class10m && mins <= 10 && mins > 5 && !localStorage.getItem(`${keyBase}-10`)) { notify(`Class soon: ${cls.code}`, `${cls.name} starts in 10 minutes at ${cls.room}.`); localStorage.setItem(`${keyBase}-10`, '1'); }
  }
  saveState(); renderDashboard();
}

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstallPrompt = e; installBtn.classList.remove('hidden'); });
installBtn?.addEventListener('click', async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); deferredInstallPrompt = null; installBtn.classList.add('hidden'); });
document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
checkLocation.addEventListener('click', checkCampusLocation);
document.getElementById('enableNotifications').addEventListener('click', requestNotifications);
addClassBtn.addEventListener('click', () => openClassDialog());
addAssignmentBtn.addEventListener('click', () => openAssignmentDialog());
document.getElementById('cancelClass').addEventListener('click', () => classDialog.close());
document.getElementById('cancelAssignment').addEventListener('click', () => assignmentDialog.close());
document.getElementById('cancelPassword').addEventListener('click', () => passwordDialog.close());
classForm.addEventListener('submit', saveClassFromForm);
assignmentForm.addEventListener('submit', saveAssignmentFromForm);
markTestDay.addEventListener('click', () => { state.checkins[todayKey()] = { time: new Date().toISOString(), status: 'on-time', demo: true }; saveState(); render(); showToast('Demo checkmark added for today.'); });
saveSettings.addEventListener('click', () => {
  state.settings.schoolName = schoolName.value.trim(); state.settings.campusAddress = campusAddress.value.trim(); state.settings.campusLat = Number(campusLat.value); state.settings.campusLng = Number(campusLng.value);
  state.settings.reminders = { assignment2d: reminder2d.checked, assignment1d: reminder1d.checked, assignment30m: reminder30m.checked, class30m: class30m.checked, class10m: class10m.checked };
  state.settings.appearance = { theme: themePreference.value, accent: accentPreference.value, compact: compactPreference.checked, reducedMotion: motionPreference.checked };
  state.settings.notificationsEnabled = notificationsPreference.checked;
  state.settings.copilot = { mode: copilotMode.value, endpoint: copilotEndpoint.value.trim(), model: copilotModel.value.trim(), apiKey: copilotApiKey.value.trim() };
  saveState(); render(); showToast('Settings saved.');
});
themePreference.addEventListener('change', previewAppearance);
accentPreference.addEventListener('change', previewAppearance);
compactPreference.addEventListener('change', previewAppearance);
motionPreference.addEventListener('change', previewAppearance);
useCurrentLocation.addEventListener('click', () => {
  if (!navigator.geolocation) return showToast('Location is not available.');
  navigator.geolocation.getCurrentPosition(pos => { campusLat.value = pos.coords.latitude.toFixed(6); campusLng.value = pos.coords.longitude.toFixed(6); showToast('Current location filled. Save settings to use it.'); }, err => showToast(err.message), { enableHighAccuracy: true, timeout: 12000 });
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render();
setInterval(checkReminders, 60_000);
setTimeout(checkReminders, 1500);
document.getElementById('setupAppPassword').addEventListener('click', openPasswordSetup);
document.getElementById('passwordForm').addEventListener('submit', saveAppPassword);
document.getElementById('unlockApp').addEventListener('click', unlockApp);
document.getElementById('createAccount').addEventListener('click', createLocalAccount);
document.getElementById('signOutAccount').addEventListener('click', signOutAccount);
lockAppIfConfigured();

document.getElementById('copilotToggle').addEventListener('click', () => {
  const panel = document.getElementById('copilotPanel');
  setCopilotOpen(panel.hidden);
});
document.getElementById('copilotClose').addEventListener('click', () => setCopilotOpen(false));
document.getElementById('pulseAssignments').addEventListener('click', () => switchView('assignments'));
document.getElementById('pulseCopilot').addEventListener('click', () => setCopilotOpen(true));
document.querySelectorAll('[data-copilot-prompt]').forEach(button => {
  button.addEventListener('click', async () => {
    const prompt = button.dataset.copilotPrompt;
    addCopilotMessage(prompt, 'user');
    const pending = addCopilotMessage('Thinking…', 'bot pending');
    pending.textContent = await answerCopilot(prompt);
    pending.classList.remove('pending');
  });
});
document.getElementById('copilotForm').addEventListener('submit', async event => {
  event.preventDefault();
  const input = document.getElementById('copilotInput');
  const prompt = input.value.trim();
  if (!prompt) return;
  addCopilotMessage(prompt, 'user');
  input.value = '';
  const pending = addCopilotMessage('Thinking…', 'bot pending');
  pending.textContent = await answerCopilot(prompt);
  pending.classList.remove('pending');
});
document.querySelectorAll('[data-calc-value], [data-calc-action]').forEach(button => {
  button.addEventListener('click', () => {
    const value = button.dataset.calcValue;
    const action = button.dataset.calcAction;
    if (value) calculatorExpression += value;
    if (action === 'clear') calculatorExpression = '';
    if (action === 'backspace') calculatorExpression = calculatorExpression.slice(0, -1);
    if (action === 'equals') calculateExpression();
    updateCalculator();
  });
});
document.addEventListener('keydown', event => {
  if (!document.getElementById('tools').classList.contains('active')) return;
  const allowedKeys = '0123456789.+-*/()';
  if (allowedKeys.includes(event.key)) {
    calculatorExpression += event.key;
    updateCalculator();
  } else if (event.key === 'Enter' || event.key === '=') {
    event.preventDefault();
    calculateExpression();
  } else if (event.key === 'Backspace') {
    calculatorExpression = calculatorExpression.slice(0, -1);
    updateCalculator();
  } else if (event.key === 'Escape') {
    calculatorExpression = '';
    updateCalculator();
  }
});
document.getElementById('setupBiometric').addEventListener('click', setupBiometric);
if (localStorage.getItem('campuscheck-biometric-ready') === '1') {
  document.getElementById('biometricStatus').textContent = 'Biometric unlock is ready on this device.';
}
document.querySelectorAll('[data-copy-number]').forEach(button => {
  button.addEventListener('click', async () => {
    const number = button.dataset.copyNumber;
    try {
      await navigator.clipboard.writeText(number);
      const originalLabel = button.textContent;
      button.textContent = 'Copied';
      showToast('Number copied to clipboard.');
      window.setTimeout(() => { button.textContent = originalLabel; }, 1600);
    } catch (error) {
      showToast(`Copy unavailable. Use ${number}.`);
    }
  });
});
