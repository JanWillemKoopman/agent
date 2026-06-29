import { getSupabaseBrowserClient } from './client';

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-buster zodat de browser de nieuwe foto direct toont.
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function saveAvatarUrl(url: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ data: { avatar_url: url } });
  if (error) throw error;
}
