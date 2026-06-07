import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { AuditActionBadge } from "@/components/audit/AuditActionBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ExpandIcon } from "lucide-react";

const ACTION_OPTIONS = [
  "login",
  "logout",
  "create",
  "update",
  "delete",
  "acknowledge",
  "close",
  "silence",
  "collect",
];

const OBJECT_TYPE_OPTIONS = ["device", "alert", "user", "monitor"];

export default function AuditLog() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [objectTypeFilter, setObjectTypeFilter] = useState<string>("all");
  const [searchUser, setSearchUser] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filter = {
    ...(actionFilter !== "all" ? { action: actionFilter } : {}),
    ...(objectTypeFilter !== "all" ? { objectType: objectTypeFilter } : {}),
    ...(searchUser ? { userId: searchUser } : {}),
  };

  const query = trpc.audit.list.useQuery({
    page,
    pageSize: 20,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  const data = query.data;

  const toggleExpand = (id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t("audit.title")}</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("audit.filterAction")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.filterAction")}</SelectItem>
            {ACTION_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {t(`audit.${a}`, a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={objectTypeFilter} onValueChange={(v) => { setObjectTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("audit.filterObjectType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("audit.filterObjectType")}</SelectItem>
            {OBJECT_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="User ID"
          value={searchUser}
          onChange={(e) => { setSearchUser(e.target.value); setPage(1); }}
          className="w-[200px]"
        />
      </div>

      {/* Table */}
      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded" />
          ))}
        </div>
      ) : !data?.data.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p>{t("audit.noEntries")}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>{t("audit.timestamp")}</TableHead>
              <TableHead>{t("audit.user")}</TableHead>
              <TableHead>{t("audit.action")}</TableHead>
              <TableHead>{t("audit.objectType")}</TableHead>
              <TableHead>{t("audit.objectId")}</TableHead>
              <TableHead>{t("audit.ipAddress")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((row) => {
              const hasDetails = row.beforeValue || row.afterValue;
              const isExpanded = expandedRow === row.id;

              return (
                <>
                  <TableRow key={row.id}>
                    <TableCell>
                      {hasDetails && (
                        <button onClick={() => toggleExpand(row.id)} className="p-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ExpandIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{row.username}</TableCell>
                    <TableCell>
                      <AuditActionBadge action={row.action} />
                    </TableCell>
                    <TableCell className="text-sm">{row.objectType}</TableCell>
                    <TableCell className="text-xs font-mono max-w-[120px] truncate">
                      {row.objectId ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.ipAddress ?? "—"}
                    </TableCell>
                  </TableRow>
                  {isExpanded && hasDetails && (
                    <TableRow key={`${row.id}-detail`}>
                      <TableCell colSpan={7} className="bg-muted/30">
                        <div className="grid grid-cols-2 gap-4 py-2 px-4">
                          {row.beforeValue && (
                            <div>
                              <p className="text-xs font-semibold mb-1">{t("audit.before")}</p>
                              <pre className="text-xs bg-background rounded p-2 overflow-auto max-h-48">
                                {JSON.stringify(row.beforeValue, null, 2)}
                              </pre>
                            </div>
                          )}
                          {row.afterValue && (
                            <div>
                              <p className="text-xs font-semibold mb-1">{t("audit.after")}</p>
                              <pre className="text-xs bg-background rounded p-2 overflow-auto max-h-48">
                                {JSON.stringify(row.afterValue, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {data.total} entries
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
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
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
