import { siteConfig } from "@/lib/site";

export default function HomePage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-stone-950 text-stone-100">
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top,_rgba(253,186,116,0.18),_transparent_64%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-[0.3em] text-orange-200 uppercase">
            {siteConfig.name}
          </p>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-400">
            Milestone 1
          </span>
        </header>

        <section className="flex flex-1 items-center py-24">
          <div className="max-w-3xl">
            <p className="mb-6 text-sm font-medium tracking-[0.2em] text-orange-300 uppercase">
              A considered beginning
            </p>
            <h1 className="max-w-2xl text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-7xl">
              Make room for what matters.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-stone-300">
              {siteConfig.description} The foundation is ready for the next step.
            </p>
          </div>
        </section>

        <footer className="border-t border-white/10 pt-5 text-sm text-stone-500">
          App shell ready
        </footer>
      </div>
    </main>
  );
}
