import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { KpiCard } from "@/components/cards/KpiCard";
import { SeverityBadge } from "@/components/status/SeverityBadge";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Monitor,
  Wifi,
  AlertTriangle,
  Clock,
  Activity,
  Target,
  ArrowRight,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  healthy: "#22c55e",
  warning: "#eab308",
  critical: "#ef4444",
  offline: "#6b7280",
  unknown: "#9ca3af",
  maintenance: "#3b82f6",
};

export default function EnterpriseDashboard() {
  const { t } = useTranslation();

  const kpiQuery = trpc.dashboard.getKpis.useQuery();
  const criticalQuery = trpc.dashboard.getCriticalAlerts.useQuery();
  const trendQuery = trpc.dashboard.getHealthTrend.useQuery();
  const slowQuery = trpc.dashboard.getSlowDevices.useQuery();

  const kpis = kpiQuery.data;
  const criticalAlerts = criticalQuery.data ?? [];
  const healthTrend = trendQuery.data ?? [];
  const slowDevices = slowQuery.data ?? [];

  // Health distribution data for bar chart
  const healthData = kpis
    ? Object.entries(kpis.deviceByStatus).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        fill: STATUS_COLORS[status] ?? "#9ca3af",
      }))
    : [];

  // Health trend data for area chart
  const trendData = Array.isArray(healthTrend)
    ? healthTrend.map((row) => ({
        date: String(row.date ?? ""),
        device_count: Number(row.device_count ?? 0),
      }))
    : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <KpiCard
              title={t("dashboard.totalDevices")}
              value={kpis?.totalDevices ?? 0}
              status="normal"
            />
            <KpiCard
              title={t("dashboard.onlineDevices")}
              value={kpis?.onlineDevices ?? 0}
              unit=" "
              status={(kpis?.onlineDevices ?? 0) > 0 ? "normal" : "critical"}
            />
            <KpiCard
              title={t("dashboard.currentAlerts")}
              value={kpis?.totalAlerts ?? 0}
              status={
                (kpis?.alertBySeverity?.critical ?? 0) > 0
                  ? "critical"
                  : "normal"
              }
            />
            <KpiCard
              title={t("dashboard.avgLatency")}
              value={
                kpis?.avgLatency !== null
                  ? Math.round(kpis?.avgLatency ?? 0)
                  : "—"
              }
              unit="ms"
              status={
                (kpis?.avgLatency ?? 0) > 100 ? "warning" : "normal"
              }
            />
            <KpiCard
              title={t("dashboard.availability")}
              value={kpis?.availability ?? 0}
              unit="%"
              status={
                (kpis?.availability ?? 100) < 95 ? "critical" : "normal"
              }
            />
            <KpiCard
              title={t("dashboard.monitoredTargets")}
              value={kpis?.monitoredTargets ?? 0}
              status="normal"
            />
          </>
        )}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("dashboard.healthDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={healthData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                No device data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical alerts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {t("dashboard.criticalAlerts")}
              </CardTitle>
              <Link href="/alerts">
                <Button variant="ghost" size="sm">
                  {t("dashboard.viewAll")}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {criticalAlerts.length > 0 ? (
              <div className="space-y-3">
                {criticalAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={`/alerts/${alert.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <SeverityBadge
                      severity={alert.severity}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {alert.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.deviceName ?? "—"}{" "}
                        {alert.lastSeenAt
                          ? `· ${new Date(alert.lastSeenAt).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                    <StatusBadge status={alert.status} size="sm" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                <Monitor className="h-8 w-8 mr-2 opacity-40" />
                All clear
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("dashboard.healthTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(v) => {
                      const d = new Date(String(v));
                      return d.toLocaleDateString();
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="device_count"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No trend data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slow devices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {t("dashboard.slowDevices")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slowDevices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("dashboard.deviceName")}</TableHead>
                    <TableHead>{t("dashboard.responseTime")}</TableHead>
                    <TableHead>{t("alert.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <Link
                          href={`/devices/${device.id}`}
                          className="font-medium hover:underline text-sm"
                        >
                          {device.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span
                          className={
                            (device.lastResponseMs ?? 0) > 500
                              ? "text-red-500 font-semibold"
                              : (device.lastResponseMs ?? 0) > 200
                                ? "text-yellow-600"
                                : ""
                          }
                        >
                          {device.lastResponseMs}ms
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={device.status} size="sm" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
