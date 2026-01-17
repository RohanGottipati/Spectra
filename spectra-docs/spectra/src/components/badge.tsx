import { ReactNode } from "react";

interface BadgeProps {
  variant?: "primary" | "success" | "warning" | "error" | "secondary";
  children: ReactNode;
}

const badgeStyles = {
  primary: "bg-blue-100 text-blue-900 border border-blue-300",
  success: "bg-green-100 text-green-900 border border-green-300",
  warning: "bg-yellow-100 text-yellow-900 border border-yellow-300",
  error: "bg-red-100 text-red-900 border border-red-300",
  secondary: "bg-gray-100 text-gray-900 border border-gray-300",
};

export function Badge({ variant = "primary", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[variant]}`}
    >
      {children}
    </span>
  );
}
