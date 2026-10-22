'use server';
import { parseSchema } from '@/shared/lib/parseSchema';
import { fetchWhenSignedIn } from '@/features/auth/lib/auth.server';
import type { AuthUser } from '@/features/auth/types/auth';
import { profileSchema, type ProfileInput } from '../schemas/profileSchema';

export async function updateProfileAction(input: ProfileInput) {
  const parsed = await parseSchema(profileSchema, input);
  if (!parsed.success) return parsed.error;
  return fetchWhenSignedIn<AuthUser>('auth/me', {
    method: 'PATCH',
    body: parsed.data,
  });
}
