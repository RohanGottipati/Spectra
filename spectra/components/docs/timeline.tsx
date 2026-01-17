import { ReactNode } from "react";

interface TimelineItemProps {
  icon: string;
  title: string;
  description: string;
  details?: ReactNode;
}

export function Timeline({ items }: { items: TimelineItemProps[] }) {
  return (
    <div className="space-y-8">
      {items.map((item, index) => (
        <div key={index} className="flex gap-6">
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-xl">
              {item.icon}
            </div>
            {index < items.length - 1 && (
              <div className="mt-2 h-16 w-0.5 bg-border"></div>
            )}
          </div>
          <div className="flex-1 pt-2">
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            {item.details && <div className="mt-4">{item.details}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
