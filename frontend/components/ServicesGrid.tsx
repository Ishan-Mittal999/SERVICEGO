"use client";

import { useMemo } from "react";
import ServiceCard from "./ServiceCard";

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

interface ServiceCardData {
  key: string;
  label: string;
  image: string;
  terms: string[];
  service: Service | null;
}

interface ServicesGridProps {
  services: Service[];
  searchTerm?: string;
  onServiceSelect?: (service: Service) => void;
}

const SERVICE_IMAGE_LIBRARY = [
  { image: "/service_ac.webp", label: "AC Service", terms: ["ac", "air conditioner", "air conditioning", "split ac", "window ac", "hvac"] },
  { image: "/service_electrical.webp", label: "Electrical", terms: ["electrical", "electrician", "wiring", "electric", "switch", "socket", "mcb", "fan"] },
  { image: "/service_carpenter.webp", label: "Carpenter", terms: ["carpenter", "carpentry", "wood", "furniture", "wardrobe", "door"] },
  { image: "/service_chimney.webp", label: "Chimney", terms: ["chimney", "kitchen chimney", "exhaust"] },
  { image: "/service_cooler.webp", label: "Cooler", terms: ["cooler", "air cooler", "desert cooler"] },
  { image: "/service_fridge.webp", label: "Fridge", terms: ["fridge", "refrigerator", "refrigeration"] },
  { image: "/service_geyser.webp", label: "Geyser", terms: ["geyser", "water heater", "heater"] },
  { image: "/service_microwave.webp", label: "Microwave", terms: ["microwave", "oven", "otg"] },
  { image: "/service_ro.webp", label: "RO Service", terms: ["ro", "water purifier", "purifier", "aquaguard", "water filter"] },
];

const normalizeText = (value: string) => value.trim().toLowerCase();

const getServiceImageConfig = (service: Service) => {
  const source = `${service.name || ""} ${service.description || ""} ${service.category || ""} ${(service.tags || []).join(" ")} ${(service.keywords || []).join(" ")}`.toLowerCase();
  const match = SERVICE_IMAGE_LIBRARY.find((entry) => entry.terms.some((term) => source.includes(term)));
  return match || null;
};

const getServiceSearchScore = (service: Service, query: string) => {
  if (!query) return 1;

  const normalizedName = normalizeText(service.name || "");
  const normalizedDescription = normalizeText(service.description || "");
  const normalizedCategory = normalizeText(service.category || "");
  const tagTokens = (service.tags ?? []).map((tag) => normalizeText(tag));
  const keywordTokens = (service.keywords ?? []).map((keyword) => normalizeText(keyword));
  const allTokens = [normalizedName, normalizedDescription, normalizedCategory, ...tagTokens, ...keywordTokens].join(" ");

  let score = 0;

  if (normalizedName === query) score += 120;
  if (normalizedName.startsWith(query)) score += 70;
  if (normalizedName.includes(query)) score += 55;
  if (normalizedCategory.includes(query)) score += 35;
  if (normalizedDescription.includes(query)) score += 25;
  if (tagTokens.some((tag) => tag.includes(query))) score += 20;
  if (keywordTokens.some((keyword) => keyword.includes(query))) score += 18;

  const queryWords = query.split(/\s+/).filter(Boolean);
  if (queryWords.length > 1 && queryWords.every((word) => allTokens.includes(word))) score += 20;

  return score;
};

export default function ServicesGrid({ services, searchTerm = "", onServiceSelect }: ServicesGridProps) {
  const serviceCards = useMemo<ServiceCardData[]>(() => {
    return SERVICE_IMAGE_LIBRARY.map((entry) => {
      const matchedService = services.find(
        (service) => getServiceImageConfig(service)?.image === entry.image
      ) ?? null;

      return {
        key: entry.image,
        label: entry.label,
        image: entry.image,
        terms: entry.terms,
        service: matchedService,
      };
    });
  }, [services]);

  const filteredCards = useMemo(() => {
    if (!searchTerm.trim()) return serviceCards;

    const normalizedSearch = normalizeText(searchTerm);
    return serviceCards.filter((card) => {
      if (card.service) {
        const score = getServiceSearchScore(card.service, normalizedSearch);
        return score > 0;
      }
      
      // If no service matched, check card label and terms
      const cardText = `${card.label} ${card.terms.join(" ")}`.toLowerCase();
      return cardText.includes(normalizedSearch);
    });
  }, [serviceCards, searchTerm]);

  if (filteredCards.length === 0) {
    return (
      <div className="services-grid-empty">
        <p>No services found matching "{searchTerm}"</p>
        <p className="text-sm text-gray-500">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="services-grid">
      {filteredCards.map((card) => (
        <ServiceCard
          key={card.key}
          service={card.service}
          image={card.image}
          label={card.label}
          terms={card.terms}
          onServiceSelect={onServiceSelect}
        />
      ))}
    </div>
  );
}