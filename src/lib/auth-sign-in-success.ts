/**
 * Better Auth after hooks expose the newly created session as `context.newSession`
 * (not `context.session`). See: https://www.better-auth.com/docs/concepts/hooks
 */
export type AuthAfterHookContext = {
  newSession?: {
    user?: {
      id?: string;
      email?: string;
    };
  } | null;
};

export function isSignInAfterHookSuccess(context: AuthAfterHookContext | undefined): boolean {
  return Boolean(context?.newSession);
}

export function getSignInAfterHookUser(context: AuthAfterHookContext | undefined) {
  return context?.newSession?.user;
}
