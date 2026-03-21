"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/env";

type Service = {
  id: string | number;
  name?: string;
  description?: string;
  icon?: string;
  category?: string;
  tags?: unknown;
  keywords?: unknown;
  sub_services?: unknown;
  image_url?: string;
  is_active?: boolean;
  [key: string]: unknown;
};

const toCsv = (value: unknown) => {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");
};

const parseCsv = (value: string) => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [keywords, setKeywords] = useState("");
  const [subServices, setSubServices] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rawJson, setRawJson] = useState("{}");

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === String(selectedServiceId)) || null,
    [services, selectedServiceId]
  );

  const loadServices = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(apiUrl("/services"), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Services API failed with ${response.status}`);
      }

      const data = await response.json();
      const nextServices = Array.isArray(data) ? data : [];
      setServices(nextServices);

      if (nextServices.length > 0) {
        setSelectedServiceId((current) => current || String(nextServices[0].id));
      } else {
        setSelectedServiceId("");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (!selectedService) {
      return;
    }

    setName(String(selectedService.name || ""));
    setDescription(String(selectedService.description || ""));
    setIcon(String(selectedService.icon || ""));
    setCategory(String(selectedService.category || ""));
    setTags(toCsv(selectedService.tags));
    setKeywords(toCsv(selectedService.keywords));
    setSubServices(toCsv(selectedService.sub_services));
    setImageUrl(String(selectedService.image_url || ""));
    setIsActive(selectedService.is_active !== false);
    setRawJson(JSON.stringify(selectedService, null, 2));
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [selectedService]);

  const saveStructured = async () => {
    if (!selectedService) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      icon: icon.trim() || null,
      category: category.trim() || null,
      tags: parseCsv(tags),
      keywords: parseCsv(keywords),
      sub_services: parseCsv(subServices),
      image_url: imageUrl.trim() || null,
      is_active: isActive,
    };

    try {
      const response = await fetch(apiUrl(`/services/${encodeURIComponent(String(selectedService.id))}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not save service");
      }

      setSuccessMessage("Service updated.");
      await loadServices();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update service");
    } finally {
      setSaving(false);
    }
  };

  const saveRawJson = async () => {
    if (!selectedService) {
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
      const response = await fetch(apiUrl(`/services/${encodeURIComponent(String(selectedService.id))}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not save raw JSON");
      }

      setSuccessMessage("Service updated from raw JSON.");
      await loadServices();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update service");
    } finally {
      setSaving(false);
    }
  };

  const createService = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(apiUrl("/services"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Service",
          description: "",
          tags: [],
          keywords: [],
          sub_services: [],
          is_active: true,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not create service");
      }

      await loadServices();
      if (data?.service?.id) {
        setSelectedServiceId(String(data.service.id));
      }
      setSuccessMessage("Service created.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not create service");
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async () => {
    if (!selectedService) {
      return;
    }

    const shouldDelete = window.confirm(`Delete service "${selectedService.name || "this service"}"?`);
    if (!shouldDelete) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(apiUrl(`/services/${encodeURIComponent(String(selectedService.id))}`), {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Could not delete service");
      }

      setSuccessMessage("Service deleted.");
      await loadServices();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not delete service");
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
          Admin Service & Subservice Manager
        </h1>
        <div className="flex gap-2">
          <Link href="/admin" className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50">
            Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={createService}
            disabled={saving}
            className="px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #7A6A00, #8B7500)", opacity: saving ? 0.8 : 1 }}
          >
            Add Service
          </button>
        </div>
      </div>

      {errorMessage ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}
      {successMessage ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}

      {loading ? (
        <p className="text-gray-600 font-medium">Loading services...</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[280px,1fr] gap-4">
          <aside className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm max-h-[70vh] overflow-y-auto">
            <h2 className="text-sm font-bold text-gray-700 mb-2">Services</h2>
            <div className="grid gap-2">
              {services.map((service) => {
                const selected = String(service.id) === String(selectedServiceId);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedServiceId(String(service.id))}
                    className="text-left rounded-xl border px-3 py-2 text-sm"
                    style={{
                      borderColor: selected ? "#7a6a00" : "#e5e7eb",
                      background: selected ? "rgba(122,106,0,0.08)" : "#fff",
                    }}
                  >
                    <p className="font-semibold text-gray-800">{service.name || "Unnamed service"}</p>
                    <p className="text-xs text-gray-500">ID: {service.id}</p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            {!selectedService ? (
              <p className="text-gray-600">Select a service to edit.</p>
            ) : (
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Service name" value={name} onChange={setName} />
                  <Field label="Category" value={category} onChange={setCategory} />
                  <Field label="Icon (emoji/text)" value={icon} onChange={setIcon} />
                  <Field label="Image URL (optional)" value={imageUrl} onChange={setImageUrl} />

                  <label className="grid gap-1 text-sm text-gray-700">
                    <span className="font-semibold">Active</span>
                    <select
                      value={isActive ? "true" : "false"}
                      onChange={(event) => setIsActive(event.target.value === "true")}
                      className="rounded-lg border border-gray-300 px-3 py-2"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </label>
                </div>

                <TextAreaField label="Description" value={description} onChange={setDescription} rows={3} />
                <TextAreaField label="Tags (comma separated)" value={tags} onChange={setTags} rows={2} />
                <TextAreaField label="Keywords (comma separated)" value={keywords} onChange={setKeywords} rows={2} />
                <TextAreaField label="Sub-services (comma separated)" value={subServices} onChange={setSubServices} rows={3} />

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={saveStructured}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                    style={{ background: "linear-gradient(135deg, #7A6A00, #8B7500)", opacity: saving ? 0.8 : 1 }}
                  >
                    {saving ? "Saving..." : "Save Service"}
                  </button>
                  <button
                    type="button"
                    onClick={deleteService}
                    disabled={saving}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-red-600 hover:bg-red-700"
                  >
                    Delete Service
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Raw JSON editor (manual full control)</p>
                  <textarea
                    value={rawJson}
                    onChange={(event) => setRawJson(event.target.value)}
                    rows={14}
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
