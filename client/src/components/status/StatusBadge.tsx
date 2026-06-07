import { cn } from "@/lib/utils";

type StatusColor = {
  bg: string;
  text: string;
  dot: string;
};

const colorMap: Record<string, StatusColor> = {
  green: {
    bg: "bg-green-100 dark:bg-green-900",
    text: "text-green-800 dark:text-green-200",
    dot: "bg-green-500",
  },
  yellow: {
    bg: "bg-yellow-100 dark:bg-yellow-900",
    text: "text-yellow-800 dark:text-yellow-200",
    dot: "bg-yellow-500",
  },
  red: {
    bg: "bg-red-100 dark:bg-red-900",
    text: "text-red-800 dark:text-red-200",
    dot: "bg-red-500",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-800 dark:text-blue-200",
    dot: "bg-blue-500",
  },
  gray: {
    bg: "bg-gray-100 dark:bg-gray-900",
    text: "text-gray-800 dark:text-gray-200",
    dot: "bg-gray-500",
  },
};

// Map each status string to a color category
const statusColorCategory: Record<string, keyof typeof colorMap> = {
  // Green — healthy / normal / recovered
  healthy: "green",
  normal: "green",
  recovered: "green",
  confirmed: "green",
  processing: "green",
  closed: "green",

  // Yellow — warning / minor
  warning: "yellow",
  minor: "yellow",

  // Red — critical / major
  critical: "red",
  major: "red",

  // Blue — maintenance / silenced
  maintenance: "blue",
  silenced: "blue",

  // Gray — unknown / offline / triggered
  unknown: "gray",
  offline: "gray",
  triggered: "gray",
  unconfirmed: "gray",
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

export function getStatusColor(status: string): StatusColor {
  const category = statusColorCategory[status] ?? "gray";
  return colorMap[category];
}

export function getStatusLabel(status: string): string {
  // Capitalize first letter
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function StatusBadge({ status, size = "default", className }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

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
