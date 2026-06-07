import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/status/StatusBadge";
import { KpiCard } from "@/components/cards/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, RefreshCw, Pencil, Trash2 } from "lucide-react";

interface DeviceDetailProps {
  id: string;
}

export default function DeviceDetail({ id }: DeviceDetailProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  const deviceQuery = trpc.device.getById.useQuery({ id });
  const collectMutation = trpc.device.collect.useMutation({
    onSuccess: () => deviceQuery.refetch(),
  });
  const updateMutation = trpc.device.update.useMutation({
    onSuccess: () => deviceQuery.refetch(),
  });
  const sitesQuery = trpc.device.getSites.useQuery(undefined, {
    enabled: activeTab === "settings",
  });

  const device = deviceQuery.data;

  // ── Edit form state ──────────────────────────────────────────────
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editLoaded, setEditLoaded] = useState(false);

  if (!editLoaded && device) {
    setEditForm({
      name: device.name ?? "",
      siteId: device.siteId ?? "",
      deviceType: device.deviceType ?? "switch",
      vendor: device.vendor ?? "",
      model: device.model ?? "",
      role: device.role ?? "",
    });
    setEditLoaded(true);
  }

  // ── Handlers ─────────────────────────────────────────────────────
  const handleCopyIp = () => {
    if (device?.ipAddress) {
      navigator.clipboard.writeText(device.ipAddress);
    }
  };

  const handleCollect = () => {
    collectMutation.mutate({ id });
  };

  const handleSaveSettings = () => {
    updateMutation.mutate({
      id,
      name: editForm.name || undefined,
      siteId: editForm.siteId || null,
      deviceType: editForm.deviceType as "switch" | "router" | "firewall" | "ap" | "server" | "other" | undefined,
      vendor: editForm.vendor || null,
      model: editForm.model || null,
      role: editForm.role || null,
    });
  };

  // ── Loading ──────────────────────────────────────────────────────
  if (deviceQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Device not found
      </div>
    );
  }

  const metrics = device.latestMetrics;

  return (
    <div className="space-y-6">
      {/* Device Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{device.name}</h1>
            <StatusBadge status={device.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-mono">{device.ipAddress}</span>
              <button onClick={handleCopyIp} className="hover:text-foreground transition-colors">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </span>
            {device.siteName && <Badge variant="secondary">{device.siteName}</Badge>}
            <Badge variant="outline">{device.deviceType}</Badge>
            {device.role && <span>{device.role}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCollect}
            disabled={collectMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${collectMutation.isPending ? "animate-spin" : ""}`} />
            {collectMutation.isPending ? t("device.collecting") : t("device.collect")}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          title={t("device.availability")}
          value={device.status === "healthy" ? "100" : device.status === "offline" ? "0" : "—"}
          unit="%"
          status={device.status === "healthy" ? "normal" : device.status === "offline" ? "critical" : "unknown"}
        />
        <KpiCard
          title={t("device.cpu")}
          value={metrics?.cpuUsage ? Number(metrics.cpuUsage).toFixed(1) : "—"}
          unit={metrics?.cpuUsage ? "%" : undefined}
          status={metrics?.cpuUsage && Number(metrics.cpuUsage) > 80 ? "warning" : "normal"}
        />
        <KpiCard
          title={t("device.memory")}
          value={metrics?.memoryUsage ? Number(metrics.memoryUsage).toFixed(1) : "—"}
          unit={metrics?.memoryUsage ? "%" : undefined}
          status={metrics?.memoryUsage && Number(metrics.memoryUsage) > 80 ? "warning" : "normal"}
        />
        <KpiCard
          title={t("device.temperature")}
          value={metrics?.temperature ? Number(metrics.temperature).toFixed(1) : "—"}
          unit={metrics?.temperature ? "°C" : undefined}
          status="normal"
        />
        <KpiCard
          title={t("device.uptime")}
          value={device.uptime ?? "—"}
          status="normal"
        />
        <KpiCard
          title={t("device.lastCollection")}
          value={
            device.lastCollectionAt
              ? formatRelativeTime(new Date(device.lastCollectionAt))
              : "—"
          }
          status="normal"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("device.overview")}</TabsTrigger>
          <TabsTrigger value="metrics">{t("device.metrics")}</TabsTrigger>
          <TabsTrigger value="alerts">{t("device.alerts")}</TabsTrigger>
          <TabsTrigger value="collection">{t("device.collection")}</TabsTrigger>
          <TabsTrigger value="settings">{t("device.settings")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard label={t("device.vendor")} value={device.vendor} />
            <InfoCard label={t("device.model")} value={device.model} />
            <InfoCard label={t("device.serialNumber")} value={device.serialNumber} />
            <InfoCard label={t("device.osVersion")} value={device.osVersion} />
            <InfoCard label="MAC" value={device.macAddress} />
            <InfoCard label={t("device.uptime")} value={device.uptime} />
            <InfoCard
              label={t("device.lastCollection")}
              value={
                device.lastCollectionAt
                  ? new Date(device.lastCollectionAt).toLocaleString()
                  : undefined
              }
            />
            <InfoCard
              label="Response"
              value={device.lastResponseMs != null ? `${device.lastResponseMs}ms` : undefined}
            />
            {device.tags && device.tags.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tags</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1">
                  {device.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          {metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title={t("device.cpu")} value={metrics.cpuUsage ? Number(metrics.cpuUsage).toFixed(1) : "—"} unit="%" />
              <KpiCard title={t("device.memory")} value={metrics.memoryUsage ? Number(metrics.memoryUsage).toFixed(1) : "—"} unit="%" />
              <KpiCard title={t("device.temperature")} value={metrics.temperature ? Number(metrics.temperature).toFixed(1) : "—"} unit="°C" />
              <KpiCard
                title="Ports"
                value={metrics.onlinePorts != null && metrics.totalPorts != null ? `${metrics.onlinePorts}/${metrics.totalPorts}` : "—"}
              />
              <KpiCard
                title="Interface Errors"
                value={metrics.interfaceErrors?.toString() ?? "—"}
              />
              <KpiCard
                title={t("device.lastCollection")}
                value={new Date(metrics.collectedAt).toLocaleString()}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
                No metrics available. Trigger a collection to fetch data.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
              Alerts for this device will appear here
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collection Tab */}
        <TabsContent value="collection">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("device.collection")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("device.lastCollection")}:</span>{" "}
                  <span className="font-medium">
                    {device.lastCollectionAt
                      ? new Date(device.lastCollectionAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Response Time:</span>{" "}
                  <span className="font-medium">
                    {device.lastResponseMs != null ? `${device.lastResponseMs}ms` : "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCollect}
                  disabled={collectMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 ${collectMutation.isPending ? "animate-spin" : ""}`} />
                  {collectMutation.isPending ? t("device.collecting") : t("device.collect")}
                </Button>
              </div>

              <div className="border-t pt-4">
                <CollectionIntervalSetting />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("device.editDevice")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("device.deviceName")}</label>
                  <Input
                    value={editForm.name ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("device.site")}</label>
                  <Select
                    value={editForm.siteId ?? "none"}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, siteId: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {sitesQuery.data?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("device.deviceType")}</label>
                  <Select
                    value={editForm.deviceType ?? "switch"}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, deviceType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="switch">Switch</SelectItem>
                      <SelectItem value="router">Router</SelectItem>
                      <SelectItem value="firewall">Firewall</SelectItem>
                      <SelectItem value="ap">AP</SelectItem>
                      <SelectItem value="server">Server</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("device.vendor")}</label>
                  <Input
                    value={editForm.vendor ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, vendor: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("device.model")}</label>
                  <Input
                    value={editForm.model ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("device.role")}</label>
                  <Input
                    value={editForm.role ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  />
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={updateMutation.isPending}>
                <Pencil className="h-4 w-4" />
                {updateMutation.isPending ? "..." : t("device.editDevice")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-sm font-medium">{value ?? "—"}</span>
      </CardContent>
    </Card>
  );
}

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

function CollectionIntervalSetting() {
  const intervalQuery = trpc.device.getCollectInterval.useQuery();
  const setIntervalMut = trpc.device.setCollectInterval.useMutation({
    onSuccess: () => intervalQuery.refetch(),
  });

  const current = intervalQuery.data?.interval ?? 30;
  const [draft, setDraft] = useState<string>(String(current));
  const [loaded, setLoaded] = useState(false);

  if (!loaded && intervalQuery.data) {
    setDraft(String(current));
    setLoaded(true);
  }

  const handleSave = () => {
    const val = parseInt(draft, 10);
    if (isNaN(val) || val < 5 || val > 3600) return;
    setIntervalMut.mutate({ interval: val });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Auto-Collection Interval</h3>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={5}
          max={3600}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">seconds</span>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={setIntervalMut.isPending || draft === String(current)}
        >
          Apply
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Range: 5–3600s. Changes take effect immediately.
      </p>
    </div>
  );
}
