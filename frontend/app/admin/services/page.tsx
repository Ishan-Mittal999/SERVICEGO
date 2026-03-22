"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/env";
import { useRouter } from "next/navigation";
import { requireAdminOrRedirect } from "@/lib/admin-access";

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

type ServiceTemplate = {
  name: string;
  tags: string[];
  keywords: string[];
  subServices: string[];
};

const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    name: "AC Repair",
    tags: ["ac", "cooling", "home-service"],
    keywords: ["air conditioner", "split ac", "window ac", "hvac"],
    subServices: ["Foam jet service", "AC checkup", "AC installation", "AC uninstallation"],
  },
  {
    name: "Washing Machine Repair",
    tags: ["washing-machine", "repair", "appliance"],
    keywords: ["front load", "top load", "semi automatic", "automatic"],
    subServices: ["Semi automatic machine repair", "Automatic top load repair", "Automatic front load repair"],
  },
  {
    name: "Geyser Service",
    tags: ["geyser", "water-heater", "bathroom"],
    keywords: ["geyser install", "geyser uninstall", "geyser repair"],
    subServices: ["Install", "Uninstall", "Repair"],
  },
  {
    name: "RO Service",
    tags: ["ro", "water-purifier", "filter"],
    keywords: ["aquaguard", "water filter", "ro repair"],
    subServices: ["Installation", "Maintenance", "Membrane change", "Leakage fix"],
  },
  {
    name: "Refrigerator Repair",
    tags: ["fridge", "refrigerator", "cooling"],
    keywords: ["cooling issue", "gas refill", "compressor"],
    subServices: ["Cooling issue repair", "Compressor check", "Gas refill", "Door seal replacement"],
  },
  {
    name: "Microwave Repair",
    tags: ["microwave", "kitchen", "appliance"],
    keywords: ["heating issue", "plate issue", "button panel"],
    subServices: ["Heating issue fix", "Control panel repair", "Turntable fix"],
  },
];

const COMMON_TAG_OPTIONS = ["home-service", "repair", "installation", "maintenance", "verified", "doorstep"];
const COMMON_KEYWORD_OPTIONS = ["same day", "technician", "quick service", "trusted", "local expert"];

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

const normalizeToken = (value: string) => value.trim().toLowerCase();

const mergeCsvValues = (current: string, additions: string[]) => {
  const merged: string[] = [];
  const seen = new Set<string>();

  [...parseCsv(current), ...additions].forEach((entry) => {
    const normalized = normalizeToken(entry);
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    merged.push(entry.trim());
  });

  return merged.join(", ");
};

const removeCsvValue = (current: string, target: string) => {
  const normalizedTarget = normalizeToken(target);
  return parseCsv(current)
    .filter((entry) => normalizeToken(entry) !== normalizedTarget)
    .join(", ");
};

const readFileAsDataUrl = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
};

