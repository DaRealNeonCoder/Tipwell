import WorkerToolPage from "@/components/worker-tool-page";
import { PoolCalculator } from "@/components/worker-calculators";

export default function PoolPage() {
  return <WorkerToolPage eyebrow="Worker tool" title={<>Share the pool<br /><em>without guesswork.</em></>} description="Allocate a shared tip pool by hours with exact, deterministic cent handling."><PoolCalculator /></WorkerToolPage>;
}
