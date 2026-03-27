"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function GlobalHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    };

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const openSection = (sectionId: string) => {
    if (pathname === "/") {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    router.push(`/#${sectionId}`);
  };

  const userInitial = (user?.email?.charAt(0) || "S").toUpperCase();

  return (
    <header className="global-app-header">
      <div className="global-app-header-inner">
        <Link href="/" className="global-brand" aria-label="ServiceGo home">
          <Image
            src="/icon.webp"
            alt="ServiceGo"
            className="global-brand-logo"
            width={40}
            height={40}
            priority
          />
          <strong>ServiceGo</strong>
        </Link>

        <nav className="global-nav" aria-label="Primary navigation">
          <button type="button" onClick={() => openSection("services")}>Services</button>
          <button type="button" onClick={() => openSection("how")}>How It Works</button>
          <button type="button" onClick={() => router.push("/bookings")}>My Bookings</button>
        </nav>

        <div className="global-user-actions">
          {user ? (
            <>
              <button
                type="button"
                className="global-profile-pill"
                onClick={() => router.push("/profile")}
                aria-label="Profile"
                title="Profile"
              >
                {userInitial}
              </button>

              <button
                type="button"
                className="global-auth-btn"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.refresh();
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <button
              type="button"
              className="global-auth-btn"
              onClick={() => router.push("/auth/login")}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
