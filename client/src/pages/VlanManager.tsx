import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function VlanManager() {
  const [vlanId, setVlanId] = useState("");
  const [vlanName, setVlanName] = useState("");
  const utils = trpc.useUtils();

  const vlans = trpc.vlan.list.useQuery({});

  const createVlan = trpc.vlan.create.useMutation({
    onSuccess: () => {
      utils.vlan.list.refetch();
      setVlanId("");
      setVlanName("");
    },
  });

  const deleteVlan = trpc.vlan.delete.useMutation({
    onSuccess: () => utils.vlan.list.refetch(),
  });

  const handleCreate = () => {
    const id = Number(vlanId);
    if (!id || id < 1 || id > 4094) return;
    if (!vlanName.trim()) return;
    createVlan.mutate({ vlanId: id, name: vlanName.trim() });
  };

  const rows = vlans.data ?? [];

  // Extract column headers from first row, excluding internal fields
  const columns =
    rows.length > 0
      ? Object.keys(rows[0]!).filter((k) => !k.startsWith("_"))
      : [];

  // Guess the VLAN ID column
  const idCol =
    columns.find((c) => /vlan.?id|^id$/i.test(c)) ?? columns[0] ?? "";

  // Guess the name column
  const nameCol = columns.find((c) => /name/i.test(c)) ?? "";

  // Guess admin state column
  const adminCol = columns.find((c) => /admin/i.test(c)) ?? "";

  // Guess oper state column
  const operCol = columns.find((c) => /oper/i.test(c)) ?? "";

  // Guess MTU column
  const mtuCol = columns.find((c) => /mtu/i.test(c)) ?? "";

  // Columns to display in the table
  const displayCols = [idCol, nameCol, adminCol, operCol, mtuCol].filter(
    Boolean,
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">VLAN Manager</h1>
        <button
          onClick={() => vlans.refetch()}
          disabled={vlans.isFetching}
          className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
        >
          {vlans.isFetching ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Create VLAN form */}
      <div className="flex items-end gap-2 border rounded p-3">
        <div>
          <label className="block text-sm font-medium mb-1">VLAN ID</label>
          <input
            type="number"
            min={1}
            max={4094}
            value={vlanId}
            onChange={(e) => setVlanId(e.target.value)}
            className="border rounded p-1 w-24"
            placeholder="1-4094"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={vlanName}
            onChange={(e) => setVlanName(e.target.value)}
            className="border rounded p-1 w-40"
            placeholder="VLAN name"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={createVlan.isPending}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {createVlan.isPending ? "Creating..." : "Create"}
        </button>
      </div>

      {createVlan.isError && (
        <p className="text-red-600">{createVlan.error.message}</p>
      )}

      {deleteVlan.isError && (
        <p className="text-red-600">{deleteVlan.error.message}</p>
      )}

      {vlans.isLoading && (
        <p className="text-gray-500">Loading VLANs...</p>
      )}

      {vlans.isError && <p className="text-red-600">{vlans.error.message}</p>}

      {rows.length === 0 && !vlans.isLoading && !vlans.isError && (
        <p className="text-gray-500">No VLANs found</p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-50">
                {displayCols.map((col) => (
                  <th
                    key={col}
                    className="border px-3 py-2 text-left font-medium"
                  >
                    {col}
                  </th>
                ))}
                <th className="border px-3 py-2 text-left font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const id = row[idCol] ?? "";
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    {displayCols.map((col) => (
                      <td key={col} className="border px-3 py-2">
                        {row[col] ?? "—"}
                      </td>
                    ))}
                    <td className="border px-3 py-2">
                      <button
                        onClick={() =>
                          deleteVlan.mutate({ vlanId: Number(id) })
                        }
                        disabled={deleteVlan.isPending}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
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
