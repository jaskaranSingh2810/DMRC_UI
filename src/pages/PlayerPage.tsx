import { useEffect, useState } from "react";
import {
  loadStoredRegisteredDevice,
  type StoredRegisteredDevice,
} from "@/pages/deviceRegistrationStorage";

export default function PlayerPage() {
  const [device, setDevice] = useState<StoredRegisteredDevice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredRegisteredDevice()
      .then((stored) => {
        setDevice(stored);
      })
      .catch(() => {
        setDevice(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={styles.screen}>
        <p style={styles.label}>Restoring device...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div style={styles.screen}>
        <p style={styles.label}>No registered device found.</p>
        <button
          style={styles.btn}
          onClick={() => (window.location.href = "/login?kiosk=true")}
        >
          Go to Registration
        </button>
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      {/* ── Device Info Banner ── */}
      <div style={styles.banner}>
        <Row label="Device Code" value={device.deviceCode} />
        <Row label="Location"    value={device.locationName} />
        <Row label="Landmark"    value={device.landmark || "—"} />
        <Row label="Brand"       value={device.brand || "—"} />
        <Row label="Orientation" value={device.orientation || "—"} />
        <Row
          label="Size"
          value={device.deviceSize ? `${device.deviceSize} inch` : "—"}
        />
      </div>

      {/* ── Your actual content goes here ── */}
      <div style={styles.content}>
        <p style={styles.label}>▶ Content is playing</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100vh",
    background: "#0a0a0a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    color: "#fff",
    padding: "32px",
  },
  banner: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "16px",
    padding: "24px 32px",
    marginBottom: "32px",
    width: "100%",
    maxWidth: "480px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
  },
  rowLabel: {
    color: "#8a94a6",
    fontWeight: 500,
  },
  rowValue: {
    color: "#ffffff",
    fontWeight: 600,
    textAlign: "right",
  },
  content: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: "15px",
    color: "#8a94a6",
    margin: 0,
  },
  btn: {
    marginTop: "20px",
    padding: "10px 24px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(90deg, #164f96, #8e1c45)",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "13px",
  },
};