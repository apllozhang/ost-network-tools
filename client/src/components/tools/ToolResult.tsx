import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Metric {
  label: string;
  value: string;
  status?: "normal" | "warning" | "critical";
}

interface ToolResultProps {
  success: boolean;
  metrics: Metric[];
  rawOutput?: string;
  onSaveAsMonitor?: () => void;
}

function StatusBadge({ status }: { status?: "normal" | "warning" | "critical" }) {
  const colors = {
    normal: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    critical: "text-red-600 dark:text-red-400",
  };
  if (!status) return null;
  return <span className={colors[status]}>●</span>;
}

export default function ToolResult({
  success,
  metrics,
  rawOutput,
  onSaveAsMonitor,
}: ToolResultProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const handleCopy = async () => {
    if (!rawOutput) return;
    await navigator.clipboard.writeText(rawOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {success ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            {success ? t("tools.success") : t("tools.failed")}
          </CardTitle>
          {onSaveAsMonitor && success && (
            <Button variant="outline" size="sm" onClick={onSaveAsMonitor}>
              {t("tools.saveAsMonitor")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-md border p-3"
            >
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                <StatusBadge status={m.status} />
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {rawOutput && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRaw(!showRaw)}
                className="text-xs text-muted-foreground"
              >
                {t("tools.rawOutput")}
                {showRaw ? " ▲" : " ▼"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-xs text-muted-foreground"
              >
                {copied ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <Copy className="mr-1 h-3 w-3" />
                )}
                {t("tools.copy")}
              </Button>
            </div>
            {showRaw && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                <code>{rawOutput}</code>
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
