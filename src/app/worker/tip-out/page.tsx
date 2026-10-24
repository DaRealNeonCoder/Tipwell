import WorkerToolPage from "@/components/worker-tool-page";
import { TipOutCalculator } from "@/components/worker-calculators";

export default function TipOutPage() {
  return <WorkerToolPage eyebrow="Worker tool" title={<>Check the tip-out<br /><em>before you pay.</em></>} description="Compare tip-out amounts against sales or the tips you collected."><TipOutCalculator /></WorkerToolPage>;
}
