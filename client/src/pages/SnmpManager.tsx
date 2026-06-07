import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function SnmpManager() {
  const [commName, setCommName] = useState("");
  const [commUser, setCommUser] = useState("");
  const [stationIp, setStationIp] = useState("");
  const [stationVersion, setStationVersion] = useState("v2c");
  const [stationUser, setStationUser] = useState("");

  const utils = trpc.useUtils();

  const communities = trpc.snmp.listCommunities.useQuery({});
  const stations = trpc.snmp.listStations.useQuery({});

  const addCommunity = trpc.snmp.addCommunity.useMutation({
    onSuccess: () => {
      utils.snmp.listCommunities.refetch();
      setCommName("");
      setCommUser("");
    },
  });

  const deleteCommunity = trpc.snmp.deleteCommunity.useMutation({
    onSuccess: () => utils.snmp.listCommunities.refetch(),
  });

  const addStation = trpc.snmp.addStation.useMutation({
    onSuccess: () => {
      utils.snmp.listStations.refetch();
      setStationIp("");
      setStationUser("");
    },
  });

  const deleteStation = trpc.snmp.deleteStation.useMutation({
    onSuccess: () => utils.snmp.listStations.refetch(),
  });

  const handleAddCommunity = () => {
    if (!commName.trim() || !commUser.trim()) return;
    addCommunity.mutate({ name: commName.trim(), user: commUser.trim() });
  };

  const handleAddStation = () => {
    if (!stationIp.trim() || !stationUser.trim()) return;
    addStation.mutate({
      ip: stationIp.trim(),
      version: stationVersion,
      user: stationUser.trim(),
    });
  };

  const commRows = communities.data ?? [];
  const stationRows = stations.data ?? [];

  const commColumns =
    commRows.length > 0
      ? Object.keys(commRows[0]!).filter((k) => !k.startsWith("_"))
      : [];
  const stationColumns =
    stationRows.length > 0
      ? Object.keys(stationRows[0]!).filter((k) => !k.startsWith("_"))
      : [];

  // Guess key columns for communities
  const commNameCol =
    commColumns.find((c) => /name|community/i.test(c)) ?? commColumns[0] ?? "";
  const commUserCol =
    commColumns.find((c) => /user/i.test(c)) ?? commColumns[1] ?? "";
  const commStatusCol = commColumns.find((c) => /status|state|enable/i.test(c)) ?? "";

  // Guess key columns for stations
  const stationIpCol =
    stationColumns.find((c) => /ip|address/i.test(c)) ?? stationColumns[0] ?? "";
  const stationPortCol =
    stationColumns.find((c) => /port/i.test(c)) ?? "";
  const stationVersionCol =
    stationColumns.find((c) => /version|ver/i.test(c)) ?? "";
  const stationUserCol =
    stationColumns.find((c) => /user/i.test(c)) ?? "";

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SNMP Manager</h1>
        <button
          onClick={() => {
            communities.refetch();
            stations.refetch();
          }}
          disabled={communities.isFetching || stations.isFetching}
          className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
        >
          {communities.isFetching || stations.isFetching
            ? "Loading..."
            : "Refresh"}
        </button>
      </div>

      {/* ── Communities Section ────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Communities</h2>

        <div className="flex items-end gap-2 border rounded p-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={commName}
              onChange={(e) => setCommName(e.target.value)}
              className="border rounded p-1 w-40"
              placeholder="Community name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">User</label>
            <input
              type="text"
              value={commUser}
              onChange={(e) => setCommUser(e.target.value)}
              className="border rounded p-1 w-40"
              placeholder="User name"
            />
          </div>
          <button
            onClick={handleAddCommunity}
            disabled={addCommunity.isPending}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {addCommunity.isPending ? "Adding..." : "Add"}
          </button>
        </div>

        {addCommunity.isError && (
          <p className="text-red-600">{addCommunity.error.message}</p>
        )}
        {deleteCommunity.isError && (
          <p className="text-red-600">{deleteCommunity.error.message}</p>
        )}

        {communities.isLoading && (
          <p className="text-gray-500">Loading communities...</p>
        )}
        {communities.isError && (
          <p className="text-red-600">{communities.error.message}</p>
        )}

        {commRows.length === 0 &&
          !communities.isLoading &&
          !communities.isError && (
            <p className="text-gray-500">No communities found</p>
          )}

        {commRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-3 py-2 text-left font-medium">
                    Name
                  </th>
                  <th className="border px-3 py-2 text-left font-medium">
                    User
                  </th>
                  {commStatusCol && (
                    <th className="border px-3 py-2 text-left font-medium">
                      Status
                    </th>
                  )}
                  <th className="border px-3 py-2 text-left font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {commRows.map((row, i) => {
                  const name = row[commNameCol] ?? "";
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border px-3 py-2">
                        {row[commNameCol] ?? "—"}
                      </td>
                      <td className="border px-3 py-2">
                        {row[commUserCol] ?? "—"}
                      </td>
                      {commStatusCol && (
                        <td className="border px-3 py-2">
                          {row[commStatusCol] ?? "—"}
                        </td>
                      )}
                      <td className="border px-3 py-2">
                        <button
                          onClick={() =>
                            deleteCommunity.mutate({ name: String(name) })
                          }
                          disabled={deleteCommunity.isPending}
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
      </section>

      {/* ── Trap Stations Section ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Trap Stations</h2>

        <div className="flex items-end gap-2 border rounded p-3">
          <div>
            <label className="block text-sm font-medium mb-1">IP</label>
            <input
              type="text"
              value={stationIp}
              onChange={(e) => setStationIp(e.target.value)}
              className="border rounded p-1 w-40"
              placeholder="192.168.1.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Version</label>
            <select
              value={stationVersion}
              onChange={(e) => setStationVersion(e.target.value)}
              className="border rounded p-1"
            >
              <option value="v1">v1</option>
              <option value="v2c">v2c</option>
              <option value="v3">v3</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">User</label>
            <input
              type="text"
              value={stationUser}
              onChange={(e) => setStationUser(e.target.value)}
              className="border rounded p-1 w-40"
              placeholder="User name"
            />
          </div>
          <button
            onClick={handleAddStation}
            disabled={addStation.isPending}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {addStation.isPending ? "Adding..." : "Add"}
          </button>
        </div>

        {addStation.isError && (
          <p className="text-red-600">{addStation.error.message}</p>
        )}
        {deleteStation.isError && (
          <p className="text-red-600">{deleteStation.error.message}</p>
        )}

        {stations.isLoading && (
          <p className="text-gray-500">Loading stations...</p>
        )}
        {stations.isError && (
          <p className="text-red-600">{stations.error.message}</p>
        )}

        {stationRows.length === 0 &&
          !stations.isLoading &&
          !stations.isError && (
            <p className="text-gray-500">No trap stations found</p>
          )}

        {stationRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border px-3 py-2 text-left font-medium">
                    IP
                  </th>
                  {stationPortCol && (
                    <th className="border px-3 py-2 text-left font-medium">
                      Port
                    </th>
                  )}
                  {stationVersionCol && (
                    <th className="border px-3 py-2 text-left font-medium">
                      Version
                    </th>
                  )}
                  {stationUserCol && (
                    <th className="border px-3 py-2 text-left font-medium">
                      User
                    </th>
                  )}
                  <th className="border px-3 py-2 text-left font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {stationRows.map((row, i) => {
                  const ip = row[stationIpCol] ?? "";
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border px-3 py-2">
                        {row[stationIpCol] ?? "—"}
                      </td>
                      {stationPortCol && (
                        <td className="border px-3 py-2">
                          {row[stationPortCol] ?? "—"}
                        </td>
                      )}
                      {stationVersionCol && (
                        <td className="border px-3 py-2">
                          {row[stationVersionCol] ?? "—"}
                        </td>
                      )}
                      {stationUserCol && (
                        <td className="border px-3 py-2">
                          {row[stationUserCol] ?? "—"}
                        </td>
                      )}
                      <td className="border px-3 py-2">
                        <button
                          onClick={() =>
                            deleteStation.mutate({ ip: String(ip) })
                          }
                          disabled={deleteStation.isPending}
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
      </section>
    </div>
  );
}
