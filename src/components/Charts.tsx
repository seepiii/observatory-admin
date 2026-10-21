// Small, dependency-free charts. One gold hue (magnitude), recessive axes,
// values in text colors, and a hover/focus tooltip on every mark.

const GOLD = "#e9c46a";

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded border border-white/15 bg-[#141414] px-2 py-1 font-mono text-xs whitespace-nowrap text-white shadow-lg group-hover:block group-focus:block">
      {children}
    </span>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="hud-panel flex flex-col gap-1 p-4">
      <span className="font-mono text-[11px] tracking-[0.2em] text-white/50 uppercase">{label}</span>
      <span className="text-3xl font-bold text-white tabular-nums">{value}</span>
      {sub && <span className="font-mono text-xs text-white/45">{sub}</span>}
    </div>
  );
}

/** Vertical columns over time (e.g. reports per day). */
export function ColumnChart({ data, unit }: { data: { label: string; short: string; value: number }[]; unit: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-40 items-end gap-[2px] border-b border-white/15">
        {data.map((d) => (
          <div
            key={d.label}
            tabIndex={0}
            aria-label={`${d.label}: ${d.value} ${unit}`}
            className="group relative flex h-full flex-1 items-end outline-none"
          >
            <Tip>
              {d.label} · <strong>{d.value}</strong> {unit}
            </Tip>
            <div
              className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-100 group-focus:opacity-100"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0, backgroundColor: GOLD, opacity: 0.8 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-white/45">
        <span>{data[0]?.short}</span>
        <span>{data[Math.floor(data.length / 2)]?.short}</span>
        <span>{data.at(-1)?.short}</span>
      </div>
    </div>
  );
}

/** 24 cells, one per hour; darker = quieter, brighter gold = busier. */
export function HourStrip({ hours, labelOf }: { hours: number[]; labelOf: (h: number) => string }) {
  const max = Math.max(1, ...hours);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-12 gap-[2px] sm:grid-cols-24">
        {hours.map((n, h) => (
          <div
            key={h}
            tabIndex={0}
            aria-label={`${labelOf(h)}: ${n} reports`}
            className="group relative h-10 rounded-[4px] outline-none focus:ring-1 focus:ring-white/60"
            style={{ backgroundColor: n ? GOLD : "rgba(255,255,255,0.05)", opacity: n ? 0.25 + 0.75 * (n / max) : 1 }}
          >
            <Tip>
              {labelOf(h)} · <strong>{n}</strong> reports
            </Tip>
          </div>
        ))}
      </div>
      <div className="hidden justify-between font-mono text-[11px] text-white/45 sm:flex">
        <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
      </div>
    </div>
  );
}

/** Horizontal bars with the value (and an optional note) in text beside each. */
export function BarList({ rows }: { rows: { label: React.ReactNode; value: number; display?: string; note?: string; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="font-mono text-sm text-white/45">No data yet.</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <li key={i} className="grid grid-cols-[minmax(7rem,10rem)_1fr_auto] items-center gap-3 font-mono text-sm">
          <span className="truncate text-white/80">{r.label}</span>
          <span className="h-2.5 rounded-full bg-white/5">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, backgroundColor: r.color ?? GOLD }}
            />
          </span>
          <span className="text-right text-white tabular-nums">
            {r.display ?? r.value}
            {r.note && <span className="ml-2 text-xs text-white/45">{r.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
