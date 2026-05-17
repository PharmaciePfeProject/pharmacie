import { cn } from "@/lib/utils";

export function Alert({ children, className, variant = "default" }) {
  const baseStyles = "rounded-lg border px-4 py-3";
  
  const variants = {
    default: "border-border bg-slate-50 text-slate-900",
    destructive: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)}>
      {children}
    </div>
  );
}

export function AlertDescription({ children, className }) {
  return (
    <p className={cn("text-sm leading-relaxed", className)}>
      {children}
    </p>
  );
}

export function AlertTitle({ children, className }) {
  return (
    <h4 className={cn("mb-2 font-medium", className)}>
      {children}
    </h4>
  );
}
