import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { SeverityBadge } from "@/components/status/SeverityBadge";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle,
  PlayCircle,
  Volume2,
  XCircle,
  MessageSquare,
  Clock,
  AlertTriangle,
  UserCircle,
  ShieldCheck,
  BellOff,
  RotateCcw,
  X,
  Plus,
} from "lucide-react";

interface AlertDetailProps {
  id: string;
}

const EVENT_ICONS: Record<string, React.ElementType> = {
  triggered: AlertTriangle,
  acknowledged: CheckCircle,
  confirmed: ShieldCheck,
  processing: PlayCircle,
  silenced: BellOff,
  notified: BellOff,
  recovered: RotateCcw,
  closed: XCircle,
  comment_added: MessageSquare,
  assigned: UserCircle,
};

const EVENT_COLORS: Record<string, string> = {
  triggered: "text-red-500",
  acknowledged: "text-green-500",
  confirmed: "text-green-600",
  processing: "text-blue-500",
  silenced: "text-gray-500",
  notified: "text-purple-500",
  recovered: "text-emerald-500",
  closed: "text-gray-400",
  comment_added: "text-blue-400",
  assigned: "text-orange-500",
};

function formatDuration(firstSeen: string, lastSeen?: string | null): string {
  const end = lastSeen ? new Date(lastSeen).getTime() : Date.now();
  const ms = end - new Date(firstSeen).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

export default function AlertDetail({ id }: AlertDetailProps) {
  const { t } = useTranslation();
  const [comment, setComment] = useState("");
  const [resolution, setResolution] = useState("");
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [silenceDuration, setSilenceDuration] = useState(60);
  const [showSilenceForm, setShowSilenceForm] = useState(false);

  const detailQuery = trpc.alert.getById.useQuery({ id });
  const utils = trpc.useUtils();

  const acknowledgeMut = trpc.alert.acknowledge.useMutation();
  const startProcessingMut = trpc.alert.startProcessing.useMutation();
  const silenceMut = trpc.alert.silence.useMutation();
  const addCommentMut = trpc.alert.addComment.useMutation();
  const closeMut = trpc.alert.close.useMutation();

  const refresh = () => {
    utils.alert.getById.invalidate({ id });
    utils.alert.list.invalidate();
    utils.alert.getKpis.invalidate();
  };

  const alert = detailQuery.data;

  if (detailQuery.isPending) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Alert not found</p>
      </div>
    );
  }

  const canAcknowledge =
    alert.status === "triggered" || alert.status === "unconfirmed";
  const canProcess = alert.status === "confirmed";
  const canSilence =
    alert.status !== "closed" && alert.status !== "recovered";
  const canClose = alert.status !== "closed";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/alerts">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <SeverityBadge severity={alert.severity} size="lg" />
            <StatusBadge status={alert.status} size="lg" />
          </div>
          <h1 className="text-2xl font-bold mt-2">{alert.name}</h1>
          <p className="text-sm text-muted-foreground">
            {alert.description ?? ""}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {canAcknowledge && (
            <Button
              onClick={() => acknowledgeMut.mutateAsync({ id }).then(refresh)}
              disabled={acknowledgeMut.isPending}
              size="sm"
            >
              <CheckCircle className="h-4 w-4" />
              {t("alert.acknowledge")}
            </Button>
          )}
          {canProcess && (
            <Button
              onClick={() =>
                startProcessingMut.mutateAsync({ id }).then(refresh)
              }
              disabled={startProcessingMut.isPending}
              size="sm"
            >
              <PlayCircle className="h-4 w-4" />
              {t("alert.processing")}
            </Button>
          )}
          {canSilence && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSilenceForm(!showSilenceForm)}
            >
              <Volume2 className="h-4 w-4" />
              {t("alert.silence")}
            </Button>
          )}
          {canClose && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowCloseForm(!showCloseForm)}
            >
              <XCircle className="h-4 w-4" />
              {t("alert.close")}
            </Button>
          )}
        </div>
      </div>

      {/* Silence form */}
      {showSilenceForm && canSilence && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-sm">{t("alert.silence")} (min):</span>
            <input
              type="number"
              value={silenceDuration}
              onChange={(e) => setSilenceDuration(Number(e.target.value))}
              className="h-8 w-24 rounded border bg-background px-2 text-sm"
              min={1}
            />
            <Button
              size="sm"
              onClick={() =>
                silenceMut
                  .mutateAsync({ id, durationMinutes: silenceDuration })
                  .then(() => {
                    setShowSilenceForm(false);
                    refresh();
                  })
              }
              disabled={silenceMut.isPending}
            >
              {t("alert.silence")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Close form */}
      {showCloseForm && canClose && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                {t("alert.resolution")}
              </label>
              <input
                type="text"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="h-8 rounded border bg-background px-3 text-sm"
                placeholder={t("alert.resolution") + "..."}
              />
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                closeMut
                  .mutateAsync({ id, resolution })
                  .then(() => {
                    setShowCloseForm(false);
                    refresh();
                  })
              }
              disabled={closeMut.isPending || !resolution}
            >
              <XCircle className="h-4 w-4" />
              {t("alert.close")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Impact summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t("alert.impact")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">
                {t("alert.object")}:
              </span>
              <p className="font-medium">
                {alert.deviceName ?? "—"}
                {alert.deviceIp ? ` (${alert.deviceIp})` : ""}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t("alert.site")}:</span>
              <p className="font-medium">{alert.siteName ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t("alert.duration")}:
              </span>
              <p className="font-medium">
                {formatDuration(
                  alert.firstSeenAt,
                  alert.recoveredAt ?? alert.closedAt,
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t("alert.repeatCount")}:
              </span>
              <p className="font-medium">{alert.repeatCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t("alert.timeline")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-0">
            {alert.timeline.map((evt, idx) => {
              const Icon = EVENT_ICONS[evt.event] ?? Clock;
              const color = EVENT_COLORS[evt.event] ?? "text-gray-400";
              return (
                <div key={evt.id} className="flex gap-3 pb-4 last:pb-0">
                  {/* Line + dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`rounded-full p-1 ${color} bg-background border`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {idx < alert.timeline.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {evt.event.replace("_", " ")}
                      </span>
                      {evt.userName && (
                        <span className="text-xs text-muted-foreground">
                          — {evt.userName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(evt.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {evt.comment && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {evt.comment}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add comment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t("alert.comment")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1 h-8 rounded border bg-background px-3 text-sm"
              placeholder={t("alert.comment") + "..."}
              onKeyDown={(e) => {
                if (e.key === "Enter" && comment.trim()) {
                  addCommentMut
                    .mutateAsync({ id, comment: comment.trim() })
                    .then(() => {
                      setComment("");
                      refresh();
                    });
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => {
                if (comment.trim()) {
                  addCommentMut
                    .mutateAsync({ id, comment: comment.trim() })
                    .then(() => {
                      setComment("");
                      refresh();
                    });
                }
              }}
              disabled={addCommentMut.isPending || !comment.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
