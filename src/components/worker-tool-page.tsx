import type { ReactNode } from "react";
import AppHeader from "@/components/app-header";
import ServiceWorkerRegistration from "@/app/service-worker-registration";
import WorkerToolsNav from "@/components/worker-tools-nav";

type Props = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  children: ReactNode;
};

export default function WorkerToolPage({ eyebrow, title, description, children }: Props) {
  return (
    <main className="app-shell">
      <ServiceWorkerRegistration />
      <div className="app-container worker-container">
        <AppHeader />
        <section className="hero-copy worker-hero" aria-labelledby="worker-page-title">
          <p className="eyebrow accent">{eyebrow}</p>
          <h1 id="worker-page-title">{title}</h1>
          <p>{description}</p>
          <p className="privacy-note">No account. No network required. Your numbers stay on this device.</p>
        </section>
        <WorkerToolsNav />
        <div className="worker-tool-page">{children}</div>
        <footer className="app-footer"><span>Tipwell · private by design</span><span>Worker tools</span></footer>
      </div>
    </main>
  );
}
