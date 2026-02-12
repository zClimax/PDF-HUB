export default function FilePicker({
  id,
  label = "Seleccionar archivo",
  accept = ".pdf",
  multiple = false,
  onChange,
  helper,
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <label
          htmlFor={id}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
        >
          {label}
        </label>

        {helper ? (
          <span className="text-sm text-slate-500">{helper}</span>
        ) : null}

        <input
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
