"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { apiUrl } from "@/lib/env";
import { useRouter } from "next/navigation";
import { requireAdminOrRedirect } from "@/lib/admin-access";

type AdminVendor = {
  id: string;
  name?: string;
  phone?: string;
  owner_name?: string;
  business_address?: string;
  city?: string;
  pincode?: string;
  area?: string;
  service_id?: string | number | null;
  service_ids?: Array<string | number>;
  selected_service_names?: string[];
  sub_services?: string[];
  shop_image_urls?: string[];
  servicemen_count?: number;
  servicemen_details?: unknown;
  gst_number?: string;
  about_shop?: string;
  open_time?: string;
  close_time?: string;
  service_radius_km?: number;
  minimum_order_value?: number;
  experience?: number;
  is_active?: boolean;
  approval_status?: "pending" | "approved" | "declined" | string;
  [key: string]: unknown;
};

type Service = {
  id: string | number;
  name: string;
};

const toCsv = (values: unknown) => {
  if (!Array.isArray(values)) {
    return "";
  }

  return values.map((value) => String(value || "").trim()).filter(Boolean).join(", ");
};

const parseCsv = (text: string) => {
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const readFilesAsDataUrl = async (files: File[]) => {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Could not read image"));
          reader.readAsDataURL(file);
        })
    )
  );
};

