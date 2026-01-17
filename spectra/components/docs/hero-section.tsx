export function HeroSection({
  title,
  subtitle,
  cta,
}: {
  title: string;
  subtitle: string;
  cta?: { text: string; href: string }[];
}) {
  return (
    <div className="space-y-6 py-12 text-center">
      <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
      <p className="text-xl text-muted-foreground">{subtitle}</p>
      {cta && (
        <div className="flex justify-center gap-4">
          {cta.map((button, i) => (
            <a
              key={i}
              href={button.href}
              className={`rounded-lg px-6 py-3 font-semibold transition-all ${
                i === 0
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border hover:bg-muted"
              }`}
            >
              {button.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
