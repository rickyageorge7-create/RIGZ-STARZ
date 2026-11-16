import { supabase } from './supabase.js';
import { appUrl, authMessage, getSignedInUser, getStudentProfile } from './auth.js';
import { setBusy, showMessage } from './ui.js';

const form = document.getElementById('auth_form');
const message = document.getElementById('auth_message');
const submit = document.getElementById('auth_submit');
const nameField = document.getElementById('auth_full_name');
const modeButton = document.getElementById('auth_mode_toggle');
const googleButton = document.getElementById('google_sign_in');
let mode = 'signin';

function setMode(nextMode) {
  mode = nextMode;
  const signingUp = mode === 'signup';
  nameField.required = signingUp;
  document.getElementById('auth_name_row').hidden = !signingUp;
  submit.textContent = signingUp ? 'Create account' : 'Sign in';
  modeButton.textContent = signingUp ? 'I already have an account' : 'Create a student account';
  document.getElementById('auth_heading').textContent = signingUp ? 'Join RIGZA' : 'Welcome back';
  showMessage(message, '');
}

async function routeSignedInUser() {
  const user = await getSignedInUser();
  if (!user) return;
  const profile = await getStudentProfile(user.id);
  if (profile?.deactivated_at) {
    await supabase.auth.signOut();
    showMessage(message, 'This RIGZA account is deactivated. Contact support if you need help restoring access.', 'error');
    return;
  }
  window.location.replace(appUrl(profile?.onboarding_complete ? 'dashboard.html' : 'onboarding.html'));
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  setBusy(submit, true, mode === 'signup' ? 'Creating account…' : 'Signing in…');
  showMessage(message, '');
  try {
    const email = document.getElementById('auth_email').value.trim();
    const password = document.getElementById('auth_password').value;
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nameField.value.trim() },
          emailRedirectTo: appUrl('index.html'),
        },
      });
      if (error) throw error;
      if (!data.session) {
        showMessage(message, 'Account created. Check your email to confirm it, then return here to sign in.', 'success');
        setMode('signin');
        return;
      }
      window.location.replace(appUrl('onboarding.html'));
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await routeSignedInUser();
  } catch (error) {
    showMessage(message, authMessage(error), 'error');
  } finally {
    setBusy(submit, false);
    submit.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
  }
});

modeButton.addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));
googleButton.addEventListener('click', async () => {
  setBusy(googleButton, true, 'Opening Google…');
  showMessage(message, '');
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: appUrl('index.html') },
    });
    if (error) throw error;
  } catch (error) {
    showMessage(message, authMessage(error), 'error');
    setBusy(googleButton, false);
  }
});

document.getElementById('forgot_password').addEventListener('click', async () => {
  const email = document.getElementById('auth_email').value.trim();
  if (!email) return showMessage(message, 'Enter your email address first.', 'error');
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl('index.html') });
    if (error) throw error;
    showMessage(message, 'Password reset email sent. Check your inbox.', 'success');
  } catch (error) {
    showMessage(message, authMessage(error), 'error');
  }
});

setMode('signin');
const query = new URLSearchParams(window.location.search);
if (query.has('deactivated')) showMessage(message, 'This RIGZA account has been deactivated.', 'info');
if (query.has('error_description')) showMessage(message, query.get('error_description'), 'error');
routeSignedInUser().catch(error => showMessage(message, authMessage(error), 'error'));

