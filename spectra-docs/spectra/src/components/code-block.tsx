import { ReactNode } from "react";

interface CodeBlockProps {
  language: string;
  children: string;
  title?: string;
}

export function CodeBlock({ language, children, title }: CodeBlockProps) {
  return (
    <div className="rounded-lg border border-border bg-muted overflow-hidden">
      {title && (
        <div className="border-b border-border bg-muted-foreground/10 px-4 py-2 text-sm font-semibold">
          {title}
        </div>
      )}
      <pre className="overflow-x-auto p-4">
        <code className={`language-${language}`}>{children}</code>
      </pre>
    </div>
  );
}
