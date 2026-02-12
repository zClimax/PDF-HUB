export default function AppShell({ title, subtitle, onBack, actions, children }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  ← Volver
                </button>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
                {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
              </div>
            </div>
          </div>

          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