export default function AdminServicesPage() {
  const router = useRouter();
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
  const [newTag, setNewTag] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newSubService, setNewSubService] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rawJson, setRawJson] = useState("{}");

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === String(selectedServiceId)) || null,
    [services, selectedServiceId]
  );

  const activeTemplate = useMemo(() => {
    const normalizedName = normalizeToken(name);
    if (!normalizedName) {
      return null;
    }

    return (
      SERVICE_TEMPLATES.find((template) => normalizeToken(template.name) === normalizedName)
      || SERVICE_TEMPLATES.find((template) => normalizedName.includes(normalizeToken(template.name)))
      || null
    );
  }, [name]);

  const tagItems = useMemo(() => parseCsv(tags), [tags]);
  const keywordItems = useMemo(() => parseCsv(keywords), [keywords]);
  const subServiceItems = useMemo(() => parseCsv(subServices), [subServices]);

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
    const bootstrap = async () => {
      const isAdmin = await requireAdminOrRedirect(router, "/admin/services");
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      await loadServices();
    };

    bootstrap();
  }, [router]);

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

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Please upload image smaller than 2MB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) {
        throw new Error("Could not process image");
      }

      setImageUrl(dataUrl);
      setErrorMessage(null);
    } catch {
      setErrorMessage("Could not process image.");
    }
  };

  const removeImage = () => {
    setImageUrl("");
  };

  const applyTemplate = (template: ServiceTemplate) => {
    setName((current) => current.trim() || template.name);
    setTags((current) => mergeCsvValues(current, template.tags));
    setKeywords((current) => mergeCsvValues(current, template.keywords));
    setSubServices((current) => mergeCsvValues(current, template.subServices));
  };

  const addTokenValue = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    reset: () => void
  ) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    setter((current) => mergeCsvValues(current, [normalized]));
    reset();
  };

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
          <Link href="/admin/profile" className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50">
            Admin Profile
          </Link>
          <Link href="/admin/vendors" className="px-4 py-2 rounded-full border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-amber-50">
            Manage Vendor Profiles
          </Link>
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

                <div className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <span className="text-sm font-semibold text-amber-900">Predefined Service Templates</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {SERVICE_TEMPLATES.map((template) => (
                      <button
                        key={template.name}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-sm hover:bg-amber-100"
                      >
                        <p className="font-semibold text-gray-800">{template.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-2">{template.subServices.join(" • ")}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-gray-700">
                  <span className="font-semibold">Tags</span>
                  <div className="flex flex-wrap gap-2">
                    {tagItems.map((item) => (
                      <button
                        key={`tag-${item}`}
                        type="button"
                        onClick={() => setTags((current) => removeCsvValue(current, item))}
                        className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {item} x
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...(activeTemplate?.tags || []), ...COMMON_TAG_OPTIONS].map((option) => (
                      <button
                        key={`tag-option-${option}`}
                        type="button"
                        onClick={() => setTags((current) => mergeCsvValues(current, [option]))}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      >
                        + {option}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-[1fr,auto] gap-2">
                    <input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="Add tag" className="rounded-lg border border-gray-300 px-3 py-2" />
                    <button type="button" onClick={() => addTokenValue(newTag, setTags, () => setNewTag(""))} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Add</button>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-gray-700">
                  <span className="font-semibold">Keywords</span>
                  <div className="flex flex-wrap gap-2">
                    {keywordItems.map((item) => (
                      <button
                        key={`keyword-${item}`}
                        type="button"
                        onClick={() => setKeywords((current) => removeCsvValue(current, item))}
                        className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {item} x
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...(activeTemplate?.keywords || []), ...COMMON_KEYWORD_OPTIONS].map((option) => (
                      <button
                        key={`keyword-option-${option}`}
                        type="button"
                        onClick={() => setKeywords((current) => mergeCsvValues(current, [option]))}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                      >
                        + {option}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-[1fr,auto] gap-2">
                    <input value={newKeyword} onChange={(event) => setNewKeyword(event.target.value)} placeholder="Add keyword" className="rounded-lg border border-gray-300 px-3 py-2" />
                    <button type="button" onClick={() => addTokenValue(newKeyword, setKeywords, () => setNewKeyword(""))} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Add</button>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-gray-700">
                  <span className="font-semibold">Sub-services</span>
                  <div className="flex flex-wrap gap-2">
                    {subServiceItems.map((item) => (
                      <button
                        key={`sub-${item}`}
                        type="button"
                        onClick={() => setSubServices((current) => removeCsvValue(current, item))}
                        className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {item} x
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(activeTemplate?.subServices || []).map((option) => (
                      <button
                        key={`sub-option-${option}`}
                        type="button"
                        onClick={() => setSubServices((current) => mergeCsvValues(current, [option]))}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                      >
                        + {option}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-[1fr,auto] gap-2">
                    <input value={newSubService} onChange={(event) => setNewSubService(event.target.value)} placeholder="Add sub-service" className="rounded-lg border border-gray-300 px-3 py-2" />
                    <button type="button" onClick={() => addTokenValue(newSubService, setSubServices, () => setNewSubService(""))} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Add</button>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-gray-700">
                  <span className="font-semibold">Service Image (upload from device)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  />
                  {imageUrl ? (
                    <div className="grid gap-2">
                      <img
                        src={imageUrl}
                        alt="Service preview"
                        className="h-28 w-44 rounded-lg border border-gray-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="w-fit rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                      >
                        Remove image
                      </button>
                    </div>
                  ) : null}
                </div>

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
