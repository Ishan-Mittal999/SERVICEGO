export type ServiceItem = {
  id: string | number;
  name: string;
  description?: string;
  icon?: string;
};

export type BookingAddon = {
  id: string;
  name: string;
  price: number;
  description: string;
};

export type BookingPackage = {
  id: string;
  name: string;
  price: number;
  eta: string;
  description: string;
  includes: string[];
  badge?: string;
};

export type BookingDraft = {
  serviceId?: string;
  serviceName?: string;
  serviceDescription?: string;
  locationLabel?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  packageId?: string;
  packageName?: string;
  packagePrice?: number;
  addonIds?: string[];
  addonNames?: string[];
  addonTotal?: number;
  customerName?: string;
  customerPhone?: string;
  preferredTime?: string;
  bookingId?: string;
};

type ServiceBlueprint = {
  headline: string;
  locationHint: string;
  responseTime: string;
  packages: BookingPackage[];
  addons: BookingAddon[];
};

const BOOKING_FLOW_STORAGE_KEY = "servicego-booking-draft";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readBookingDraft(): BookingDraft | null {
  if (!canUseStorage()) {
    return null;
  }

  const rawDraft = window.localStorage.getItem(BOOKING_FLOW_STORAGE_KEY);
  if (!rawDraft) {
    return null;
  }

  try {
    return JSON.parse(rawDraft) as BookingDraft;
  } catch {
    window.localStorage.removeItem(BOOKING_FLOW_STORAGE_KEY);
    return null;
  }
}

export function writeBookingDraft(draft: BookingDraft) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(BOOKING_FLOW_STORAGE_KEY, JSON.stringify(draft));
}

export function mergeBookingDraft(partialDraft: BookingDraft) {
  const currentDraft = readBookingDraft() ?? {};
  const nextDraft = {
    ...currentDraft,
    ...partialDraft,
  };

  writeBookingDraft(nextDraft);
  return nextDraft;
}

export function clearBookingDraft() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(BOOKING_FLOW_STORAGE_KEY);
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function detectServiceKind(serviceName: string) {
  const normalizedName = serviceName.toLowerCase();

  if (normalizedName.includes("plumb")) {
    return "plumbing";
  }

  if (normalizedName.includes("electric")) {
    return "electrical";
  }

  if (normalizedName.includes("clean")) {
    return "cleaning";
  }

  if (normalizedName.includes("ac") || normalizedName.includes("air")) {
    return "ac";
  }

  return "default";
}

