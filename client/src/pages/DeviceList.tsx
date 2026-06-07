import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "@/components/status/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";

type DeviceListItem = {
  id: string;
  name: string;
  ipAddress: string;
  deviceType: string;
  vendor: string | null;
  model: string | null;
  osVersion: string | null;
  status: string;
  siteId: string | null;
  siteName: string | null;
  lastCollectionAt: string | null;
  lastResponseMs: number | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export default function DeviceList() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  // ── Filter state ─────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // ── Dialog state ─────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: "",
    ipAddress: "",
    deviceType: "switch" as const,
    vendor: "",
    model: "",
  });

  // ── Queries ──────────────────────────────────────────────────────
  const sitesQuery = trpc.device.getSites.useQuery();

  const filter = useMemo(
    () => ({
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(deviceTypeFilter !== "all" ? { deviceType: deviceTypeFilter } : {}),
      ...(siteFilter !== "all" ? { siteId: siteFilter } : {}),
      ...(searchTerm ? { search: searchTerm } : {}),
    }),
    [statusFilter, deviceTypeFilter, siteFilter, searchTerm],
  );

  const sort = useMemo(
    () =>
      sorting.length > 0
        ? { field: sorting[0]!.id, direction: (sorting[0]!.desc ? "desc" : "asc") as "asc" | "desc" }
        : undefined,
    [sorting],
  );

  const devicesQuery = trpc.device.list.useQuery({
    page,
    pageSize: 20,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    sort,
  });

  const createMutation = trpc.device.create.useMutation({
    onSuccess: () => {
      devicesQuery.refetch();
      setDialogOpen(false);
      setNewDevice({ name: "", ipAddress: "", deviceType: "switch", vendor: "", model: "" });
    },
  });

  // ── Table columns ────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<DeviceListItem>[]>(
    () => [
      {
        accessorKey: "status",
        header: t("device.status"),
        size: 100,
        cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
      },
      {
        accessorKey: "name",
        header: t("device.deviceName"),
        cell: ({ row }) => (
          <button
            className="text-left font-medium text-primary hover:underline"
            onClick={() => setLocation(`/devices/${row.original.id}`)}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: "ipAddress",
        header: t("device.ipAddress"),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.ipAddress}</span>
        ),
      },
      {
        accessorKey: "siteName",
        header: t("device.site"),
        cell: ({ row }) =>
          row.original.siteName ? (
            <Badge variant="secondary">{row.original.siteName}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "deviceType",
        header: t("device.deviceType"),
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.deviceType}</Badge>
        ),
      },
      {
        id: "vendorModel",
        header: `${t("device.vendor")} / ${t("device.model")}`,
        cell: ({ row }) => {
          const parts = [row.original.vendor, row.original.model].filter(Boolean);
          return parts.length > 0 ? parts.join(" ") : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: "lastCollectionAt",
        header: t("device.lastCollection"),
        cell: ({ row }) => {
          if (!row.original.lastCollectionAt) return <span className="text-muted-foreground">—</span>;
          const date = new Date(row.original.lastCollectionAt);
          return <span className="text-sm text-muted-foreground">{formatRelativeTime(date)}</span>;
        },
      },
      {
        id: "actions",
        header: "",
        size: 50,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocation(`/devices/${row.original.id}`)}>
                {t("device.overview")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, setLocation],
  );

  const table = useReactTable({
    data: devicesQuery.data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    manualSorting: true,
    manualPagination: true,
    pageCount: devicesQuery.data?.totalPages ?? 0,
  });

  // ── Search handler ───────────────────────────────────────────────
  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  // ── Create handler ───────────────────────────────────────────────
  const handleCreate = () => {
    createMutation.mutate(newDevice);
  };

  // ── Render ───────────────────────────────────────────────────────
  const isLoading = devicesQuery.isLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("device.title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              {t("device.addDevice")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("device.addDevice")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("device.deviceName")}</label>
                <Input
                  value={newDevice.name}
                  onChange={(e) => setNewDevice((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Switch-01"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("device.ipAddress")}</label>
                <Input
                  value={newDevice.ipAddress}
                  onChange={(e) => setNewDevice((p) => ({ ...p, ipAddress: e.target.value }))}
                  placeholder="192.168.1.1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("device.deviceType")}</label>
                <Select
                  value={newDevice.deviceType}
                  onValueChange={(v) =>
                    setNewDevice((p) => ({ ...p, deviceType: v as typeof newDevice.deviceType }))
                  }
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
                  value={newDevice.vendor}
                  onChange={(e) => setNewDevice((p) => ({ ...p, vendor: e.target.value }))}
                  placeholder="Alcatel-Lucent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("device.model")}</label>
                <Input
                  value={newDevice.model}
                  onChange={(e) => setNewDevice((p) => ({ ...p, model: e.target.value }))}
                  placeholder="OS6860"
                />
              </div>
              <Button onClick={handleCreate} disabled={createMutation.isPending} className="mt-2">
                {createMutation.isPending ? "..." : t("device.addDevice")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={`${t("device.deviceName")} / IP`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("device.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("device.status")}</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>

        <Select value={siteFilter} onValueChange={(v) => { setSiteFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("device.site")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("device.site")}</SelectItem>
            {sitesQuery.data?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={deviceTypeFilter} onValueChange={(v) => { setDeviceTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder={t("device.deviceType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("device.deviceType")}</SelectItem>
            <SelectItem value="switch">Switch</SelectItem>
            <SelectItem value="router">Router</SelectItem>
            <SelectItem value="firewall">Firewall</SelectItem>
            <SelectItem value="ap">AP</SelectItem>
            <SelectItem value="server">Server</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: " ↑",
                      desc: " ↓",
                    }[header.column.getIsSorted() as string] ?? null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-muted-foreground">{t("device.noDevices")}</span>
                    <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                      {t("device.addFirst")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {devicesQuery.data && devicesQuery.data.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t("device.title")} {devicesQuery.data.total} — {devicesQuery.data.page}/{devicesQuery.data.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= devicesQuery.data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </Button>
          </div>
        </div>
      )}
    </div>
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
