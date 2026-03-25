"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mergeBookingDraft } from "@/lib/booking-flow";

interface Service {
  id: string | number;
  name: string;
  description: string;
  icon?: string;
  category?: string;
  tags?: string[];
  keywords?: string[];
  sub_services?: unknown;
}

interface ServiceCardProps {
  service: Service | null;
  image: string;
  label: string;
  terms: string[];
  onServiceSelect?: (service: Service) => void;
}

export default function ServiceCard({
  service,
  image,
  label,
  terms,
  onServiceSelect,
}: ServiceCardProps) {
  const router = useRouter();

  const getServiceIcon = (service: Service) => {
    const source = `${service.name || ""} ${service.category || ""} ${(service.tags || []).join(" ")}`.toLowerCase();

    if (source.includes("plumb")) return "🚰";
    if (source.includes("elect")) return "💡";
    if (source.includes("clean")) return "🧼";
    if (source.includes("ac") || source.includes("air")) return "❄️";
    if (source.includes("paint")) return "🎨";
    if (source.includes("carp")) return "🪚";
    return service.icon || "🛠️";
  };

  const handleClick = () => {
    if (!service) {
      // Fallback to generic shops page
      router.push("/shops");
      return;
    }

    if (onServiceSelect) {
      onServiceSelect(service);
      return;
    }

    // Default behavior: navigate to booking flow
    const serviceName = service.name || label;
    const normalizedName = serviceName.trim().toLowerCase();

    const requiresSubservice = () => {
      if (normalizedName.includes("ac")) return true;
      if (normalizedName.includes("washing")) return true;
      if (normalizedName.includes("geyser")) return true;
      return false;
    };

    mergeBookingDraft({ serviceId: String(service.id), serviceName });

    if (requiresSubservice()) {
      router.push(`/subservices?service=${encodeURIComponent(serviceName)}`);
    } else {
      router.push(`/shops?service=${encodeURIComponent(serviceName)}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="service-card group animate-on-scroll"
      aria-label={`Book ${label} service`}
    >
      <div className="service-card-image-wrapper">
        <Image
          src={image}
          alt={label}
          width={160}
          height={120}
          className="service-card-image"
          loading="lazy"
        />
        {service && (
          <div className="service-card-icon" aria-hidden="true">
            {getServiceIcon(service)}
          </div>
        )}
      </div>
      <div className="service-card-content">
        <h3 className="service-card-title">{label}</h3>
        {service?.description && (
          <p className="service-card-description">{service.description}</p>
        )}
        <div className="service-card-tags">
          {terms.slice(0, 3).map((term, idx) => (
            <span key={idx} className="service-card-tag">
              {term}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}