import { useTenant } from "../../hooks/useTenant";

type TenantLoaderProps = {
  manualExit?: () => void;
  isManual?: boolean;
};

export function TenantLoader({ manualExit, isManual }: TenantLoaderProps) {
  const { name, logo_url } = useTenant();

  return (
    <div
      className="tenant-loader-overlay"
      onClick={isManual ? manualExit : undefined}
    >
      <div className="tenant-loader-content">
        {logo_url ? (
          <img className="tenant-loader-logo" src={logo_url} alt={name} />
        ) : (
          <div className="tenant-loader-mark" aria-hidden="true" />
        )}

        <div className="tenant-loader-text">{name}</div>

        <div className="tenant-loader-spinner" />

        {isManual && (
          <span className="tenant-loader-hint">Click anywhere to close</span>
        )}
      </div>
    </div>
  );
}
