import WorkerToolPage from "@/components/worker-tool-page";
import WorkerAdvancedTools from "@/components/worker-advanced-tools";

export default function WorkerInsightsPage() {
  return <WorkerToolPage eyebrow="Worker records" title={<>Find your best<br /><em>sections.</em></>} description="Log tables privately, compare sections and dayparts, and reconcile your cash-out before you go home."><WorkerAdvancedTools /></WorkerToolPage>;
}
