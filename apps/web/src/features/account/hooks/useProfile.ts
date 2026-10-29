'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib';
import { useAuth, authKeys, type AuthSession } from '@/features/auth';
import { updateProfileAction } from '../actions/account.actions';
import type { ProfileInput } from '../schemas/profileSchema';

export function useProfile() {
  const { user } = useAuth();
  const client = useQueryClient();
  const update = useMutation({
    mutationKey: authKeys.mutation('update-profile'),
    mutationFn: (input: ProfileInput) =>
      invokeAction(() => updateProfileAction(input)),
    onSuccess: async (updated) => {
      await client.cancelQueries({ queryKey: authKeys.me });
      // A late save must never restore a signed-out account or overwrite another account.
      if (
        client.getQueryData<AuthSession>(authKeys.me)?.user?.id === updated.id
      )
        client.setQueryData<AuthSession>(authKeys.me, { user: updated });
    },
  });
  return { user, update };
}
