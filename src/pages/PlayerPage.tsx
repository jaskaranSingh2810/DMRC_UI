import { useEffect, useMemo, useState } from "react";
import {
  loadStoredRegisteredDevice,
  type StoredRegisteredDevice,
} from "@/pages/deviceRegistrationStorage";

type MetroTiming = {
  destination: string;
  platform: string;
  eta: string;
};

type Column<T> = {
  key: keyof T;
  label: string;
  width: string;
  align: "left" | "center" | "right";
  numeric?: boolean;
};

const METRO_TIMINGS: MetroTiming[] = [
  { destination: "Yashoobhoomi", platform: "5", eta: "5 mins" },
  { destination: "New Delhi", platform: "4", eta: "4 mins" },
  // { destination: "Yashoobhoomi", platform: "5", eta: "5 mins" },
  // { destination: "Yashoobhoomi", platform: "5", eta: "5 mins" },
];

const columns: Column<MetroTiming>[] = [
  {
    key: "destination",
    label: "Destination",
    width: "basis-[56%]",
    align: "left",
  },
  {
    key: "platform",
    label: "Platform",
    width: "basis-[18%]",
    align: "center",
    numeric: true,
  },
  {
    key: "eta",
    label: "Time",
    width: "basis-[26%]",
    align: "right",
    numeric: true,
  },
];

const alignmentClassMap: Record<Column<MetroTiming>["align"], string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const AD_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const VALUE_COLOR = "#f2b700";

export default function PlayerPage() {
  const [device, setDevice] = useState<StoredRegisteredDevice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredRegisteredDevice()
      .then((stored) => setDevice(stored))
      .catch(() => setDevice(null))
      .finally(() => setLoading(false));
  }, []);

  const isPortrait = useMemo(() => {
    let orientation = "PORTRAIT";
    // const orientation = device?.orientation?.trim().toUpperCase();

    if (orientation === "PORTRAIT") return true;
    if (orientation === "LANDSCAPE") return false;

    return window.innerHeight >= window.innerWidth;
  }, [device?.orientation]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black px-8 text-white">
        <p className="m-0 text-base text-slate-400">Restoring device...</p>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-black px-8 text-white">
        <p className="m-0 text-base text-slate-400">
          No registered device found.
        </p>

        <button
          className="mt-5 rounded-lg bg-button-gradient px-6 py-2.5 text-sm font-semibold text-white"
          onClick={() => (window.location.href = "/login?kiosk=true")}
        >
          Go to Registration
        </button>
      </div>
    );
  }

  const timingHeaderCellClass =
    "px-4 text-[clamp(0.85rem,1vw,1.15rem)] font-medium text-white/90";
  const timingValueCellClass =
    "px-4 text-[clamp(0.95rem,1.05vw,1.2rem)] font-medium tracking-[0.01em]";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#020202] text-white">
      {/* MAIN CONTENT */}
      <div
        className={[
          "min-h-0 flex-1 overflow-hidden bg-[#050505]",
          isPortrait ? "grid grid-rows-[40vh_1fr]" : "flex flex-row gap-1.5",
        ].join(" ")}
      >
        {/* METRO TIMINGS PANEL */}
        <section
          className={[
            "flex min-h-0 min-w-0 overflow-hidden border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            isPortrait ? "w-full flex-col" : "h-full w-[40%] flex-col",
          ].join(" ")}
        >
          {/* HEADER */}
          <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#edf2fb] to-[#dde7f5] px-5 py-1">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[clamp(1rem,1.2vw,1.45rem)] font-semibold text-[#142033]">
                Metro timings
              </span>

              <span className="mt-0.5 text-[clamp(0.62rem,0.7vw,0.78rem)] uppercase tracking-[0.24em] text-slate-500">
                Live arrivals
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-[#df1f26]">
              <div className="relative h-9 w-9 rounded-full border-[3px] border-current">
                <div className="absolute left-1/2 top-1/2 h-[3px] w-5 -translate-x-1/2 -translate-y-1/2 bg-current" />
                <div className="absolute left-1/2 top-1/2 h-[3px] w-5 -translate-x-1/2 -translate-y-1/2 rotate-[-40deg] bg-current" />
              </div>

              <div className="flex flex-col leading-none">
                <span className="text-[0.74rem] font-bold uppercase">
                  Delhi
                </span>

                <span className="text-[0.74rem] font-bold uppercase">
                  Metro
                </span>
              </div>
            </div>
          </header>

          {/* TABLE HEADER */}
          <div className="flex shrink-0 items-center border-b border-white/10 bg-[#040404] px-2 py-3">
            {columns.map((column) => (
              <span
                key={String(column.key)}
                className={`
                ${timingHeaderCellClass}
                ${column.width}
                ${alignmentClassMap[column.align]}
                ${column.key !== "destination" ? "shrink-0" : ""}
                truncate
              `}
              >
                {column.label}
              </span>
            ))}
          </div>

          {/* TABLE BODY */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {METRO_TIMINGS.map((item, index) => (
              <div
                key={`${item.destination}-${index}`}
                className="
                flex min-h-0 flex-1 items-center
                border-b border-white/10
                bg-black px-2
                transition-colors
                last:border-b-0
                even:bg-[#030303]
              "
              >
                {columns.map((column) => (
                  <span
                    key={String(column.key)}
                    className={`
                    ${timingValueCellClass}
                    ${column.width}
                    ${alignmentClassMap[column.align]}
                    ${column.key !== "destination" ? "shrink-0" : ""}
                    ${column.numeric ? "tabular-nums" : ""}
                    truncate
                  `}
                    style={{ color: VALUE_COLOR }}
                  >
                    {item[column.key]}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* VIDEO PANEL */}
        <section
          className={[
            "flex min-h-0 min-w-0 overflow-hidden",
            isPortrait ? "w-full flex-col" : "h-full w-[60%] flex-col",
          ].join(" ")}
        >
          <div className="relative flex min-h-0 flex-1 overflow-hidden border border-white/10 bg-black">
            <video
              className="pointer-events-none block h-full w-full bg-black object-cover"
              src={AD_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              disablePictureInPicture
              controlsList="nodownload nofullscreen noremoteplayback"
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" />
          </div>
        </section>
      </div>

      {/* FIXED BOTTOM TICKER */}
      <div className="flex h-14 w-full shrink-0 overflow-hidden border-t border-white/10">
        <div className="flex w-32 items-center justify-center bg-gradient-to-b from-[#8a3027] to-[#682119] px-3 text-center text-sm font-bold uppercase tracking-[0.08em] text-[#f8ddd4]">
          7th April
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-4 bg-white px-5 text-black">
          <span className="shrink-0 whitespace-nowrap text-sm font-extrabold uppercase tracking-[0.04em] text-zinc-700">
            Important updates
          </span>

          <span className="truncate text-sm font-semibold text-zinc-900">
            Metro trains usually run on electric power, making them more
            eco-friendly than road transport.
          </span>
        </div>
      </div>
    </div>
  );
}
