import { supabase } from "@/lib/supabase";

type VendorIdentity = {
  id?: string | number;
};

export async function isVendorUser(authUserId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("vendors")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    console.error("Unable to verify vendor role", error);
    return false;
  }

  return Boolean((data as VendorIdentity | null)?.id);
}
