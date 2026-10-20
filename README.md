# PRAHARI

PRAHARI is a cybersecurity telemetry dashboard with explainable, fixed-rule risk triage. It parses uploaded network CSVs, reports evidence-backed indicators, and shows affected source hosts. The score is triage guidance only—it is not an AI forecast, calibrated probability, or confirmation of an attack.

## Live frontend

The GitHub Pages frontend is published at <https://madhusmithareddy29-glitch.github.io/PRAHARI/> after the `Deploy PRAHARI frontend to GitHub Pages` workflow completes successfully.

GitHub Pages hosts the static React interface only. The CSV upload and analysis API is a separate FastAPI service and is not deployed by Pages. To use CSV analysis publicly, deploy `frontend/backend` to an HTTPS Python host and configure the frontend API URL for that host. Do not upload sensitive telemetry to a public demo.

## Local development

Frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Backend (from the repository root, with the project virtual environment configured):

```powershell
.\.venv\Scripts\python.exe -m pip install -r frontend\backend\requirements.txt
Set-Location frontend\backend
..\..\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

The backend accepts CSV files up to 10 MB and returns basic statistics plus transparent heuristic indicators for failed authentication outcomes, common management ports, high destination fan-out, and large byte outliers. The rules and thresholds are not a substitute for validated detection engineering or analyst review.
