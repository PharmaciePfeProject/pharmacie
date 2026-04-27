export default function AuthBackground() {
    return (<div className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(0,112,56,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(18,90,160,0.12),transparent_22%),linear-gradient(180deg,#f8fbfd_0%,#eef4f6_100%)]">
      <div className="bg-grid absolute inset-0"/>
      <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"/>
      <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-secondary/10 blur-3xl"/>
      <div className="absolute bottom-0 right-1/3 h-72 w-72 rounded-full bg-accent/20 blur-3xl"/>
    </div>);
}
