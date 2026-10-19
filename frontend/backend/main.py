from collections import Counter
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
import re

app = FastAPI(title="PRAHARI Security API")

# Allow the React frontend to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "project": "PRAHARI",
        "status": "online",
        "message": "Security API is running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


def _normalized_columns(df: pd.DataFrame) -> dict[str, str]:
    return {
        re.sub(r"[^a-z0-9]+", "_", str(column).strip().lower()).strip("_"): column
        for column in df.columns
    }


def _find_column(columns: dict[str, str], *aliases: str) -> str | None:
    return next((columns[alias] for alias in aliases if alias in columns), None)


def assess_telemetry_risk(df: pd.DataFrame) -> dict:
    """Return explainable heuristic triage indicators, not an attack prediction."""
    columns = _normalized_columns(df)
    total_records = int(len(df))
    indicators: list[dict] = []
    coverage_families: set[str] = set()
    host_scores: Counter = Counter()

    source_column = _find_column(
        columns, "source_ip", "src_ip", "src", "source", "client_ip", "src_addr"
    )
    destination_column = _find_column(
        columns, "destination_ip", "dest_ip", "dst_ip", "destination", "dst", "dst_addr"
    )

    def add_indicator(
        key: str,
        title: str,
        severity: str,
        points: int,
        affected_records: int,
        evidence: str,
        affected_hosts: list[str] | None = None,
    ) -> None:
        if affected_records <= 0 or points <= 0:
            return
        safe_hosts = affected_hosts or []
        indicators.append({
            "key": key,
            "title": title,
            "severity": severity,
            "score_contribution": points,
            "affected_records": affected_records,
            "evidence": evidence,
            "affected_hosts": safe_hosts[:5],
        })
        for host in safe_hosts:
            host_scores[host] += points

    # Failed authentication outcomes are a useful signal only when a suitable
    # event/result column is actually present in the uploaded dataset.
    auth_result_column = _find_column(
        columns, "event_type", "event", "action", "result", "status", "message", "activity"
    )
    auth_failed_column = _find_column(columns, "failed_login", "auth_failed", "login_failed")
    if auth_result_column or auth_failed_column:
        coverage_families.add("authentication_outcomes")
        if auth_failed_column:
            failed_mask = df[auth_failed_column].astype(str).str.strip().str.lower().isin(
                {"1", "true", "yes", "failed", "failure"}
            )
        else:
            failed_mask = df[auth_result_column].astype(str).str.contains(
                r"fail|denied|blocked|unauthori[sz]ed|invalid[_ ]?(?:password|login|credential)|brute[_ -]?force",
                case=False,
                regex=True,
                na=False,
            )
        failed_count = int(failed_mask.sum())
        if failed_count:
            failure_rate = failed_count / max(total_records, 1)
            points = 8 if failure_rate < 0.05 else 16 if failure_rate < 0.20 else 25 if failure_rate < 0.50 else 35
            affected_hosts: list[str] = []
            if source_column:
                affected_hosts = (
                    df.loc[failed_mask, source_column].dropna().astype(str).str.strip()
                    .loc[lambda values: values.ne("")].value_counts().head(5).index.tolist()
                )
            add_indicator(
                "authentication_failures",
                "Failed authentication outcomes",
                "high" if failure_rate >= 0.20 else "medium" if failure_rate >= 0.05 else "low",
                points,
                failed_count,
                f"{failed_count} of {total_records} records ({failure_rate:.1%}) contain a failed, denied, blocked, or invalid authentication outcome.",
                affected_hosts,
            )

    # Common remote-administration and file-sharing ports provide context,
    # but their presence alone is not evidence of malicious activity.
    port_column = _find_column(columns, "destination_port", "dest_port", "dst_port", "dport", "port")
    if port_column:
        coverage_families.add("destination_port")
        ports = pd.to_numeric(df[port_column], errors="coerce")
        managed_ports = {22, 23, 445, 3389, 5900, 5985, 5986}
        port_mask = ports.isin(managed_ports)
        port_count = int(port_mask.sum())
        if port_count:
            observed_ports = sorted({int(port) for port in ports[port_mask].dropna().unique()})
            affected_hosts = []
            if source_column:
                affected_hosts = (
                    df.loc[port_mask, source_column].dropna().astype(str).str.strip()
                    .loc[lambda values: values.ne("")].value_counts().head(5).index.tolist()
                )
            add_indicator(
                "management_ports",
                "Remote-administration or file-sharing ports observed",
                "low",
                min(12, 4 + len(observed_ports) * 2),
                port_count,
                f"{port_count} records use common management/share ports {', '.join(map(str, observed_ports))}; verify whether these services are expected in this network.",
                affected_hosts,
            )

    # High destination fan-out can be worth investigating. The threshold is
    # intentionally explicit and is not presented as a learned baseline.
    if source_column and destination_column:
        coverage_families.add("source_destination_relationships")
        relationships = df[[source_column, destination_column]].dropna().copy()
        relationships[source_column] = relationships[source_column].astype(str).str.strip()
        relationships[destination_column] = relationships[destination_column].astype(str).str.strip()
        relationships = relationships[
            relationships[source_column].ne("") & relationships[destination_column].ne("")
        ]
        destinations_per_source = relationships.groupby(source_column)[destination_column].nunique()
        fanout_sources = destinations_per_source[destinations_per_source >= 10]
        if not fanout_sources.empty:
            affected_hosts = [str(host) for host in fanout_sources.sort_values(ascending=False).head(5).index]
            fanout_mask = relationships[source_column].isin(fanout_sources.index)
            add_indicator(
                "high_destination_fanout",
                "High destination fan-out",
                "medium",
                min(20, 8 + len(fanout_sources) * 3),
                int(fanout_mask.sum()),
                f"{len(fanout_sources)} source host(s) each contacted 10 or more distinct destinations in this file; this fixed heuristic is not a learned network baseline.",
                affected_hosts,
            )

    # Large byte values relative to the file can identify outliers for review,
    # not establish exfiltration or malicious intent.
    byte_column = _find_column(columns, "bytes", "byte_count", "bytes_sent", "total_bytes", "payload_bytes")
    if byte_column:
        coverage_families.add("byte_volume")
        byte_values = pd.to_numeric(df[byte_column], errors="coerce")
        valid_bytes = byte_values.dropna()
        if len(valid_bytes) >= 5:
            median_bytes = float(valid_bytes.median())
            upper_quartile = float(valid_bytes.quantile(0.99))
            outlier_threshold = max(median_bytes * 10, 1_000_000)
            outlier_mask = byte_values >= outlier_threshold
            outlier_count = int(outlier_mask.sum())
            if outlier_count and upper_quartile >= outlier_threshold:
                affected_hosts = []
                if source_column:
                    affected_hosts = (
                        df.loc[outlier_mask, source_column].dropna().astype(str).str.strip()
                        .loc[lambda values: values.ne("")].value_counts().head(5).index.tolist()
                    )
                add_indicator(
                    "large_byte_outliers",
                    "Large byte-volume outliers",
                    "low",
                    min(12, 5 + outlier_count * 2),
                    outlier_count,
                    f"{outlier_count} record(s) contain at least {outlier_threshold:,.0f} bytes (threshold: max of 10× median or 1,000,000 bytes); review against expected workload.",
                    affected_hosts,
                )

    score = min(100, sum(item["score_contribution"] for item in indicators))
    if not coverage_families:
        level = "insufficient_data"
        score_value = None
    else:
        score_value = score
        level = "high" if score >= 60 else "elevated" if score >= 35 else "guarded" if score >= 15 else "low"

    return {
        "method": "transparent_fixed_rules",
        "is_prediction": False,
        "score": score_value,
        "level": level,
        "signal_coverage_percent": min(100, round(len(coverage_families) / 4 * 100)),
        "available_signal_families": sorted(coverage_families),
        "indicators": sorted(indicators, key=lambda item: item["score_contribution"], reverse=True),
        "top_hosts": [
            {"host": host, "indicator_points": points}
            for host, points in host_scores.most_common(5)
        ],
        "disclaimer": (
            "This is a fixed-rule triage score over the uploaded file, not an AI forecast, "
            "calibrated probability, or confirmation of an attack. Validate each indicator "
            "against operational context."
        ),
    }


