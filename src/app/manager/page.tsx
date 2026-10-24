import AppHeader from "@/components/app-header";
import ManagerTools from "@/components/manager-tools";
import ServiceWorkerRegistration from "@/app/service-worker-registration";
import WorkerToolsNav from "@/components/worker-tools-nav";

export default function ManagerPage() {
  return <main className="app-shell"><ServiceWorkerRegistration /><div className="app-container worker-container"><AppHeader /><section className="hero-copy worker-hero" aria-labelledby="manager-title"><p className="eyebrow accent">Owner / manager tools</p><h1 id="manager-title">Make the pool<br /><em>easy to trust.</em></h1><p>Preview transparent, exact-cent tip policies without exposing anyone’s private earnings.</p><p className="privacy-note">Policy builder only. Review local compliance rules before use.</p></section><WorkerToolsNav /><div className="worker-tool-page"><ManagerTools /></div><footer className="app-footer"><span>Tipwell · private by design</span><span>Manager tools</span></footer></div></main>;
}
