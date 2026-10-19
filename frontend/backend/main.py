from collections import Counter
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

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