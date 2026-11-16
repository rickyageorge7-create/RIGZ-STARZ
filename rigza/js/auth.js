import { supabase } from './supabase.js';

export const PROFILE_TABLE = 'rigza_profiles';
export const APP_BASE = new URL('../', import.meta.url);
export const PROFILE_PHOTO_BUCKET = 'rigza-private';

export function appUrl(page) {
  return new URL(page, APP_BASE).href;
}

export async function getSignedInUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user ?? null;
}

export async function getStudentProfile(userId) {
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('user_id, student_id, full_name, school_name, programme, academic_level, phone, avatar_path, onboarding_complete, deactivated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function requireStudentProfile() {
  const user = await getSignedInUser();
  if (!user) {
    window.location.replace(appUrl('index.html'));
    return null;
  }
  const profile = await getStudentProfile(user.id);
  if (!profile || !profile.onboarding_complete) {
    window.location.replace(appUrl('onboarding.html'));
    return null;
  }
  if (profile.deactivated_at) {
    await supabase.auth.signOut();
    window.location.replace(`${appUrl('index.html')}?deactivated=1`);
    return null;
  }
  return { user, profile };
}

export function authMessage(error) {
  const message = error?.message || 'Something went wrong. Please try again.';
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'RIGZA could not reach Supabase. Check the project URL, project status, and your internet connection.';
  }
  if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect. Check both and try again.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email using the link we sent, then sign in.';
  if (/user already registered/i.test(message)) return 'An account already uses this email. Sign in instead.';
  return message;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.replace(appUrl('index.html'));
}

