import { useEffect, useState, type ReactNode } from "react";
import {
  TenantContext,
  defaultTenantConfig,
  type TenantConfig,
} from "../contexts/TenantContext";
import { usersApi } from "../api/client";

type TenantProviderProps = {
  children: ReactNode;
};

function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace("#", "");
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;

  const bigint = parseInt(normalized, 16);

  if (Number.isNaN(bigint)) {
    return `rgba(163, 138, 100, ${alpha})`;
  }

  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isTrialExpired(trialExpiresAt: string | null | undefined): boolean {
  if (!trialExpiresAt) return false;
  return new Date(trialExpiresAt) < new Date();
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenantConfig, setTenantConfig] =
    useState<TenantConfig>(defaultTenantConfig);
  const [ready, setReady] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);

  useEffect(() => {
    async function loadTenantConfig() {
      try {
        const res = await usersApi.get("/config/public");
        const config: TenantConfig = { ...defaultTenantConfig, ...res.data };
        setTenantConfig(config);
        setTrialExpired(isTrialExpired(config.trial_expires_at));
      } catch (err) {
        console.error("Failed to load tenant config:", err);
      } finally {
        setReady(true);
      }
    }

    loadTenantConfig();
  }, []);

  useEffect(() => {
    if (!ready) return;

    const root = document.documentElement;

    root.style.setProperty("--accent", tenantConfig.primary_color);
    root.style.setProperty(
      "--accent-light",
      hexToRgba(tenantConfig.primary_color, 0.1),
    );
    root.style.setProperty(
      "--accent-hover",
      hexToRgba(tenantConfig.primary_color, 0.18),
    );

    if (tenantConfig.font_display) {
      root.style.setProperty(
        "--font-display",
        `"${tenantConfig.font_display}", Georgia, serif`,
      );
    }

    if (tenantConfig.font_body) {
      root.style.setProperty(
        "--font-body",
        `"${tenantConfig.font_body}", system-ui, sans-serif`,
      );
    }

    if (tenantConfig.font_url) {
      let link = document.getElementById(
        "tenant-fonts",
      ) as HTMLLinkElement | null;

      if (!link) {
        link = document.createElement("link");
        link.id = "tenant-fonts";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }

      link.href = tenantConfig.font_url;
    }

    document.title = tenantConfig.name;
  }, [tenantConfig, ready]);

  if (!ready) return null;

  if (trialExpired) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
          fontFamily: "system-ui, sans-serif",
          background: "#fafaf9",
          color: "#1a1a1a",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ fontSize: "32px", fontWeight: 600 }}>
          {tenantConfig.name}
        </div>
        <div style={{ fontSize: "18px", color: "#666", maxWidth: "420px" }}>
          Your 30-day trial has ended.
        </div>
        <div style={{ fontSize: "15px", color: "#888", maxWidth: "420px" }}>
          To continue using the platform, please contact Plain Talk Tech to
          activate your account.
        </div>
        <a
          href="mailto:josh@plaintalktech.com"
          style={{
            marginTop: "8px",
            padding: "10px 24px",
            background: tenantConfig.primary_color,
            color: "#fff",
            borderRadius: "6px",
            textDecoration: "none",
            fontSize: "15px",
            fontWeight: 500,
          }}
        >
          Get in touch
        </a>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={tenantConfig}>
      {children}
    </TenantContext.Provider>
  );
}
