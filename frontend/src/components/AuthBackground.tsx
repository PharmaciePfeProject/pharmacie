export default function AuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Soft light gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/60 to-background" />

      {/* Brand blobs */}
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-primary/15 blur-3xl animate-blob" />
      <div className="absolute top-40 -right-24 h-96 w-96 rounded-full bg-secondary/12 blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-accent/18 blur-3xl animate-blob animation-delay-4000" />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:48px_48px] opacity-25" />
    </div>
  );
}
