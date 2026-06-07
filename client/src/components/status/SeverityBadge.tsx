import { cn } from "@/lib/utils";

type SeverityColor = {
  bg: string;
  text: string;
  dot: string;
};

const severityColors: Record<string, SeverityColor> = {
  critical: {
    bg: "bg-red-100 dark:bg-red-900",
    text: "text-red-800 dark:text-red-200",
    dot: "bg-red-600",
  },
  major: {
    bg: "bg-orange-100 dark:bg-orange-900",
    text: "text-orange-800 dark:text-orange-200",
    dot: "bg-orange-500",
  },
  minor: {
    bg: "bg-yellow-100 dark:bg-yellow-900",
    text: "text-yellow-800 dark:text-yellow-200",
    dot: "bg-yellow-500",
  },
  warning: {
    bg: "bg-amber-100 dark:bg-amber-900",
    text: "text-amber-800 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-800 dark:text-blue-200",
    dot: "bg-blue-500",
  },
};

const defaultColor: SeverityColor = {
  bg: "bg-gray-100 dark:bg-gray-900",
  text: "text-gray-800 dark:text-gray-200",
  dot: "bg-gray-500",
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5 gap-1",
  default: "text-xs px-2 py-0.5 gap-1.5",
  lg: "text-sm px-2.5 py-1 gap-2",
} as const;

const dotSizeClasses = {
  sm: "h-1.5 w-1.5",
  default: "h-2 w-2",
  lg: "h-2 w-2",
} as const;

export function getSeverityColor(severity: string): SeverityColor {
  return severityColors[severity] ?? defaultColor;
}

export function getSeverityLabel(severity: string): string {
  if (!severity) return "Unknown";
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

interface SeverityBadgeProps {
  severity: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function SeverityBadge({
  severity,
  size = "default",
  className,
}: SeverityBadgeProps) {
  const color = getSeverityColor(severity);
  const label = getSeverityLabel(severity);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        color.bg,
        color.text,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("shrink-0 rounded-full", color.dot, dotSizeClasses[size])} />
      {label}
    </span>
  );
}
