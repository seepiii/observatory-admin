export default function Panel({
  title,
  hint,
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`hud-panel flex flex-col gap-4 p-5 ${className}`}>
      <header className="flex flex-col gap-1">
        <h2 className="font-mono text-sm font-bold tracking-[0.2em] text-white uppercase">{title}</h2>
        {hint && <p className="font-mono text-xs leading-relaxed text-white/50">{hint}</p>}
      </header>
      {children}
    </section>
  );
}
