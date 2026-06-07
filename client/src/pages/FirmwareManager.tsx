import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function FirmwareManager() {
  const [model, setModel] = useState("");

  const microcode = trpc.firmware.getCurrentVersion.useQuery({});
  const chassis = trpc.firmware.getChassisInfo.useQuery({});
  const gaLookup = trpc.firmware.getGaVersion.useQuery(
    { model },
    { enabled: false },
  );

  const handleGaLookup = () => {
    if (!model.trim()) return;
    gaLookup.refetch();
  };

  const gaData = gaLookup.data;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Firmware Manager</h1>

      {/* Current Version */}
      <section className="border rounded p-4 space-y-2">
        <h2 className="text-lg font-semibold">Current Microcode Version</h2>
        {microcode.isLoading && <p className="text-gray-500">Loading...</p>}
        {microcode.error && (
          <p className="text-red-600">{microcode.error.message}</p>
        )}
        {microcode.data && (
          <pre className="bg-gray-50 dark:bg-muted p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
            {microcode.data.raw}
          </pre>
        )}
      </section>

      {/* Chassis Information */}
      <section className="border rounded p-4 space-y-2">
        <h2 className="text-lg font-semibold">Chassis Information</h2>
        {chassis.isLoading && <p className="text-gray-500">Loading...</p>}
        {chassis.error && (
          <p className="text-red-600">{chassis.error.message}</p>
        )}
        {chassis.data && (
          <pre className="bg-gray-50 dark:bg-muted p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
            {chassis.data.raw}
          </pre>
        )}
      </section>

      {/* GA Version Lookup */}
      <section className="border rounded p-4 space-y-2">
        <h2 className="text-lg font-semibold">GA Version Lookup</h2>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Switch Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="border rounded p-2 w-full"
              placeholder="e.g. OS6860-48"
            />
          </div>
          <button
            onClick={handleGaLookup}
            disabled={!model.trim() || gaLookup.isFetching}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {gaLookup.isFetching ? "Looking up..." : "Lookup GA"}
          </button>
        </div>

        {gaLookup.isError && (
          <p className="text-red-600">{gaLookup.error.message}</p>
        )}

        {gaData && (
          <div className="bg-gray-50 dark:bg-muted p-3 rounded text-sm space-y-1">
            <p>
              <span className="font-medium">Model:</span>{" "}
              {gaData.model || "—"}
            </p>
            <p>
              <span className="font-medium">GA Version:</span>{" "}
              {gaData.ga_version || "—"}
            </p>
            {gaData.note && (
              <p className="text-gray-500">
                <span className="font-medium">Note:</span> {gaData.note}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