export function getServiceBlueprint(serviceName: string): ServiceBlueprint {
  const serviceKind = detectServiceKind(serviceName);

  switch (serviceKind) {
    case "plumbing":
      return {
        headline: "Fast plumbing help with upfront packages",
        locationHint: "We use your area to match plumbing rates and nearby crews.",
        responseTime: "Vendor usually assigned in 4-8 mins",
        packages: [
          {
            id: "plumbing-visit",
            name: "Quick Fix Visit",
            price: 249,
            eta: "30-45 mins",
            description: "Best for tap leaks, small blockages, and inspection requests.",
            includes: ["Inspection", "Basic repair", "90-day revisit support"],
          },
          {
            id: "plumbing-plus",
            name: "Repair Plus",
            price: 499,
            eta: "45-60 mins",
            description: "For mixer, flush tank, wash basin, and pipe replacement jobs.",
            includes: ["Diagnosis", "Minor fitting work", "Priority vendor assignment"],
            badge: "Most booked",
          },
          {
            id: "plumbing-deep",
            name: "Deep Drain Rescue",
            price: 799,
            eta: "60-90 mins",
            description: "For kitchen sink choking, bathroom drain issues, and repeat clogging.",
            includes: ["Jet cleaning", "Tools included", "Post-service checklist"],
          },
        ],
        addons: [
          {
            id: "plumbing-emergency",
            name: "Emergency slot",
            price: 149,
            description: "Move your request to the top of the queue.",
          },
          {
            id: "plumbing-parts",
            name: "Parts pickup support",
            price: 99,
            description: "Vendor helps source standard replacement parts nearby.",
          },
          {
            id: "plumbing-sanitise",
            name: "Area sanitisation",
            price: 79,
            description: "Quick cleanup and disinfect after the repair.",
          },
        ],
      };
    case "electrical":
      return {
        headline: "Electrical packages priced for your locality",
        locationHint: "Your location helps us show nearby electrician availability and travel-adjusted rates.",
        responseTime: "Vendor usually assigned in 5-10 mins",
        packages: [
          {
            id: "electrical-visit",
            name: "Basic Electrical Visit",
            price: 299,
            eta: "30-45 mins",
            description: "Ideal for switchboard, fan, bulb holder, and basic fault checks.",
            includes: ["Inspection", "Single-point repair", "Service warranty"],
          },
          {
            id: "electrical-install",
            name: "Install & Repair",
            price: 549,
            eta: "45-60 mins",
            description: "Best for fan, light, exhaust, geyser, or switch replacement jobs.",
            includes: ["Installation support", "Minor rewiring", "Priority assignment"],
            badge: "Fastest arrival",
          },
          {
            id: "electrical-safety",
            name: "Home Safety Check",
            price: 899,
            eta: "60-90 mins",
            description: "A full circuit and load check for recurring tripping or sparking issues.",
            includes: ["Load review", "MCB check", "Safety report"],
          },
        ],
        addons: [
          {
            id: "electrical-night",
            name: "Late evening slot",
            price: 129,
            description: "Preferred slot after working hours.",
          },
          {
            id: "electrical-ladder",
            name: "Tall ladder support",
            price: 89,
            description: "For high ceiling lights and fittings.",
          },
          {
            id: "electrical-surge",
            name: "Surge check add-on",
            price: 119,
            description: "Extra device and outlet safety verification.",
          },
        ],
      };
    case "cleaning":
      return {
        headline: "Cleaning bundles tuned to home size and locality",
        locationHint: "We use your area to estimate staff arrival and cleaning supply coverage.",
        responseTime: "Vendor usually assigned in 8-12 mins",
        packages: [
          {
            id: "cleaning-express",
            name: "Express Refresh",
            price: 399,
            eta: "45 mins",
            description: "For a quick room or kitchen refresh before guests or after a busy week.",
            includes: ["Surface wipe-down", "Dusting", "Basic mop and cleanup"],
          },
          {
            id: "cleaning-deep",
            name: "Deep Home Clean",
            price: 999,
            eta: "2-3 hrs",
            description: "A more detailed clean for bathrooms, kitchen zones, and high-touch areas.",
            includes: ["Deep scrub", "Bathroom detailing", "Kitchen degreasing"],
            badge: "Most booked",
          },
          {
            id: "cleaning-move",
            name: "Move-in Reset",
            price: 1599,
            eta: "3-4 hrs",
            description: "For new homes, tenant turnover, or a complete reset cleaning session.",
            includes: ["Cabinet wipe-down", "Floor restore", "Team of two professionals"],
          },
        ],
        addons: [
          {
            id: "cleaning-sofa",
            name: "Sofa vacuum add-on",
            price: 199,
            description: "Quick dry vacuum for living room seating.",
          },
          {
            id: "cleaning-balcony",
            name: "Balcony wash",
            price: 149,
            description: "Pressure-assisted balcony cleanup.",
          },
          {
            id: "cleaning-fridge",
            name: "Fridge deep clean",
            price: 179,
            description: "Interior tray and shelf cleaning.",
          },
        ],
      };
    case "ac":
      return {
        headline: "AC service packages based on demand and distance",
        locationHint: "Your location helps us estimate technician travel and spare-part access.",
        responseTime: "Vendor usually assigned in 6-10 mins",
        packages: [
          {
            id: "ac-service",
            name: "AC Routine Service",
            price: 499,
            eta: "45-60 mins",
            description: "Good for cooling drop, bad odor, and seasonal servicing needs.",
            includes: ["Filter cleaning", "Coil wash", "Performance check"],
          },
          {
            id: "ac-repair",
            name: "AC Repair Visit",
            price: 749,
            eta: "60-90 mins",
            description: "For water leakage, noise, startup failures, and sensor-related issues.",
            includes: ["Diagnosis", "Minor repair", "Gas pressure check"],
            badge: "High demand",
          },
          {
            id: "ac-install",
            name: "Install or Shift",
            price: 1499,
            eta: "2-3 hrs",
            description: "For first-time installation or shifting your AC to another room or flat.",
            includes: ["Mounting support", "Connection check", "Post-install testing"],
          },
        ],
        addons: [
          {
            id: "ac-gas",
            name: "Gas top-up check",
            price: 249,
            description: "Inspection and recommendation for refrigerant refill.",
          },
          {
            id: "ac-jet",
            name: "Jet wash upgrade",
            price: 149,
            description: "Stronger indoor unit cleaning for heavy dust.",
          },
          {
            id: "ac-cover",
            name: "Outdoor unit cover install",
            price: 99,
            description: "Weather protection for the outdoor unit.",
          },
        ],
      };
    default:
      return {
        headline: "Choose a package, see extras, and book instantly",
        locationHint: "Your area helps us estimate arrival time and assign the right local vendor.",
        responseTime: "Vendor usually assigned in 5-12 mins",
        packages: [
          {
            id: "standard-visit",
            name: "Standard Visit",
            price: 299,
            eta: "30-45 mins",
            description: "Great for first inspections, small fixes, and quick service requests.",
            includes: ["Inspection", "Basic service work", "Support follow-up"],
          },
          {
            id: "priority-visit",
            name: "Priority Visit",
            price: 599,
            eta: "45-60 mins",
            description: "Faster assignment and extended on-site work for bigger jobs.",
            includes: ["Priority dispatch", "Extended work window", "Higher availability"],
            badge: "Recommended",
          },
          {
            id: "premium-support",
            name: "Premium Support",
            price: 999,
            eta: "60-90 mins",
            description: "For more involved jobs where you need deeper diagnosis and completion support.",
            includes: ["Advanced inspection", "Priority team", "Detailed completion summary"],
          },
        ],
        addons: [
          {
            id: "generic-priority",
            name: "Priority slot",
            price: 149,
            description: "Move your booking higher in the assignment queue.",
          },
          {
            id: "generic-tools",
            name: "Special tools support",
            price: 99,
            description: "Reserve additional tools if the job needs them.",
          },
          {
            id: "generic-followup",
            name: "48-hour follow-up",
            price: 79,
            description: "Extra post-service support after completion.",
          },
        ],
      };
  }
}