"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type VendorProfile = {
  service_id?: string | number | null;
  area?: string | null;
};

export default function VendorEntryPage() {
  const router = useRouter();

  useEffect(() => {
    const checkVendorProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/vendor/login");
        return;
      }

      const { data: vendor } = await supabase
        .from("vendors")
        .select("id, service_id, area")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      const vendorProfile = vendor as VendorProfile | null;

      if (!vendorProfile || !vendorProfile.service_id || !vendorProfile.area) {
        router.replace("/vendor/onboarding");
        return;
      }

      router.replace("/vendor/dashboard");
    };

    checkVendorProfile();
  }, [router]);

  return (
    <div className="theme-centered-status">
      <p>Checking your vendor profile...</p>
    </div>
  );
}
