import Link from "next/link";
import WorkerToolPage from "@/components/worker-tool-page";

const tools = [
  { href: "/worker/hourly", eyebrow: "Your shift", title: "Tips per hour", description: "See net tips per hour and your real hourly rate after wages and tip-out." },
  { href: "/worker/pool", eyebrow: "Share the pool", title: "Pool split by hours", description: "Split a shared tip pool fairly, including leftover cents and an optional tip-out." },
  { href: "/worker/tip-out", eyebrow: "Check the percentage", title: "Tip-out calculator", description: "Calculate a tip-out from sales or from the tips you collected." },
  { href: "/worker/insights", eyebrow: "See the pattern", title: "Table insights", description: "Log sections, party sizes, tips, and turns to learn where your best shifts happen." },
  { href: "/manager", eyebrow: "For teams", title: "Tip pool policy", description: "Preview a transparent hours-and-role-weight policy with exact-cent payouts." },
  { href: "/log", eyebrow: "Keep the record", title: "Shift log", description: "Save shifts, workplaces, summaries, and CSV exports to your account." },
];

export default function WorkerPage() {
  return (
    <WorkerToolPage eyebrow="Worker tools" title={<>Make every shift<br /><em>add up.</em></>} description="Choose one focused tool at a time for your pay, your pool, your tip-out, or your records.">
      <div className="worker-tool-grid">
        {tools.map((tool) => <Link className="worker-tool-card" href={tool.href} key={tool.href}><span className="eyebrow accent">{tool.eyebrow}</span><strong>{tool.title}</strong><p>{tool.description}</p><span className="audience-arrow" aria-hidden="true">→</span></Link>)}
      </div>
    </WorkerToolPage>
  );
}
