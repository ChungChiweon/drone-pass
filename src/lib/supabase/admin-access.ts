import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminAccess =
  | { status: "authenticated"; userId: string; email: string | null }
  | { status: "unauthenticated" }
  | { status: "forbidden"; userId: string }
  | { status: "error"; message: string };

export async function checkAdminAccess(supabase: SupabaseClient): Promise<AdminAccess> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { status: "error", message: userError.message };
  if (!userData.user) return { status: "unauthenticated" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (profileError) return { status: "error", message: profileError.message };
  if (profile?.role !== "admin") return { status: "forbidden", userId: userData.user.id };
  return {
    status: "authenticated",
    userId: userData.user.id,
    email: userData.user.email ?? null
  };
}
