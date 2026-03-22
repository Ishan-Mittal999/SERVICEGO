import { supabase } from "@/lib/supabase";

export const ALLOWED_ADMIN_EMAIL = "singhalkrishna790@gmail.com";

export function isAllowedAdminEmail(email: string | null | undefined) {
  return String(email || "").trim().toLowerCase() === ALLOWED_ADMIN_EMAIL;
}

export async function requireAdminOrRedirect(
  router: { replace: (path: string) => void },
  nextPath: string
) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user) {
    router.replace(`/auth/login?next=${encodeURIComponent(nextPath)}`);
    return false;
  }

  if (!isAllowedAdminEmail(session.user.email)) {
    await supabase.auth.signOut();
    router.replace(`/auth/login?next=${encodeURIComponent(nextPath)}`);
    return false;
  }

  return true;
}
