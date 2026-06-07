import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number; // e.g. +3.2 or -1.5
    label: string; // e.g. "vs 1h ago"
  };
  status?: "normal" | "warning" | "critical" | "unknown";
  onClick?: () => void;
  className?: string;
}

const statusDotColor: Record<string, string> = {
  normal: "bg-green-500",
  warning: "bg-yellow-500",
  critical: "bg-red-500",
  unknown: "bg-gray-400",
};

export function KpiCard({
  title,
  value,
  unit,
  trend,
  status = "normal",
  onClick,
  className,
}: KpiCardProps) {
  const isPositiveTrend = trend ? trend.value > 0 : false;
  const isNegativeTrend = trend ? trend.value < 0 : false;

  return (
    <Card
      className={cn(onClick && "cursor-pointer hover:border-primary/50 transition-colors", className)}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Title row */}
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDotColor[status] ?? statusDotColor.unknown)} />
          <span className="text-xs font-medium text-muted-foreground truncate">{title}</span>
        </div>

        {/* Value */}
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>

        {/* Trend */}
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            {isPositiveTrend && (
              <svg className="h-3 w-3 text-green-600 dark:text-green-400" viewBox="0 0 12 12" fill="none">
                <path d="M6 2L10 7H2L6 2Z" fill="currentColor" />
              </svg>
            )}
            {isNegativeTrend && (
              <svg className="h-3 w-3 text-red-600 dark:text-red-400" viewBox="0 0 12 12" fill="none">
                <path d="M6 10L2 5H10L6 10Z" fill="currentColor" />
              </svg>
            )}
            <span
              className={cn(
                "font-medium",
                isPositiveTrend && "text-green-600 dark:text-green-400",
                isNegativeTrend && "text-red-600 dark:text-red-400",
                !isPositiveTrend && !isNegativeTrend && "text-muted-foreground"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