export default function AdminVendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [rawJson, setRawJson] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formOwnerName, setFormOwnerName] = useState("");
  const [formBusinessAddress, setFormBusinessAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formPincode, setFormPincode] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formServiceId, setFormServiceId] = useState("");
  const [formServiceIds, setFormServiceIds] = useState("");
  const [formSelectedServiceNames, setFormSelectedServiceNames] = useState("");
  const [formSubServices, setFormSubServices] = useState("");
  const [formShopImageUrls, setFormShopImageUrls] = useState<string[]>([]);
  const [formServicemenCount, setFormServicemenCount] = useState("");
  const [formServicemenDetails, setFormServicemenDetails] = useState("[]");
  const [formGstNumber, setFormGstNumber] = useState("");
  const [formAboutShop, setFormAboutShop] = useState("");
  const [formOpenTime, setFormOpenTime] = useState("");
  const [formCloseTime, setFormCloseTime] = useState("");
  const [formServiceRadiusKm, setFormServiceRadiusKm] = useState("");
  const [formMinimumOrderValue, setFormMinimumOrderValue] = useState("");
  const [formExperience, setFormExperience] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formApprovalStatus, setFormApprovalStatus] = useState("approved");

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => String(vendor.id) === String(selectedVendorId)) || null,
    [vendors, selectedVendorId]
  );

  const pendingCount = useMemo(
    () => vendors.filter((vendor) => String(vendor.approval_status || "pending").toLowerCase() === "pending").length,
    [vendors]
  );

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [vendorsResponse, servicesResponse] = await Promise.all([
        fetch(apiUrl("/vendors?includeAll=true&limit=100&offset=0"), { cache: "no-store" }),
        fetch(apiUrl("/services?limit=100&offset=0"), { cache: "no-store" }),
      ]);

      if (!vendorsResponse.ok) {
        throw new Error(`Vendors API failed with ${vendorsResponse.status}`);
      }

      if (!servicesResponse.ok) {
        throw new Error(`Services API failed with ${servicesResponse.status}`);
      }

      const [vendorsData, servicesData] = await Promise.all([
        vendorsResponse.json(),
        servicesResponse.json(),
      ]);

      // Handle both old format (array) and new format (object with data/pagination)
      const nextVendors = vendorsData.data || (Array.isArray(vendorsData) ? vendorsData : []);
      const nextServices = servicesData.data || (Array.isArray(servicesData) ? servicesData : []);

      setVendors(nextVendors);
      setServices(nextServices);

      if (nextVendors.length > 0) {
        setSelectedVendorId((current) => current || String(nextVendors[0].id));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      const isAdmin = await requireAdminOrRedirect(router, "/admin/vendors");
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      await loadData();
    };

    bootstrap();
  }, [router]);

  useEffect(() => {
    if (!selectedVendor) {
      return;
    }

    setRawJson(JSON.stringify(selectedVendor, null, 2));
    setFormName(String(selectedVendor.name || ""));
    setFormPhone(String(selectedVendor.phone || ""));
    setFormOwnerName(String(selectedVendor.owner_name || ""));
    setFormBusinessAddress(String(selectedVendor.business_address || ""));
    setFormCity(String(selectedVendor.city || ""));
    setFormPincode(String(selectedVendor.pincode || ""));
    setFormArea(String(selectedVendor.area || ""));
    setFormServiceId(String(selectedVendor.service_id || ""));
    setFormServiceIds(toCsv(selectedVendor.service_ids));
    setFormSelectedServiceNames(toCsv(selectedVendor.selected_service_names));
    setFormSubServices(toCsv(selectedVendor.sub_services));
    setFormShopImageUrls(Array.isArray(selectedVendor.shop_image_urls) ? selectedVendor.shop_image_urls.map((item) => String(item || "").trim()).filter(Boolean) : []);
    setFormServicemenCount(String(selectedVendor.servicemen_count || 0));
    setFormServicemenDetails(JSON.stringify(selectedVendor.servicemen_details || [], null, 2));
    setFormGstNumber(String(selectedVendor.gst_number || ""));
    setFormAboutShop(String(selectedVendor.about_shop || ""));
    setFormOpenTime(String(selectedVendor.open_time || ""));
    setFormCloseTime(String(selectedVendor.close_time || ""));
    setFormServiceRadiusKm(String(selectedVendor.service_radius_km || ""));
    setFormMinimumOrderValue(String(selectedVendor.minimum_order_value || ""));
    setFormExperience(String(selectedVendor.experience || ""));
    setFormIsActive(Boolean(selectedVendor.is_active));
    setFormApprovalStatus(String(selectedVendor.approval_status || "approved").toLowerCase());
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [selectedVendor]);

  const saveStructured = async () => {
    if (!selectedVendor) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let servicemenDetails: unknown = [];
    try {
      servicemenDetails = JSON.parse(formServicemenDetails || "[]");
    } catch {
      setSaving(false);
      setErrorMessage("Servicemen details must be valid JSON.");
      return;
    }

    const payload = {
      name: formName,
      phone: formPhone,
      owner_name: formOwnerName || null,
      business_address: formBusinessAddress || null,
      city: formCity || null,
      pincode: formPincode || null,
      area: formArea || null,
      service_id: formServiceId || null,
      service_ids: parseCsv(formServiceIds),
      selected_service_names: parseCsv(formSelectedServiceNames),
      sub_services: parseCsv(formSubServices),
      shop_image_urls: formShopImageUrls,
      servicemen_count: Number(formServicemenCount) || 0,
      servicemen_details: servicemenDetails,
      gst_number: formGstNumber || null,
      about_shop: formAboutShop || null,
      open_time: formOpenTime || null,
      close_time: formCloseTime || null,
      service_radius_km: Number(formServiceRadiusKm) || null,
      minimum_order_value: Number(formMinimumOrderValue) || 0,
      experience: Number(formExperience) || 0,
      is_active: formIsActive,
      approval_status: formApprovalStatus,
    };

    try {
      const response = await fetch(apiUrl(`/vendors/${encodeURIComponent(String(selectedVendor.id))}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not save vendor profile");
      }

      setSuccessMessage("Vendor profile updated.");
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update vendor");
    } finally {
      setSaving(false);
    }
  };

  const saveRawJson = async () => {
    if (!selectedVendor) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawJson);
    } catch {
      setSaving(false);
      setErrorMessage("Raw JSON is not valid.");
      return;
    }

    try {
      const response = await fetch(apiUrl(`/vendors/${encodeURIComponent(String(selectedVendor.id))}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not save raw vendor JSON");
      }

      setSuccessMessage("Vendor profile updated from raw JSON.");
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update vendor");
    } finally {
      setSaving(false);
    }
  };

  const handleShopImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const oversized = files.find((file) => file.size > 2 * 1024 * 1024);
    if (oversized) {
      setErrorMessage("Please upload images smaller than 2MB each.");
      return;
    }

    const imageData = await readFilesAsDataUrl(files).catch(() => {
      setErrorMessage("Could not process uploaded images.");
      return [] as string[];
    });

    if (imageData.length === 0) {
      return;
    }

    setFormShopImageUrls((current) => Array.from(new Set([...current, ...imageData.filter(Boolean)])));
    setErrorMessage(null);
  };

  const removeShopImage = (index: number) => {
    setFormShopImageUrls((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const deleteVendor = async () => {
    if (!selectedVendor) {
      return;
    }

    const vendorName = selectedVendor.name || "this vendor";
    const shouldDelete = window.confirm(`Delete ${vendorName}? This action cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(apiUrl(`/vendors/${encodeURIComponent(String(selectedVendor.id))}`), {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not delete vendor");
      }

      setSuccessMessage("Vendor deleted.");
      setSelectedVendorId("");
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not delete vendor");
    } finally {
      setSaving(false);
    }
  };

  const updateApprovalStatus = async (status: "approved" | "declined") => {
    if (!selectedVendor) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      approval_status: status,
      is_active: status === "approved",
    };

    try {
      const response = await fetch(apiUrl(`/vendors/${encodeURIComponent(String(selectedVendor.id))}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not update approval status");
      }

      setSuccessMessage(status === "approved" ? "Vendor approved and listed." : "Vendor request declined.");
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update approval status");
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "var(--gray-900)", fontFamily: "var(--font-display)" }}>
          Admin Vendor Profile Manager
        </h1>
        <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          Pending approvals: {pendingCount}
        </div>
        <div className="flex gap-2">
          <Link href="/admin/profile" className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50">
            Admin Profile
          </Link>
          <Link href="/admin/services" className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50">
            Manage Services
          </Link>
          <Link href="/admin" className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {errorMessage ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}
      {successMessage ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

      {loading ? (
        <p className="text-gray-600 font-medium">Loading vendor profiles...</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[280px,1fr] gap-4">
          <aside className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm max-h-[70vh] overflow-y-auto">
            <h2 className="text-sm font-bold text-gray-700 mb-2">Vendors</h2>
            <div className="grid gap-2">
              {vendors.map((vendor) => {
                const selected = String(vendor.id) === String(selectedVendorId);
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => setSelectedVendorId(String(vendor.id))}
                    className="text-left rounded-xl border px-3 py-2 text-sm"
                    style={{
                      borderColor: selected ? "#7a6a00" : "#e5e7eb",
                      background: selected ? "rgba(122,106,0,0.08)" : "#fff",
                    }}
                  >
                    <p className="font-semibold text-gray-800">{vendor.name || "Unnamed vendor"}</p>
                    <p className="text-xs text-gray-500">{vendor.phone || "No phone"}</p>
                    <p className="text-xs font-semibold" style={{ color: String(vendor.approval_status || "approved").toLowerCase() === "approved" ? "#166534" : String(vendor.approval_status || "pending").toLowerCase() === "declined" ? "#b91c1c" : "#92400e" }}>
                      {String(vendor.approval_status || "approved").toLowerCase() === "approved"
                        ? "Approved"
                        : String(vendor.approval_status || "pending").toLowerCase() === "declined"
                          ? "Declined"
                          : "Pending approval"}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            {!selectedVendor ? (
              <p className="text-gray-600">Select a vendor to edit profile.</p>
            ) : (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="grid gap-1 text-sm text-gray-700">
                    <span className="font-semibold">Approval status</span>
                    <select
                      value={formApprovalStatus}
                      onChange={(event) => setFormApprovalStatus(event.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="declined">Declined</option>
                    </select>
                  </label>

                  <Field label="Shop name" value={formName} onChange={setFormName} />
                  <Field label="Phone" value={formPhone} onChange={setFormPhone} />
                  <Field label="Owner name" value={formOwnerName} onChange={setFormOwnerName} />
                  <Field label="Business address" value={formBusinessAddress} onChange={setFormBusinessAddress} />
                  <Field label="City" value={formCity} onChange={setFormCity} />
                  <Field label="Pincode" value={formPincode} onChange={setFormPincode} />
                  <Field label="Area/location" value={formArea} onChange={setFormArea} />

                  <label className="grid gap-1 text-sm text-gray-700">
                    <span className="font-semibold">Primary service</span>
                    <select
                      value={formServiceId}
                      onChange={(event) => setFormServiceId(event.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option value="">None</option>
                      {services.map((service) => (
                        <option key={service.id} value={String(service.id)}>{service.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm text-gray-700">
                    <span className="font-semibold">Active</span>
                    <select
                      value={formIsActive ? "true" : "false"}
                      onChange={(event) => setFormIsActive(event.target.value === "true")}
                      className="rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </label>

                  <Field label="Experience (years)" value={formExperience} onChange={setFormExperience} />
                  <Field label="GST number" value={formGstNumber} onChange={setFormGstNumber} />
                  <Field label="Open time" value={formOpenTime} onChange={setFormOpenTime} />
                  <Field label="Close time" value={formCloseTime} onChange={setFormCloseTime} />
                  <Field label="Service radius (km)" value={formServiceRadiusKm} onChange={setFormServiceRadiusKm} />
                  <Field label="Minimum order value" value={formMinimumOrderValue} onChange={setFormMinimumOrderValue} />
                  <Field label="Servicemen count" value={formServicemenCount} onChange={setFormServicemenCount} />
                </div>

                <TextAreaField label="About shop" value={formAboutShop} onChange={setFormAboutShop} rows={3} />
                <TextAreaField label="Service IDs (comma separated)" value={formServiceIds} onChange={setFormServiceIds} rows={2} />
                <TextAreaField label="Selected service names (comma separated)" value={formSelectedServiceNames} onChange={setFormSelectedServiceNames} rows={2} />
                <TextAreaField label="Sub-services (comma separated)" value={formSubServices} onChange={setFormSubServices} rows={2} />
                <div className="grid gap-2 text-sm text-gray-700">
                  <span className="font-semibold">Shop images (upload from device)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleShopImageUpload}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  />
                  {formShopImageUrls.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {formShopImageUrls.map((image, index) => (
                        <div key={`${index}-${image.slice(0, 24)}`} className="grid gap-1">
                          <Image unoptimized src={image} alt={`Shop ${index + 1}`} width={200} height={80} className="h-20 w-full rounded-lg border border-gray-200 object-cover" />
                          <button
                            type="button"
                            onClick={() => removeShopImage(index)}
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No image uploaded yet.</p>
                  )}
                </div>
                <TextAreaField label="Servicemen details JSON" value={formServicemenDetails} onChange={setFormServicemenDetails} rows={6} />

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => void updateApprovalStatus("approved")}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0", opacity: saving ? 0.8 : 1 }}
                  >
                    {saving ? "Working..." : "Approve Vendor"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateApprovalStatus("declined")}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fecaca", opacity: saving ? 0.8 : 1 }}
                  >
                    {saving ? "Working..." : "Decline Vendor"}
                  </button>
                  <button
                    type="button"
                    onClick={saveStructured}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, #7A6A00, #8B7500)", opacity: saving ? 0.8 : 1 }}
                  >
                    {saving ? "Saving..." : "Save Profile Fields"}
                  </button>
                  <button
                    type="button"
                    onClick={deleteVendor}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{
                      background: saving ? "#fecaca" : "#ef4444",
                      color: "#ffffff",
                      opacity: saving ? 0.8 : 1,
                    }}
                  >
                    {saving ? "Working..." : "Delete Vendor"}
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Raw JSON editor (manual full control)</p>
                  <textarea
                    value={rawJson}
                    onChange={(event) => setRawJson(event.target.value)}
                    rows={16}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={saveRawJson}
                    disabled={saving}
                    className="mt-3 px-4 py-2 rounded-lg text-white text-sm font-semibold bg-sky-700 hover:bg-sky-800"
                  >
                    Save Raw JSON
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm text-gray-700">
      <span className="font-semibold">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label className="grid gap-1 text-sm text-gray-700">
      <span className="font-semibold">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-gray-300 px-3 py-2"
      />
    </label>
  );
}