@app.post("/api/telemetry/upload")
async def upload_telemetry(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file."
        )

    try:
        content = await file.read()

        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File must be 10 MB or smaller."
            )

        df = pd.read_csv(io.BytesIO(content))

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="The CSV file contains no records."
            )

        if len(df.columns) > 100:
            raise HTTPException(
                status_code=400,
                detail="The CSV file has too many columns."
            )

        return {
            "filename": file.filename,
            "rows": len(df),
            "columns": list(df.columns),
            "preview": df.head(5).fillna("").to_dict(orient="records"),
            "message": "CSV telemetry parsed successfully."
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read this CSV. Please check its format."
        )


@app.post("/api/telemetry/analyze")
async def analyze_telemetry(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file."
        )

    try:
        content = await file.read()

        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File must be 10 MB or smaller."
            )

        df = pd.read_csv(io.BytesIO(content))

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="The CSV contains no records."
            )

        if len(df.columns) > 100:
            raise HTTPException(
                status_code=400,
                detail="The CSV has too many columns."
            )

        columns = {
            column.lower().strip(): column
            for column in df.columns
        }

        protocol_column = columns.get("protocol")
        source_column = columns.get("source_ip")
        destination_column = columns.get("destination_ip")
        bytes_column = columns.get("bytes")

        protocols = {}

        if protocol_column:
            protocols = {
                str(key): int(value)
                for key, value in Counter(
                    df[protocol_column].dropna().astype(str)
                ).items()
            }

        risk_assessment = assess_telemetry_risk(df)

        return {
            "records_analyzed": int(len(df)),
            "unique_sources": (
                int(df[source_column].nunique())
                if source_column else None
            ),
            "unique_destinations": (
                int(df[destination_column].nunique())
                if destination_column else None
            ),
            "total_bytes": (
                int(pd.to_numeric(
                    df[bytes_column], errors="coerce"
                ).sum())
                if bytes_column else None
            ),
            "protocol_distribution": protocols,
            "risk_assessment": risk_assessment,
            "message": (
                "Statistics calculated from the uploaded CSV. "
                "These statistics do not determine whether an attack occurred."
            )
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not analyze the CSV. Check its format."
        )


