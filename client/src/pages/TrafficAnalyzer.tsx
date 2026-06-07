import { useState } from "react";
import { trpc } from "@/lib/trpc";

type Tab = "interfaces" | "mac" | "arp";

function DataTable({ rows }: { rows: Record<string, string>[] }) {
  if (rows.length === 0)
    return <p className="text-gray-500">No data available</p>;

  const columns = Object.keys(rows[0]!).filter((k) => !k.startsWith("_"));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-muted">
            {columns.map((col) => (
              <th
                key={col}
                className="border px-3 py-2 text-left font-medium"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:bg-muted">
              {columns.map((col) => (
                <td key={col} className="border px-3 py-2">
                  {row[col] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TrafficAnalyzer() {
  const [tab, setTab] = useState<Tab>("interfaces");

  const interfaces = trpc.traffic.getAllInterfaces.useQuery({}, {
    enabled: tab === "interfaces",
  });
  const macTable = trpc.traffic.getMacTable.useQuery({}, {
    enabled: tab === "mac",
  });
  const arpTable = trpc.traffic.getArpTable.useQuery({}, {
    enabled: tab === "arp",
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "interfaces", label: "Interfaces" },
    { key: "mac", label: "MAC Table" },
    { key: "arp", label: "ARP Table" },
  ];

  const activeQuery =
    tab === "interfaces" ? interfaces : tab === "mac" ? macTable : arpTable;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Traffic Analyzer</h1>
        <button
          onClick={() => activeQuery.refetch()}
          disabled={activeQuery.isFetching}
          className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-muted disabled:opacity-50"
        >
          {activeQuery.isFetching ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeQuery.isLoading && (
        <p className="text-gray-500">Loading data...</p>
      )}

      {activeQuery.isError && (
        <p className="text-red-600">{activeQuery.error.message}</p>
      )}

      {activeQuery.data && <DataTable rows={activeQuery.data} />}
    </div>
  );
}
