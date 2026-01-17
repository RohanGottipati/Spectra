import { ReactNode } from "react";

interface StepProps {
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}

export function Step({ number, title, description, children }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          {number}
        </div>
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="ml-16 space-y-4">{children}</div>
    </div>
  );
}
