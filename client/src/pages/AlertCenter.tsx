import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { KpiCard } from "@/components/cards/KpiCard";
import { SeverityBadge } from "@/components/status/SeverityBadge";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bell,
  CheckCircle,
  Volume2,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Severity = "critical" | "major" | "minor" | "warning" | "info";
type Status =
  | "triggered"
  | "unconfirmed"
  | "confirmed"
  | "processing"
  | "recovered"
  | "closed"
  | "silenced";

const SEVERITY_OPTIONS: Severity[] = [
  "critical",
  "major",
  "minor",
  "warning",
  "info",
];
const STATUS_OPTIONS: Status[] = [
  "triggered",
  "unconfirmed",
  "confirmed",
  "processing",
  "recovered",
  "silenced",
  "closed",
];

function formatDuration(firstSeen: string, lastSeen: string): string {
  const ms =
    new Date(lastSeen).getTime() - new Date(firstSeen).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

export default function AlertCenter() {
  const { t } = useTranslation();
  const [, params] = useRoute("/alerts/:sub?");
  // If navigated with sub-path, render AlertDetail instead
  const isDetail = params?.sub && params.sub !== "";

  const [page, setPage] = useState(1);
  const [sevFilter, setSevFilter] = useState<Severity[]>([]);
  const [statusFilter, setStatusFilter] = useState<Status[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("alert");

  const kpiQuery = trpc.alert.getKpis.useQuery();
  const listQuery = trpc.alert.list.useQuery({
    page,
    pageSize: 20,
    filter: {
      ...(sevFilter.length === 1 ? { severity: sevFilter[0] } : {}),
      ...(statusFilter.length === 1 ? { status: statusFilter[0] } : {}),
      ...(search ? { search } : {}),
    },
  });

  const kpis = kpiQuery.data;
  const alerts = listQuery.data;

  const kpiCards = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: "Critical",
        value: kpis.critical,
        status: (kpis.critical > 0 ? "critical" : "normal") as
          | "critical"
          | "normal",
      },
      {
        label: "Major",
        value: kpis.major,
        status: (kpis.major > 0 ? "warning" : "normal") as
          | "warning"
          | "normal",
      },
      { label: "Minor", value: kpis.minor, status: "normal" as const },
      {
        label: "Warning",
        value: kpis.warning,
        status: "normal" as const,
      },
      {
        label: t("alert.unconfirmed"),
        value: kpis.unconfirmed,
        status: (kpis.unconfirmed > 0 ? "warning" : "normal") as
          | "warning"
          | "normal",
      },
    ];
  }, [kpis, t]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("alert.title")}</h1>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpiQuery.isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          : kpiCards.map((k) => (
              <KpiCard
                key={k.label}
                title={k.label}
                value={k.value}
                status={k.status}
                onClick={() => setSevFilter([])}
              />
            ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />

        {/* Severity toggles */}
        <div className="flex gap-1">
          {SEVERITY_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() =>
                setSevFilter((prev) =>
                  prev.includes(s)
                    ? prev.filter((x) => x !== s)
                    : [...prev, s],
                )
              }
              className="px-0"
            >
              <SeverityBadge
                severity={s}
                size="sm"
                className={
                  sevFilter.includes(s)
                    ? "ring-2 ring-primary ring-offset-1"
                    : "opacity-50"
                }
              />
            </button>
          ))}
        </div>

        <span className="text-muted-foreground">|</span>

        {/* Status toggles */}
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() =>
                setStatusFilter((prev) =>
                  prev.includes(s)
                    ? prev.filter((x) => x !== s)
                    : [...prev, s],
                )
              }
              className="px-0"
            >
              <StatusBadge
                status={s}
                size="sm"
                className={
                  statusFilter.includes(s)
                    ? "ring-2 ring-primary ring-offset-1"
                    : "opacity-50"
                }
              />
            </button>
          ))}
        </div>

        <span className="text-muted-foreground">|</span>

        {/* Search */}
        <input
          type="text"
          placeholder={t("alert.name") + "..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Group tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="alert">{t("alert.byAlert")}</TabsTrigger>
          <TabsTrigger value="device">{t("alert.byDevice")}</TabsTrigger>
          <TabsTrigger value="site">{t("alert.bySite")}</TabsTrigger>
        </TabsList>

        <TabsContent value="alert" className="mt-4">
          <AlertTable
            alerts={alerts?.data ?? []}
            loading={listQuery.isLoading}
            t={t}
          />
        </TabsContent>
        <TabsContent value="device" className="mt-4">
          <AlertTable
            alerts={alerts?.data ?? []}
            loading={listQuery.isLoading}
            t={t}
            groupBy="device"
          />
        </TabsContent>
        <TabsContent value="site" className="mt-4">
          <AlertTable
            alerts={alerts?.data ?? []}
            loading={listQuery.isLoading}
            t={t}
            groupBy="site"
          />
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {alerts && alerts.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {alerts.total} {t("alert.name").toLowerCase()}s
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {page} / {alerts.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= alerts.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Alert Table ────────────────────────────────────────────────────────

interface AlertRow {
  id: string;
  name: string;
  description: string | null;
  severity: string;
  status: string;
  deviceId: string | null;
  siteId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  repeatCount: number;
  responsibleUserName: string | null;
  deviceName: string | null;
  siteName: string | null;
}

function AlertTable({
  alerts,
  loading,
  t,
  groupBy,
}: {
  alerts: AlertRow[];
  loading: boolean;
  t: (key: string) => string;
  groupBy?: "device" | "site";
}) {
  const acknowledge = trpc.alert.acknowledge.useMutation();
  const utils = trpc.useUtils();

  const handleAcknowledge = async (id: string) => {
    await acknowledge.mutateAsync({ id });
    utils.alert.list.invalidate();
    utils.alert.getKpis.invalidate();
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded" />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Bell className="h-12 w-12 mb-3 opacity-40" />
        <p>{t("alert.noAlerts")}</p>
      </div>
    );
  }

  // Group by device or site if requested
  const grouped = groupBy
    ? Object.entries(
        alerts.reduce<Record<string, AlertRow[]>>((acc, alert) => {
          const key =
            groupBy === "device"
              ? (alert.deviceName ?? "Unknown Device")
              : (alert.siteName ?? "Unknown Site");
          if (!acc[key]) acc[key] = [];
          acc[key].push(alert);
          return acc;
        }, {}),
      )
    : null;

  if (grouped) {
    return (
      <div className="space-y-6">
        {grouped.map(([group, rows]) => (
          <div key={group}>
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
              {group}{" "}
              <Badge variant="secondary" className="ml-1">
                {rows.length}
              </Badge>
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("alert.severity")}</TableHead>
                  <TableHead>{t("alert.status")}</TableHead>
                  <TableHead>{t("alert.name")}</TableHead>
                  <TableHead>{t("alert.lastSeen")}</TableHead>
                  <TableHead>{t("alert.duration")}</TableHead>
                  <TableHead>{t("alert.repeatCount")}</TableHead>
                  <TableHead>{t("alert.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <SeverityBadge severity={alert.severity} size="sm" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={alert.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/alerts/${alert.id}`}
                        className="font-medium hover:underline"
                      >
                        {alert.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(alert.lastSeenAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDuration(alert.firstSeenAt, alert.lastSeenAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      {alert.repeatCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(alert.status === "unconfirmed" ||
                          alert.status === "triggered") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledge.isPending}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Link href={`/alerts/${alert.id}`}>
                          <Button variant="ghost" size="sm">
                            <Bell className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("alert.severity")}</TableHead>
          <TableHead>{t("alert.status")}</TableHead>
          <TableHead>{t("alert.name")}</TableHead>
          <TableHead>{t("alert.object")}</TableHead>
          <TableHead>{t("alert.site")}</TableHead>
          <TableHead>{t("alert.lastSeen")}</TableHead>
          <TableHead>{t("alert.duration")}</TableHead>
          <TableHead>{t("alert.repeatCount")}</TableHead>
          <TableHead>{t("alert.responsible")}</TableHead>
          <TableHead>{t("alert.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => (
          <TableRow key={alert.id}>
            <TableCell>
              <SeverityBadge severity={alert.severity} size="sm" />
            </TableCell>
            <TableCell>
              <StatusBadge status={alert.status} size="sm" />
            </TableCell>
            <TableCell>
              <Link
                href={`/alerts/${alert.id}`}
                className="font-medium hover:underline"
              >
                {alert.name}
              </Link>
            </TableCell>
            <TableCell className="text-sm">
              {alert.deviceName ?? "—"}
            </TableCell>
            <TableCell className="text-sm">
              {alert.siteName ?? "—"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(alert.lastSeenAt).toLocaleString()}
            </TableCell>
            <TableCell className="text-xs">
              {formatDuration(alert.firstSeenAt, alert.lastSeenAt)}
            </TableCell>
            <TableCell className="text-center">{alert.repeatCount}</TableCell>
            <TableCell className="text-sm">
              {alert.responsibleUserName ?? "—"}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {(alert.status === "unconfirmed" ||
                  alert.status === "triggered") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={acknowledge.isPending}
                    title={t("alert.acknowledge")}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
                <Link href={`/alerts/${alert.id}`}>
                  <Button variant="ghost" size="sm" title={t("alert.detail")}>
                    <Bell className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