@app.post("/api/telemetry/network-map")
async def network_map(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a CSV file."
        )

    try:
        content = await file.read()

        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File must be 10 MB or smaller."
            )

        df = pd.read_csv(io.BytesIO(content))

        if df.empty:
            raise HTTPException(
                status_code=400,
                detail="The CSV contains no records."
            )

        if len(df.columns) > 100:
            raise HTTPException(
                status_code=400,
                detail="The CSV has too many columns."
            )

        columns = {
            column.lower().strip(): column
            for column in df.columns
        }

        source_column = columns.get("source_ip")
        destination_column = columns.get("destination_ip")

        if not source_column or not destination_column:
            raise HTTPException(
                status_code=400,
                detail="CSV must contain source_ip and destination_ip columns."
            )

        records = df[[source_column, destination_column]].dropna().copy()
        records[source_column] = records[source_column].astype(str).str.strip()
        records[destination_column] = (
            records[destination_column].astype(str).str.strip()
        )
        records = records[
            (records[source_column] != "") &
            (records[destination_column] != "")
        ]

        connections = (
            records.groupby([source_column, destination_column])
            .size()
            .reset_index(name="connection_count")
        )

        nodes = sorted(
            set(records[source_column]) |
            set(records[destination_column])
        )

        edges = [
            {
                "source": row[source_column],
                "target": row[destination_column],
                "connection_count": int(row["connection_count"])
            }
            for _, row in connections.iterrows()
        ]

        return {
            "nodes": nodes,
            "edges": edges,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "message": "Network communication map generated from uploaded records."
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not generate the network map. Check the CSV format."
        )