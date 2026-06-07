import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function PoeDiagnostics() {
  const [slot, setSlot] = useState(1);
  const utils = trpc.useUtils();

  const status = trpc.poe.getStatus.useQuery({ slot });
  const enablePort = trpc.poe.enablePort.useMutation({
    onSuccess: () => utils.poe.getStatus.refetch(),
  });
  const disablePort = trpc.poe.disablePort.useMutation({
    onSuccess: () => utils.poe.getStatus.refetch(),
  });

  const rows = status.data ?? [];

  // Extract column headers from first row, excluding common non-display fields
  const columns =
    rows.length > 0
      ? Object.keys(rows[0]!).filter((k) => !k.startsWith("_"))
      : [];

  // Guess the port identifier column
  const portCol = columns.find((c) => /port/i.test(c)) ?? columns[0] ?? "";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">PoE Diagnostics</h1>
        <button
          onClick={() => status.refetch()}
          disabled={status.isFetching}
          className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
        >
          {status.isFetching ? "Loading..." : "Refresh"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Slot:</label>
        <select
          value={slot}
          onChange={(e) => setSlot(Number(e.target.value))}
          className="border rounded p-1"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
        </select>
      </div>

      {status.isLoading && <p className="text-gray-500">Loading PoE status...</p>}

      {status.isError && (
        <p className="text-red-600">{status.error.message}</p>
      )}

      {rows.length === 0 && !status.isLoading && !status.isError && (
        <p className="text-gray-500">No PoE data available</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-50">
                {columns.map((col) => (
                  <th key={col} className="border px-3 py-2 text-left font-medium">
                    {col}
                  </th>
                ))}
                <th className="border px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const port = row[portCol] ?? "";
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td key={col} className="border px-3 py-2">
                        {row[col] ?? "—"}
                      </td>
                    ))}
                    <td className="border px-3 py-2 space-x-2">
                      <button
                        onClick={() => enablePort.mutate({ port })}
                        disabled={enablePort.isPending}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        ON
                      </button>
                      <button
                        onClick={() => disablePort.mutate({ port })}
                        disabled={disablePort.isPending}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        OFF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
