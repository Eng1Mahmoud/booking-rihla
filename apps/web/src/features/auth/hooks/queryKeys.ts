// Shared by hydration, hooks and auth cache updates.
export const authKeys = {
  all: ['auth'] as const,
  me: ['auth', 'me'] as const,
  mutation: (action: string) => ['auth', action] as const,
};
