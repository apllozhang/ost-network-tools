import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function LogAnalyzer() {
  const [rawOutput, setRawOutput] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [parseResult, setParseResult] = useState<Record<string, string>[] | null>(null);

  const extractSections = trpc.log.extractSections.useMutation();
  const parseSection = trpc.log.parseSection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setParseResult(data.data);
      }
    },
  });

  const sections = extractSections.data?.success ? extractSections.data.data : [];

  const handleExtract = () => {
    if (!rawOutput.trim()) return;
    setParseResult(null);
    setSelectedSection("");
    extractSections.mutate({ rawOutput });
  };

  const handleParse = () => {
    if (!selectedSection || !rawOutput.trim()) return;
    parseSection.mutate({ section: selectedSection, rawOutput });
  };

  const columns =
    parseResult && parseResult.length > 0 ? Object.keys(parseResult[0]) : [];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Log Analyzer</h1>

      {/* Input area */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Paste tech_support.log content
        </label>
        <textarea
          value={rawOutput}
          onChange={(e) => setRawOutput(e.target.value)}
          className="w-full h-48 border rounded p-3 font-mono text-sm"
          placeholder="Paste raw tech_support.log output here..."
        />
        <button
          onClick={handleExtract}
          disabled={!rawOutput.trim() || extractSections.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {extractSections.isPending ? "Extracting..." : "Extract Sections"}
        </button>
      </div>

      {extractSections.isError && (
        <p className="text-red-600">{extractSections.error.message}</p>
      )}

      {/* Section selector */}
      {sections.length > 0 && (
        <div className="flex items-end gap-2 border rounded p-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setParseResult(null);
              }}
              className="border rounded p-2 w-full"
            >
              <option value="">Select a section...</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleParse}
            disabled={!selectedSection || parseSection.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {parseSection.isPending ? "Parsing..." : "Parse"}
          </button>
        </div>
      )}

      {parseSection.isError && (
        <p className="text-red-600">{parseSection.error.message}</p>
      )}

      {parseSection.data && !parseSection.data.success && (
        <p className="text-red-600">{parseSection.data.error}</p>
      )}

      {/* Results table */}
      {parseResult && parseResult.length > 0 && (
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
              {parseResult.map((row, i) => (
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

      {parseResult && parseResult.length === 0 && (
        <p className="text-gray-500">No data parsed for this section</p>
      )}
    </div>
  );
}
