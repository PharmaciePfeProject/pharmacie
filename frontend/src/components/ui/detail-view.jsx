import { ArrowLeft, FileText, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export function DetailBackLink({ to, label, }) {
    return (<Link to={to}>
      <Button variant="outline" className="rounded-2xl border-slate-200 bg-white/90 px-4 shadow-sm">
        <ArrowLeft className="mr-2 h-4 w-4"/>
        {label}
      </Button>
    </Link>);
}
export function DetailHero({ eyebrow, title, description, badge, }) {
    return (<div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/50 p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (<p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">{eyebrow}</p>) : null}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description ? (<p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>) : null}
        </div>

        {badge ? (<div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm">
            <FileText className="h-4 w-4"/>
            {badge}
          </div>) : null}
      </div>
    </div>);
}
export function DetailStatGrid({ children, }) {
    return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}
export function DetailStatCard({ label, value, emphasis = false, className, }) {
    return (<div className={cn("rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:bg-slate-50/80", emphasis && "bg-gradient-to-br from-emerald-50 via-white to-white", className)}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className={cn("mt-3 text-base font-semibold text-slate-900", emphasis && "text-2xl")}>{value}</div>
    </div>);
}
export function DetailSection({ title, description, children, }) {
    return (<section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
            <Layers3 className="h-4 w-4"/>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
        </div>
      </div>
      <div>{children}</div>
    </section>);
}
export function formatDetailValue(value, fallback = "Not available") {
    if (value === null || value === undefined || value === "") {
        return fallback;
    }
    return value;
}
