export default function PlatformRootPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-bold text-slate-50">SolarOS Enterprise</h1>
      <p className="text-slate-400">
        India&rsquo;s all-in-one solar operating system. Each tenant is served from its own subdomain —
        e.g. <code className="rounded bg-white/10 px-1.5 py-0.5">acme-solar.solaros.in</code> — or a
        custom domain.
      </p>
    </div>
  );
}
