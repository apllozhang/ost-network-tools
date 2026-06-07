import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ToolResult from "@/components/tools/ToolResult";

// ── Types ──────────────────────────────────────────────────────

interface PingResult {
  success: boolean;
  target: string;
  packets_sent: number;
  packets_received: number;
  packet_loss_rate: number;
  latency_ms: number | null;
  min_ms: number | null;
  max_ms: number | null;
  jitter_ms: number | null;
  raw_output: string;
  error: string | null;
}

interface TcpResult {
  success: boolean;
  target: string;
  port: number;
  connect_ms: number | null;
  error: string | null;
}

interface HttpResult {
  success: boolean;
  url: string;
  status_code: number | null;
  response_ms: number | null;
  content_length: number | null;
  error: string | null;
}

interface DnsResult {
  success: boolean;
  hostname: string;
  record_type: string;
  addresses: string[];
  error: string | null;
}

interface TracerouteResult {
  success: boolean;
  target: string;
  hops: Array<{
    hop: number;
    ip: string | null;
    latency_ms: number | null;
    hostname: string | null;
  }>;
  total_hops: number;
  raw_output: string;
  error: string | null;
}

type ToolResultData =
  | { type: "ping"; data: PingResult }
  | { type: "tcp"; data: TcpResult }
  | { type: "http"; data: HttpResult }
  | { type: "dns"; data: DnsResult }
  | { type: "traceroute"; data: TracerouteResult };

// ── Save as Monitor Dialog ─────────────────────────────────────

