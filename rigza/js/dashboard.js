import { supabase } from './supabase.js';
import { appUrl, authMessage, requireStudentProfile, PROFILE_PHOTO_BUCKET } from './auth.js';
import { showMessage } from './ui.js';

const message = document.getElementById('dashboard_message');

async function initialize() {
  try {
    const context = await requireStudentProfile();
    if (!context) return;
    const { user, profile } = context;
    document.getElementById('dashboard_greeting').textContent = `Welcome, ${profile.full_name.split(/\s+/)[0]}`;
    document.getElementById('dashboard_student_id').textContent = profile.student_id;
    document.getElementById('dashboard_school').textContent = profile.school_name;
    document.getElementById('dashboard_programme').textContent = profile.programme;
    document.getElementById('dashboard_level').textContent = profile.academic_level;
    if (profile.avatar_path) {
      const { data } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).createSignedUrl(profile.avatar_path, 300);
      if (data?.signedUrl) {
        const avatar = document.getElementById('dashboard_avatar');
        avatar.src = data.signedUrl;
        avatar.hidden = false;
      }
    }
    document.getElementById('dashboard_email').textContent = user.email || '';
  } catch (error) {
    showMessage(message, authMessage(error), 'error');
  }
}

document.getElementById('dashboard_sign_out').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) showMessage(message, authMessage(error), 'error');
  else window.location.replace(appUrl('index.html'));
});

document.getElementById('dashboard_deactivate').addEventListener('click', async () => {
  const accepted = window.confirm('Deactivate your RIGZA account on this app? Your profile will be hidden and your data retained. This does not cancel or delete your Supabase account.');
  if (!accepted) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return window.location.replace(appUrl('index.html'));
  const { error } = await supabase.from('rigza_profiles').update({ deactivated_at: new Date().toISOString() }).eq('user_id', data.user.id);
  if (error) return showMessage(message, authMessage(error), 'error');
  await supabase.auth.signOut();
  window.location.replace(`${appUrl('index.html')}?deactivated=1`);
});

document.getElementById('dashboard_name').textContent = 'RIGZA';
initialize();

