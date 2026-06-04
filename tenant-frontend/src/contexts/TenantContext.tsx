import { createContext } from "react";

export type TenantFeatures = {
  show_demo_login: boolean;
  show_kitchen_board: boolean;
  show_reports: boolean;
  allow_member_booking: boolean;
  allow_preorders: boolean;
  show_dietary_flags: boolean;
};

export type TenantConfig = {
  id?: number;
  name: string;
  tagline?: string;
  primary_color: string;
  logo_url: string;
  font_display?: string;
  font_body?: string;
  font_url?: string;
  trial_expires_at?: string | null;
  features: TenantFeatures;
};

export const defaultTenantConfig: TenantConfig = {
  name: "My Club",
  tagline: "Member Portal",
  primary_color: "#a38a64",
  logo_url: "",
  font_display: "Cormorant Garamond",
  font_body: "Inter",
  font_url:
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap",
  trial_expires_at: null,
  features: {
    show_demo_login: true,
    show_kitchen_board: true,
    show_reports: true,
    allow_member_booking: true,
    allow_preorders: true,
    show_dietary_flags: true,
  },
};

export const TenantContext = createContext<TenantConfig>(defaultTenantConfig);
