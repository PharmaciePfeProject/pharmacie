import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export type PickerOption = {
  value: string;
  label: string;
  description?: string;
};

type PickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  options: PickerOption[];
  placeholder: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  compact?: boolean;
  emptyText?: string;
  helperText?: string;
};

export function PickerField({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  searchPlaceholder,
  compact = false,
  emptyText = "No matching options",
  helperText = "Type to filter, then choose the correct record.",
}: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === value) || null;
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options.slice(0, 12);

    return options
      .filter((option) =>
        [option.value, option.label, option.description]
          .filter(Boolean)
          .some((entry) => entry!.toLowerCase().includes(normalized))
      )
      .slice(0, 12);
  }, [options, query]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={`flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-left shadow-sm transition hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted/30 ${
          compact ? "h-11" : "min-h-[56px] py-2"
        }`}
      >
        <div className="min-w-0">
          {selected ? (
            <div className="min-w-0">
              {compact ? (
                <div className="truncate text-sm text-slate-900">
                  <span className="font-medium">{selected.value}</span>
                  {selected.label && selected.label !== selected.value ? (
                    <span className="ml-2 text-muted-foreground">{selected.label}</span>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="truncate text-sm font-medium text-slate-900">{selected.value}</div>
                  <div className="truncate text-xs text-muted-foreground">{selected.label}</div>
                </>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-xl">
          <div className="border-b border-emerald-100 bg-emerald-50/70 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder || placeholder}
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="rounded-xl px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filtered.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${
                      active ? "bg-primary/10 text-primary" : "hover:bg-emerald-50/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{option.value}</div>
                      <div className="text-sm text-muted-foreground">{option.label}</div>
                      {option.description ? (
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      ) : null}
                    </div>
                    {active ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-emerald-100 bg-slate-50/70 px-3 py-2 text-xs text-muted-foreground">
            {helperText}
          </div>
        </div>
      ) : null}
    </div>
  );
}
