import { ReactNode } from "react";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  href?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  href,
}: FeatureCardProps) {
  const content = (
    <div className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 transition-all hover:border-primary/40 hover:shadow-lg">
      <div className="mb-4 text-4xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}
