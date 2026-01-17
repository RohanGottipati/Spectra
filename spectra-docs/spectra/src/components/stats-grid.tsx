import { ReactNode } from "react";

interface StatProps {
  value: string;
  label: string;
  icon?: string;
}

interface StatsGridProps {
  stats: StatProps[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="rounded-lg border border-border bg-card p-6"
        >
          {stat.icon && <div className="mb-4 text-3xl">{stat.icon}</div>}
          <div className="text-3xl font-bold">{stat.value}</div>
          <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
