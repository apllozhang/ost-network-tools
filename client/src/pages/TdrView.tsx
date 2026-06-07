import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function TdrView() {
  const [port, setPort] = useState("1/1/1");

  const runTest = trpc.tdr.runTest.useMutation();
  const clearStats = trpc.tdr.clearStats.useMutation();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">TDR Cable Test</h1>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Port:</label>
        <input
          type="text"
          value={port}
          onChange={(e) => setPort(e.target.value)}
          className="border rounded p-1 w-32"
          placeholder="1/1/1"
        />
        <button
          onClick={() => runTest.mutate({ port })}
          disabled={runTest.isPending}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {runTest.isPending ? "Testing..." : "Run TDR Test"}
        </button>
        <button
          onClick={() => clearStats.mutate({ port })}
          disabled={clearStats.isPending}
          className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-muted disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {runTest.isError && (
        <p className="text-red-600">{runTest.error.message}</p>
      )}

      {clearStats.isError && (
        <p className="text-red-600">{clearStats.error.message}</p>
      )}

      {runTest.isPending && (
        <p className="text-gray-500">Running TDR test on port {port}...</p>
      )}

      {runTest.data && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Results</h2>
          <pre className="bg-gray-50 dark:bg-muted border rounded p-4 text-sm overflow-x-auto">
            {JSON.stringify(runTest.data, null, 2)}
          </pre>
        </div>
      )}

      {!runTest.data && !runTest.isPending && (
        <p className="text-gray-500">No results yet. Run a TDR test to see results.</p>
      )}
    </div>
  );
}
