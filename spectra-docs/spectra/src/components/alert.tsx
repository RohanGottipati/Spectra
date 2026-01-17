import { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle,
  InfoIcon,
  AlertTriangle,
} from "lucide-react";

interface AlertProps {
  type: "info" | "success" | "warning" | "error";
  title?: string;
  children: ReactNode;
}

const alertStyles = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

const iconMap = {
  info: InfoIcon,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

export function Alert({ type, title, children }: AlertProps) {
  const Icon = iconMap[type];

  return (
    <div className={`rounded-lg border-l-4 p-4 ${alertStyles[type]}`}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          {title && <p className="font-semibold">{title}</p>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
