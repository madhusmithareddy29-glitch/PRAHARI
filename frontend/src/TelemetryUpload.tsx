import { useState } from "react";

type UploadResult = {
  filename: string;
  rows: number;
  columns: string[];
  preview: Record<string, unknown>[];
  message: string;
};

type AnalysisResult = {
  records_analyzed: number;
  unique_sources: number | null;
  unique_destinations: number | null;
  total_bytes: number | null;
  protocol_distribution: Record<string, number>;
  message: string;
};

type SummaryStats = {
  totalRecords: number;
  uniqueSources: number;
  totalBytes: number;
  topProtocol: string;
  topSource: string;
};

export type { AnalysisResult, UploadResult };

type TelemetryUploadProps = {
  onUpload?: (result: UploadResult) => void;
  onAnalysis?: (result: AnalysisResult) => void;
};

function getNumericValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getSummaryStats(rows: Record<string, unknown>[]): SummaryStats {
  const sourceKeys = [
    "source_ip",
    "src_ip",
    "src",
    "source",
    "host",
    "hostname",
    "device",
    "ip",
  ];

  const protocolKeys = ["protocol", "proto", "network_protocol", "service"];
  const byteKeys = ["bytes", "byte_count", "bytes_sent", "total_bytes", "payload_bytes"];

  const sourceSet = new Set<string>();
  const protocolCounts = new Map<string, number>();
  let totalBytes = 0;

  rows.forEach((row) => {
    sourceKeys.forEach((key) => {
      const value = row[key];
      if (typeof value === "string" && value.trim() !== "") {
        sourceSet.add(value.trim());
      }
    });

    protocolKeys.forEach((key) => {
      const value = row[key];
      if (typeof value === "string" && value.trim() !== "") {
        const normalized = value.trim().toUpperCase();
        protocolCounts.set(normalized, (protocolCounts.get(normalized) ?? 0) + 1);
      }
    });

    byteKeys.forEach((key) => {
      totalBytes += getNumericValue(row[key]);
    });
  });

  const sortedProtocols = [...protocolCounts.entries()].sort((a, b) => b[1] - a[1]);
  const topProtocol = sortedProtocols[0]?.[0] ?? "N/A";

  let topSource = "N/A";
  const sourceCounts = new Map<string, number>();

  rows.forEach((row) => {
    sourceKeys.forEach((key) => {
      const value = row[key];
      if (typeof value === "string" && value.trim() !== "") {
        const normalized = value.trim();
        sourceCounts.set(normalized, (sourceCounts.get(normalized) ?? 0) + 1);
      }
    });
  });

  const sortedSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (sortedSources.length > 0) {
    topSource = sortedSources[0][0];
  }

  return {
    totalRecords: rows.length,
    uniqueSources: sourceSet.size,
    totalBytes,
    topProtocol,
    topSource,
  };
}

export default function TelemetryUpload({ onUpload, onAnalysis }: TelemetryUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const summary = result ? getSummaryStats(result.preview) : null;

  async function analyzeFile() {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://127.0.0.1:8000/api/telemetry/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Analysis failed.");
      }

      setAnalysis(data);
      onAnalysis?.(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze the uploaded file."
      );
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile() {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://127.0.0.1:8000/api/telemetry/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      setResult(data);
      onUpload?.(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the PRAHARI backend."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="telemetry-upload">
      <h2>Network Telemetry Import</h2>

      <p>
        Upload an authorized network telemetry CSV file for parsing and inspection.
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          setResult(null);
          setError("");
        }}
      />

      <button onClick={uploadFile} disabled={loading || !file}>
        {loading ? "Uploading..." : "Upload Telemetry"}
      </button>

      <button onClick={analyzeFile} disabled={loading || !file}>
        {loading ? "Processing..." : "Analyze Network Activity"}
      </button>

      {error && <p role="alert">{error}</p>}

      {result && (
        <div>
          <h3>Upload Successful</h3>

          <p>File: {result.filename}</p>
          <p>Records received: {result.rows}</p>
          <p>Columns: {result.columns.join(", ")}</p>

          {summary && (
            <div className="telemetry-summary">
              <div className="summary-card">
                <span>Total records</span>
                <strong>{summary.totalRecords}</strong>
              </div>
              <div className="summary-card">
                <span>Unique sources</span>
                <strong>{summary.uniqueSources}</strong>
              </div>
              <div className="summary-card">
                <span>Total bytes</span>
                <strong>{summary.totalBytes.toLocaleString()}</strong>
              </div>
              <div className="summary-card">
                <span>Top protocol</span>
                <strong>{summary.topProtocol}</strong>
              </div>
              <div className="summary-card">
                <span>Top source</span>
                <strong>{summary.topSource}</strong>
              </div>
            </div>
          )}

          {analysis && (
            <div className="analysis-results">
              <h3>Network Activity Analysis</h3>

              <p>Records analyzed: {analysis.records_analyzed}</p>
              <p>Unique source IPs: {analysis.unique_sources ?? "Unavailable"}</p>
              <p>
                Unique destination IPs: {analysis.unique_destinations ?? "Unavailable"}
              </p>
              <p>
                Total bytes: {analysis.total_bytes === null ? "Unavailable" : analysis.total_bytes.toLocaleString()}
              </p>

              <h4>Protocol Distribution</h4>

              {Object.entries(analysis.protocol_distribution).length === 0 ? (
                <p>No protocol column was found in the CSV.</p>
              ) : (
                <ul>
                  {Object.entries(analysis.protocol_distribution).map(([protocol, count]) => (
                    <li key={protocol}>
                      {protocol}: {count} records
                    </li>
                  ))}
                </ul>
              )}

              <p>{analysis.message}</p>
            </div>
          )}

          <h3>Data Preview</h3>

          {result.preview.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    {result.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {result.preview.map((row, index) => (
                    <tr key={index}>
                      {result.columns.map((column) => (
                        <td key={column}>{String(row[column] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
