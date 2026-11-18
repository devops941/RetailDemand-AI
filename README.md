# RetailDemand AI

**Promotion-Aware Product Sales Forecasting Engine**

A full-stack AI platform for retail demand forecasting that accounts for promotions, holidays, discounts, and seasonal patterns.

## Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand, Recharts
- **Backend**: Python 3.12, FastAPI, MongoDB, Beanie ODM, Scikit-learn
- **Database**: MongoDB Atlas (or local)
- **ML**: Linear Regression, Random Forest, Gradient Boosting

## Quick Start (Development)

### Prerequisites
- Python 3.12+
- Node.js 20+
- MongoDB Atlas account or local MongoDB

### 1. Backend

```bash
cd backend
python -m pip install -r requirements.txt
# Edit .env — set MONGO_URI and SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

Default admin: `admin@retaildemand.ai` / `Admin@123`

API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### 3. Generate Sample Data

```bash
cd backend
python scripts/generate_sample_data.py
```

Outputs `backend/uploads/sample_retail_sales.csv` — a synthetic 2-year dataset with 10 products, promotions, holidays, and seasonal patterns.

## Docker

```bash
# Edit backend/.env first
docker compose up --build
```

App: http://localhost:80 | API: http://localhost:8000

## Environment Variables

See `backend/.env.example` and `frontend/.env.example`.

## Project Structure

```
RetailDemandAI/
├── backend/          # FastAPI + ML engine
│   ├── app/
│   │   ├── api/      # REST endpoints
│   │   ├── core/     # Config, DB, security
│   │   ├── models/   # Beanie ODM models
│   │   ├── services/ # Business logic
│   │   └── ml/       # ML pipeline
│   ├── scripts/      # Utilities
│   └── tests/
└── frontend/         # React SPA
    └── src/
        ├── modules/  # Feature modules
        ├── components/
        ├── services/ # API clients
        └── store/    # Zustand state
```

## Default Roles

| Role | Capabilities |
|------|-------------|
| `admin` | Full access, user management, audit logs |
| `analyst` | Upload datasets, train models, generate forecasts |
| `manager` | View dashboards and reports |
