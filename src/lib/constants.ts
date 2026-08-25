export const APP_CONFIG = {
  name: "Faco Vehicle Mgt App",
  shortName: "Faco Vehicle",
  tagline: "Fleet Management System",
  companyName: "Faco Transport",
  supportEmail: "fleet-support@facotransport.com",
};

export const BRAND_COLORS = {
  primary: "#0F6B4B",
  secondary: "#1E8E5A",
  accent: "#F4B400",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#1F2937",
};

export const USER_ROLES = {
  CEO: "CEO",
  MANAGER: "MANAGER",
  SECRETARY: "SECRETARY",
} as const;

export const VEHICLE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MAINTENANCE: "MAINTENANCE",
  ARCHIVED: "ARCHIVED",
} as const;

export const FUEL_TYPES = [
  "PETROL",
  "DIESEL",
  "HYBRID",
  "ELECTRIC",
  "CNG",
];

export const EXPENSE_CATEGORIES = [
  "REPAIRS",
  "PARTS",
  "INSURANCE",
  "REGISTRATION",
  "LICENSING",
  "MISCELLANEOUS",
];

export const DOCUMENT_TYPES = [
  "INSURANCE",
  "REGISTRATION",
  "ROADWORTHINESS",
  "RECEIPT",
  "OTHER",
];
