interface TenantLoaderProps {
  manualExit?: () => void;
  isManual?: boolean;
  message?: string;
}

export function TenantLoader({
  manualExit,
  isManual,
  message,
}: TenantLoaderProps) {
  return (
    <div
      className="abeyton-loader-overlay"
      onClick={isManual ? manualExit : undefined}
    >
      <div className="abeyton-loader-content">
        <img
          src="/anchorlake_logo.svg"
          alt="Anchor Lake"
          style={{
            width: "160px",
            height: "auto",
            opacity: 0,
            animation: "logoFadeIn 1.2s ease-out forwards",
          }}
        />
        <div className="loader-text">Anchor Lake</div>
        {message && (
          <div
            style={{
              fontSize: "13px",
              color: "var(--zinc-400)",
              fontFamily: "var(--font-body)",
              textAlign: "center",
              opacity: 0,
              animation: "logoFadeIn 1.2s ease-out 1s forwards",
              maxWidth: "260px",
              lineHeight: 1.6,
            }}
          >
            {message}
          </div>
        )}
        {isManual && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--zinc-500)",
              marginTop: "10px",
            }}
          >
            Click anywhere to close
          </span>
        )}
      </div>

      <style>{`
        .abeyton-loader-overlay {
          position: fixed;
          inset: 0;
          background: var(--bg-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          cursor: ${isManual ? "pointer" : "default"};
        }
        .abeyton-loader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          animation: gentleFloat 3s ease-in-out infinite;
        }
        .loader-text {
          font-family: var(--font-display);
          font-size: 14px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--zinc-400);
          opacity: 0;
          animation: logoFadeIn 1.5s ease-out 0.8s forwards;
        }
        @keyframes logoFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
