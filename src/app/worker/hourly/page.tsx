import WorkerToolPage from "@/components/worker-tool-page";
import { HourlyCalculator } from "@/components/worker-calculators";

export default function HourlyPage() {
  return <WorkerToolPage eyebrow="Worker tool" title={<>Know your real<br /><em>hourly rate.</em></>} description="Combine wages, cash tips, card tips, and tip-out into one clear number."><HourlyCalculator /></WorkerToolPage>;
}
