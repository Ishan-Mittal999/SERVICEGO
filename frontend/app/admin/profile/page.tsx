"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAllowedAdminEmail } from "@/lib/admin-access";
import { isValidIndianMobile, sanitizeIndianPhoneInput } from "@/lib/phone";

export default function AdminProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const redirectToLogin = () => {
    router.replace("/auth/login?next=/admin/profile");
  };

  const ensureActiveSession = async () => {
    let {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session) {
      const refreshed = await supabase.auth.refreshSession();
      session = refreshed.data.session;
      error = refreshed.error;

      if (error) {
        throw error;
      }
    }

    return session;
  };

  useEffect(() => {
    let isActive = true;

    const loadAdminProfile = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const session = await ensureActiveSession();
        const user = session?.user || null;

        if (!user) {
          redirectToLogin();
          return;
        }

        if (!isAllowedAdminEmail(user.email)) {
          await supabase.auth.signOut();
          redirectToLogin();
          return;
        }

        if (!isActive) {
          return;
        }

        setAdminId(String(user.id || ""));
        setEmail(String(user.email || ""));
        setFullName(String(user.user_metadata?.full_name || user.user_metadata?.name || ""));
        setPhone(sanitizeIndianPhoneInput(String(user.user_metadata?.phone || "")));
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : "Could not load admin profile.";
        if (message.toLowerCase().includes("auth session missing")) {
          redirectToLogin();
          return;
        }

        setErrorMessage(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadAdminProfile();

    return () => {
      isActive = false;
    };
  }, [router]);

  const saveProfile = async () => {
    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const session = await ensureActiveSession();
      if (!session?.user) {
        redirectToLogin();
        return;
      }

      if (!isAllowedAdminEmail(session.user.email)) {
        await supabase.auth.signOut();
        redirectToLogin();
        return;
      }

      if (phone.trim() && !isValidIndianMobile(phone)) {
        setErrorMessage("Enter a valid 10-digit mobile number.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          name: fullName.trim(),
          phone: sanitizeIndianPhoneInput(phone),
        },
      });

      if (error) {
        throw error;
      }

      setSuccessMessage("Admin profile updated successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save profile.";
      if (message.toLowerCase().includes("auth session missing")) {
        redirectToLogin();
        return;
      }

      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      className="min-h-screen p-6 md:p-8"
      style={{
        background:
          "radial-gradient(circle at 12% 8%, rgba(122,106,0,0.14), transparent 34%), radial-gradient(circle at 88% 6%, rgba(30,144,255,0.12), transparent 30%), var(--off-white)",
      }}
    >
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-3xl font-bold" style={{ color: "var(--gray-900)", fontFamily: "var(--font-display)" }}>
          Admin Profile
        </h1>
        <div className="flex gap-2">
          <Link href="/admin/services" className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50">
            Manage Services
          </Link>
          <Link href="/admin/vendors" className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50">
            Manage Vendor Profiles
          </Link>
          <Link href="/admin" className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {loading ? (
        <p className="text-gray-600 font-medium">Loading admin profile...</p>
      ) : (
        <section className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Admin ID</label>
              <input
                value={adminId}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Email</label>
              <input
                value={email}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Full Name</label>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Admin name"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</label>
              <input
                value={phone}
                onChange={(event) => setPhone(sanitizeIndianPhoneInput(event.target.value))}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="Phone number"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
              />
              {phone && !isValidIndianMobile(phone) ? (
                <p className="mt-1 text-xs text-red-600">Enter a valid 10-digit mobile number.</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving || (Boolean(phone) && !isValidIndianMobile(phone))}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #7A6A00, #8B7500)", opacity: saving ? 0.8 : 1 }}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/auth/login");
              }}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
            >
              Logout
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