function SaveMonitorDialog({
  target,
  targetType,
  onClose,
}: {
  target: string;
  targetType: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [deviceId, setDeviceId] = useState("");
  const [interval, setInterval] = useState("60");
  const devices = trpc.device.list.useQuery({ page: 1, pageSize: 200 });
  const createMonitor = trpc.monitor.create.useMutation();

  const handleSave = async () => {
    if (!deviceId) return;
    await createMonitor.mutateAsync({
      deviceId,
      targetType: targetType as "ping" | "tcp" | "http" | "dns" | "snmp",
      target,
      intervalSeconds: Number(interval),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">{t("tools.saveAsMonitor")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("tools.target")}</Label>
            <Input value={target} disabled />
          </div>
          <div className="space-y-2">
            <Label>Device</Label>
            <Select value={deviceId} onValueChange={setDeviceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {devices.data?.data.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.ipAddress})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Interval (s)</Label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">60s</SelectItem>
                <SelectItem value="120">120s</SelectItem>
                <SelectItem value="300">300s</SelectItem>
                <SelectItem value="600">600s</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!deviceId || createMonitor.isPending}>
              {createMonitor.isPending ? "..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Metric helpers ─────────────────────────────────────────────

function getPingMetrics(r: PingResult) {
  const lossStatus = r.packet_loss_rate === 0 ? "normal" as const : r.packet_loss_rate < 0.1 ? "warning" as const : "critical" as const;
  const latStatus = r.latency_ms === null ? undefined : r.latency_ms < 50 ? "normal" as const : r.latency_ms < 200 ? "warning" as const : "critical" as const;
  return [
    { label: "Latency", value: r.latency_ms !== null ? `${r.latency_ms} ms` : "N/A", status: latStatus },
    { label: "Packet Loss", value: `${(r.packet_loss_rate * 100).toFixed(1)}%`, status: lossStatus },
    { label: "Min", value: r.min_ms !== null ? `${r.min_ms} ms` : "N/A" },
    { label: "Max", value: r.max_ms !== null ? `${r.max_ms} ms` : "N/A" },
    { label: "Jitter", value: r.jitter_ms !== null ? `${r.jitter_ms} ms` : "N/A" },
    { label: "Packets", value: `${r.packets_received}/${r.packets_sent}` },
  ];
}

function getTcpMetrics(r: TcpResult) {
  return [
    { label: "Connect Time", value: r.connect_ms !== null ? `${r.connect_ms} ms` : "N/A", status: r.success ? "normal" as const : "critical" as const },
    { label: "Target", value: `${r.target}:${r.port}` },
  ];
}

function getHttpMetrics(r: HttpResult) {
  return [
    { label: "Status Code", value: r.status_code !== null ? String(r.status_code) : "N/A", status: r.status_code && r.status_code < 400 ? "normal" as const : "critical" as const },
    { label: "Response Time", value: r.response_ms !== null ? `${r.response_ms} ms` : "N/A" },
    { label: "Content Length", value: r.content_length !== null ? `${r.content_length} B` : "N/A" },
  ];
}

function getDnsMetrics(r: DnsResult) {
  return [
    { label: "Record Type", value: r.record_type },
    { label: "Addresses", value: r.addresses.length > 0 ? r.addresses.join(", ") : "None" },
  ];
}

function getTracerouteMetrics(r: TracerouteResult) {
  return [
    { label: "Total Hops", value: String(r.total_hops) },
    { label: "Target", value: r.target },
  ];
}

// ── Tool Forms ─────────────────────────────────────────────────

function PingForm({ onResult }: { onResult: (r: ToolResultData) => void }) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [count, setCount] = useState("4");
  const [timeout, setTimeout_] = useState("5");
  const ping = trpc.tools.ping.useMutation();

  const handleExecute = async () => {
    if (!target) return;
    try {
      const data = await ping.mutateAsync({
        target,
        count: Number(count),
        timeout: Number(timeout),
      });
      onResult({ type: "ping", data: data as PingResult });
    } catch {
      // error shown via ping.isError / ping.error
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>{t("tools.target")}</Label>
          <Input
            placeholder="8.8.8.8"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("tools.count")}</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("tools.timeout")} (s)</Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={timeout}
            onChange={(e) => setTimeout_(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={handleExecute} disabled={!target || ping.isPending}>
        {ping.isPending ? t("tools.executing") : t("tools.execute")}
      </Button>
      {ping.isError && (
        <p className="text-sm text-red-600">{ping.error.message}</p>
      )}
    </div>
  );
}

function TcpForm({ onResult }: { onResult: (r: ToolResultData) => void }) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [port, setPort] = useState("80");
  const [timeout, setTimeout_] = useState("5");
  const tcpCheck = trpc.tools.tcpCheck.useMutation();

  const handleExecute = async () => {
    if (!target || !port) return;
    try {
      const data = await tcpCheck.mutateAsync({
        target,
        port: Number(port),
        timeout: Number(timeout),
      });
      onResult({ type: "tcp", data: data as TcpResult });
    } catch {
      // error shown via tcpCheck.isError
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>{t("tools.target")}</Label>
          <Input
            placeholder="8.8.8.8"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("tools.port")}</Label>
          <Input
            type="number"
            min={1}
            max={65535}
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("tools.timeout")} (s)</Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={timeout}
            onChange={(e) => setTimeout_(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={handleExecute} disabled={!target || tcpCheck.isPending}>
        {tcpCheck.isPending ? t("tools.executing") : t("tools.execute")}
      </Button>
      {tcpCheck.isError && (
        <p className="text-sm text-red-600">{tcpCheck.error.message}</p>
      )}
    </div>
  );
}

function HttpForm({ onResult }: { onResult: (r: ToolResultData) => void }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState("");
  const [timeout, setTimeout_] = useState("10");
  const httpCheck = trpc.tools.httpCheck.useMutation();

  const handleExecute = async () => {
    if (!url) return;
    try {
      const data = await httpCheck.mutateAsync({
        url,
        timeout: Number(timeout),
      });
      onResult({ type: "http", data: data as HttpResult });
    } catch {
      // error shown via httpCheck.isError
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("tools.url")}</Label>
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("tools.timeout")} (s)</Label>
          <Input
            type="number"
            min={1}
            max={60}
            value={timeout}
            onChange={(e) => setTimeout_(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={handleExecute} disabled={!url || httpCheck.isPending}>
        {httpCheck.isPending ? t("tools.executing") : t("tools.execute")}
      </Button>
      {httpCheck.isError && (
        <p className="text-sm text-red-600">{httpCheck.error.message}</p>
      )}
    </div>
  );
}

function DnsForm({ onResult }: { onResult: (r: ToolResultData) => void }) {
  const { t } = useTranslation();
  const [hostname, setHostname] = useState("");
  const [recordType, setRecordType] = useState("A");
  const dnsLookup = trpc.tools.dnsLookup.useMutation();

  const handleExecute = async () => {
    if (!hostname) return;
    try {
      const data = await dnsLookup.mutateAsync({ hostname, recordType });
      onResult({ type: "dns", data: data as DnsResult });
    } catch {
      // error shown via dnsLookup.isError
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("tools.hostname")}</Label>
          <Input
            placeholder="example.com"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("tools.recordType")}</Label>
          <Select value={recordType} onValueChange={setRecordType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="AAAA">AAAA</SelectItem>
              <SelectItem value="CNAME">CNAME</SelectItem>
              <SelectItem value="MX">MX</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleExecute} disabled={!hostname || dnsLookup.isPending}>
        {dnsLookup.isPending ? t("tools.executing") : t("tools.execute")}
      </Button>
      {dnsLookup.isError && (
        <p className="text-sm text-red-600">{dnsLookup.error.message}</p>
      )}
    </div>
  );
}

function TracerouteForm({ onResult }: { onResult: (r: ToolResultData) => void }) {
  const { t } = useTranslation();
  const [target, setTarget] = useState("");
  const [maxHops, setMaxHops] = useState("30");
  const [timeout, setTimeout_] = useState("5");
  const traceroute = trpc.tools.traceroute.useMutation();

  const handleExecute = async () => {
    if (!target) return;
    try {
      const data = await traceroute.mutateAsync({
        target,
        maxHops: Number(maxHops),
        timeout: Number(timeout),
      });
      onResult({ type: "traceroute", data: data as TracerouteResult });
    } catch {
      // error shown via traceroute.isError
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>{t("tools.target")}</Label>
          <Input
            placeholder="8.8.8.8"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("tools.maxHops")}</Label>
          <Input
            type="number"
            min={1}
            max={64}
            value={maxHops}
            onChange={(e) => setMaxHops(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("tools.timeout")} (s)</Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={timeout}
            onChange={(e) => setTimeout_(e.target.value)}
          />
        </div>
      </div>
      <Button onClick={handleExecute} disabled={!target || traceroute.isPending}>
        {traceroute.isPending ? t("tools.executing") : t("tools.execute")}
      </Button>
      {traceroute.isError && (
        <p className="text-sm text-red-600">{traceroute.error.message}</p>
      )}
    </div>
  );
}

// ── Result Renderer ────────────────────────────────────────────

function ResultDisplay({
  result,
  onSaveMonitor,
}: {
  result: ToolResultData | null;
  onSaveMonitor: (target: string, type: string) => void;
}) {
  const { t } = useTranslation();

  if (!result) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t("tools.noResults")}
      </div>
    );
  }

  switch (result.type) {
    case "ping": {
      const r = result.data;
      return (
        <ToolResult
          success={r.success}
          metrics={getPingMetrics(r)}
          rawOutput={r.raw_output}
          onSaveAsMonitor={r.success ? () => onSaveMonitor(r.target, "ping") : undefined}
        />
      );
    }
    case "tcp": {
      const r = result.data;
      return (
        <ToolResult
          success={r.success}
          metrics={getTcpMetrics(r)}
          onSaveAsMonitor={r.success ? () => onSaveMonitor(r.target, "tcp") : undefined}
        />
      );
    }
    case "http": {
      const r = result.data;
      return (
        <ToolResult
          success={r.success}
          metrics={getHttpMetrics(r)}
          onSaveAsMonitor={r.success ? () => onSaveMonitor(r.url, "http") : undefined}
        />
      );
    }
    case "dns": {
      const r = result.data;
      return (
        <ToolResult
          success={r.success}
          metrics={getDnsMetrics(r)}
          onSaveAsMonitor={r.success ? () => onSaveMonitor(r.hostname, "dns") : undefined}
        />
      );
    }
    case "traceroute": {
      const r = result.data;
      return (
        <ToolResult
          success={r.success}
          metrics={getTracerouteMetrics(r)}
          rawOutput={r.raw_output}
          onSaveAsMonitor={r.success ? () => onSaveMonitor(r.target, "traceroute") : undefined}
        />
      );
    }
  }
}

// ── Main Page ──────────────────────────────────────────────────

export default function NetworkTools() {
  const { t } = useTranslation();
  const [result, setResult] = useState<ToolResultData | null>(null);
  const [saveDialog, setSaveDialog] = useState<{
    target: string;
    type: string;
  } | null>(null);

  const handleSaveMonitor = (target: string, type: string) => {
    setSaveDialog({ target, type });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("tools.title")}</h1>

      <Tabs defaultValue="ping">
        <TabsList>
          <TabsTrigger value="ping">{t("tools.ping")}</TabsTrigger>
          <TabsTrigger value="tcp">{t("tools.tcp")}</TabsTrigger>
          <TabsTrigger value="http">{t("tools.http")}</TabsTrigger>
          <TabsTrigger value="dns">{t("tools.dns")}</TabsTrigger>
          <TabsTrigger value="traceroute">{t("tools.traceroute")}</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="ping">
            <PingForm onResult={setResult} />
          </TabsContent>
          <TabsContent value="tcp">
            <TcpForm onResult={setResult} />
          </TabsContent>
          <TabsContent value="http">
            <HttpForm onResult={setResult} />
          </TabsContent>
          <TabsContent value="dns">
            <DnsForm onResult={setResult} />
          </TabsContent>
          <TabsContent value="traceroute">
            <TracerouteForm onResult={setResult} />
          </TabsContent>
        </div>
      </Tabs>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">{t("tools.results")}</h2>
        <ResultDisplay result={result} onSaveMonitor={handleSaveMonitor} />
      </div>

      {saveDialog && (
        <SaveMonitorDialog
          target={saveDialog.target}
          targetType={saveDialog.type}
          onClose={() => setSaveDialog(null)}
        />
      )}
    </div>
  );
}
