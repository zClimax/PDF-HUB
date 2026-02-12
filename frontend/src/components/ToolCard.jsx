export default function ToolCard({ title, description, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={[
        "group text-left rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition",
        "hover:shadow-md hover:border-slate-300",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <span
          className={[
            "rounded-full px-2 py-1 text-xs",
            disabled
              ? "bg-slate-100 text-slate-600"
              : "bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          {disabled ? "Próximamente" : "Listo"}
        </span>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        <span className="opacity-0 transition group-hover:opacity-100">
          Abrir →
        </span>
      </div>
    </button>
  );
}
