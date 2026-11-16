import { supabase } from './supabase.js';
import { appUrl, authMessage, getSignedInUser, getStudentProfile, PROFILE_PHOTO_BUCKET, PROFILE_TABLE } from './auth.js';
import { setBusy, showMessage } from './ui.js';

const form = document.getElementById('profile_form');
const message = document.getElementById('profile_message');
const submit = document.getElementById('profile_submit');
const photoInput = document.getElementById('profile_photo');
const photoPreview = document.getElementById('profile_photo_preview');
let user;
let previousProfile;
let temporaryPhotoUrl;

async function initialize() {
  user = await getSignedInUser();
  if (!user) {
    window.location.replace(appUrl('index.html'));
    return;
  }
  previousProfile = await getStudentProfile(user.id);
  if (previousProfile?.deactivated_at) {
    await supabase.auth.signOut();
    window.location.replace(`${appUrl('index.html')}?deactivated=1`);
    return;
  }
  document.getElementById('profile_email').value = user.email || '';
  document.getElementById('profile_full_name').value = previousProfile?.full_name || user.user_metadata?.full_name || '';
  document.getElementById('profile_school').value = previousProfile?.school_name || 'Starz University';
  document.getElementById('profile_programme').value = previousProfile?.programme || '';
  document.getElementById('profile_level').value = previousProfile?.academic_level || '';
  document.getElementById('profile_phone').value = previousProfile?.phone || '';
  document.getElementById('profile_heading').textContent = previousProfile?.onboarding_complete ? 'Your student profile' : 'Set up your student profile';
  document.getElementById('profile_submit').textContent = previousProfile?.onboarding_complete ? 'Save profile' : 'Continue to RIGZA';
  if (previousProfile?.avatar_path) {
    const { data, error } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).createSignedUrl(previousProfile.avatar_path, 300);
    if (!error && data?.signedUrl) setPhotoPreview(data.signedUrl);
  }
}

function setPhotoPreview(url) {
  photoPreview.src = url;
  photoPreview.hidden = false;
}

photoInput.addEventListener('change', () => {
  const file = photoInput.files?.[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
    photoInput.value = '';
    showMessage(message, 'Choose a JPG, PNG, or WebP image smaller than 3 MB.', 'error');
    return;
  }
  if (temporaryPhotoUrl) URL.revokeObjectURL(temporaryPhotoUrl);
  temporaryPhotoUrl = URL.createObjectURL(file);
  setPhotoPreview(temporaryPhotoUrl);
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!user) return;
  setBusy(submit, true, 'Saving profile…');
  showMessage(message, '');
  try {
    const photo = photoInput.files?.[0];
    let avatarPath = previousProfile?.avatar_path || null;
    if (photo) {
      const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
      avatarPath = `${user.id}/profile.${extension}`;
      const { error: uploadError } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).upload(avatarPath, photo, {
        upsert: true,
        contentType: photo.type,
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;
    }

    const profile = {
      user_id: user.id,
      full_name: document.getElementById('profile_full_name').value.trim(),
      school_name: document.getElementById('profile_school').value.trim(),
      programme: document.getElementById('profile_programme').value.trim(),
      academic_level: document.getElementById('profile_level').value,
      phone: document.getElementById('profile_phone').value.trim() || null,
      avatar_path: avatarPath,
      onboarding_complete: true,
      deactivated_at: null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from(PROFILE_TABLE).upsert(profile, { onConflict: 'user_id' });
    if (error) throw error;
    window.location.replace(appUrl('dashboard.html'));
  } catch (error) {
    showMessage(message, authMessage(error), 'error');
  } finally {
    setBusy(submit, false);
  }
});

document.getElementById('profile_sign_out').addEventListener('click', async () => {
  const { error } = await supabase.auth.signOut();
  if (error) showMessage(message, authMessage(error), 'error');
  else window.location.replace(appUrl('index.html'));
});

initialize().catch(error => showMessage(message, authMessage(error), 'error'));

