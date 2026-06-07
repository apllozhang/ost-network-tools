import { useState } from "react";
import { trpc } from "@/lib/trpc";

type SearchType = "mac" | "ip" | "port";

const placeholders: Record<SearchType, string> = {
  mac: "e.g. aa:bb:cc:dd:ee:ff",
  ip: "e.g. 10.0.0.1",
  port: "e.g. 1/1",
};

export default function DeviceSearch() {
  const [type, setType] = useState<SearchType>("mac");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState({ type: "mac" as SearchType, query: "" });

  const macResults = trpc.search.searchByMac.useQuery(
    { mac: submitted.query },
    { enabled: submitted.type === "mac" && submitted.query.length > 0 },
  );

  const ipResults = trpc.search.searchByIp.useQuery(
    { ip: submitted.query },
    { enabled: submitted.type === "ip" && submitted.query.length > 0 },
  );

  const portResults = trpc.search.searchByPort.useQuery(
    { port: submitted.query },
    { enabled: submitted.type === "port" && submitted.query.length > 0 },
  );

  const activeQuery =
    submitted.type === "mac"
      ? macResults
      : submitted.type === "ip"
        ? ipResults
        : portResults;

  const rows = activeQuery.data ?? [];

  const columns =
    rows.length > 0
      ? Object.keys(rows[0]!).filter((k) => !k.startsWith("_"))
      : [];

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSubmitted({ type, query: trimmed });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Device Search</h1>

      <div className="flex items-end gap-2 border rounded p-3">
        <div>
          <label className="block text-sm font-medium mb-1">Search Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SearchType)}
            className="border rounded p-1"
          >
            <option value="mac">MAC Address</option>
            <option value="ip">IP Address</option>
            <option value="port">Port</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Query</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholders[type]}
            className="border rounded p-1 w-full"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={activeQuery.isFetching}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {activeQuery.isFetching ? "Searching..." : "Search"}
        </button>
      </div>

      {activeQuery.isError && (
        <p className="text-red-600">{activeQuery.error.message}</p>
      )}

      {submitted.query && !activeQuery.isLoading && !activeQuery.isError && rows.length === 0 && (
        <p className="text-gray-500">No results found</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-50">
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
                <tr key={i} className="hover:bg-gray-50">
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
      )}
    </div>
  );
}
