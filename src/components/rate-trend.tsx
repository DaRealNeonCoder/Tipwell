import { calculateShiftTotals, type ShiftLike } from "@/lib/shift-data";

type TrendShift = ShiftLike & { id: string; workplaceName: string | null };

function money(cents: number | null) {
  return cents === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export default function RateTrend({ shifts }: { shifts: TrendShift[] }) {
  const points = [...shifts].sort((a, b) => a.date.localeCompare(b.date)).slice(-12).map((shift) => ({ shift, rate: calculateShiftTotals([shift]).averageRealHourlyRateCents }));
  const rates = points.flatMap((point) => point.rate === null ? [] : [point.rate]);
  if (points.length === 0 || rates.length === 0) return <section className="calculator-card trend-card" aria-labelledby="rate-trend-title"><div className="section-heading"><div><p className="eyebrow">Come back weekly</p><h2 id="rate-trend-title">Real hourly rate</h2></div></div><p className="empty-inline">Add shifts with hours and compensation to see your trend.</p></section>;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = Math.max(max - min, 1);
  const width = 640;
  const height = 190;
  const chartPoints = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
    const y = point.rate === null ? height : 12 + ((max - point.rate) / range) * (height - 42);
    return { ...point, x, y };
  });
  const path = chartPoints.filter((point) => point.rate !== null).map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  return <section className="calculator-card trend-card" aria-labelledby="rate-trend-title"><div className="section-heading"><div><p className="eyebrow">Last {points.length} shifts</p><h2 id="rate-trend-title">Real hourly rate</h2></div><span className="privacy-pill">Based on logged records</span></div><p className="section-intro">Your actual hourly rate after wages, tips, tip-out, and employer-paid service charge share.</p><div className="trend-highlight"><strong>{money(points.at(-1)?.rate ?? null)}</strong><span>latest shift</span><small>{points.at(-1) ? dateLabel(points.at(-1)!.shift.date) : ""}</small></div><div className="trend-chart-wrap"><svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Real hourly rate trend"><line x1="0" y1="12" x2={width} y2="12" /><line x1="0" y1={height - 30} x2={width} y2={height - 30} /><path className="trend-line" d={path} />{chartPoints.map((point) => point.rate !== null && <circle key={point.shift.id} cx={point.x} cy={point.y} r="4" />)}</svg></div><div className="trend-labels">{chartPoints.map((point) => <span key={point.shift.id}>{dateLabel(point.shift.date)}</span>)}</div></section>;
}
