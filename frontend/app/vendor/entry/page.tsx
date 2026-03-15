"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

      if (!vendor || !vendor.service_id || !vendor.area) {
        router.replace("/vendor/onboarding");
        return;
      }

      router.replace("/vendor/dashboard");
    };

    checkVendorProfile();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--off-white)",
        color: "var(--gray-700)",
      }}
    >
      <p>Checking your vendor profile...</p>
    </div>
  );
}
