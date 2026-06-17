# ERP - Raw Material & Inventory Module

A premium Enterprise Resource Planning (ERP) Raw Material & Inventory Module built with a modern stack of **FastAPI**, **PostgreSQL**, **React.js**, and **Vite**.

This module manages raw materials, vendors, stores, purchase orders (PO), Goods Received Notes (GRN), inventory tracking (with row-level database locking), ledger logs, and custom fields.

---

## 🛠️ Architecture Overview

- **Backend**: FastAPI (Python 3.11+), SQLAlchemy 2.0 (Async/AsyncPG), Alembic migrations.
- **Database**: PostgreSQL 15+.
- **Frontend**: React (Vite), Tailwind CSS, TanStack React Query v5, Axios, React Hook Form, Recharts.

---

## 📋 Prerequisites

Ensure you have the following installed on your system:
- **Python 3.11+**
- **Node.js 18+** (with npm)
- **PostgreSQL 15+** (locally running or Docker container)

---

## 🚀 Environment Setup & Run Guide

Follow these steps to set up the environment and run both the frontend and backend applications.

### 1. Backend Setup

The backend configuration files and source code are located in the [backend](file:///c:/Users/Amit/Desktop/Audi/backend) directory.

#### Step 1.1: Activate Virtual Environment and Install Dependencies
Open a terminal in the [backend](file:///c:/Users/Amit/Desktop/Audi/backend) folder and run:

```powershell
# Create virtual environment if you haven't already
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1   # PowerShell (Windows)
# venv\Scripts\activate.bat   # Command Prompt (Windows)
# source venv/bin/activate    # macOS/Linux

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```
*Note: Refer to [requirements.txt](file:///c:/Users/Amit/Desktop/Audi/backend/requirements.txt) for the list of required python libraries.*

#### Step 1.2: Environment Configuration
Create or modify the environment settings in the [backend/.env](file:///c:/Users/Amit/Desktop/Audi/backend/.env) file:

```ini
# Database URLs (sync URL is required by Alembic, async URL by the FastAPI app)
DATABASE_URL=postgresql+asyncpg://erp_user:erp_2026@localhost:5432/erp_db
DATABASE_URL_SYNC=postgresql://erp_user:erp_2026@localhost:5432/erp_db

# CORS Configuration (allows the Vite frontend dev server to call backend APIs)
ALLOWED_ORIGINS=["http://localhost:5173", "http://localhost:3000"]

# JWT Authentication Config
SECRET_KEY=9aefb2049e7b233a7e3725b8495a86d5e7a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# App Configuration
APP_NAME="Astute Bridge"
DEBUG=True
```

#### Step 1.3: Run Database Migrations
We use Alembic to manage database schema migrations. Apply migrations to initialize the PostgreSQL schema:

```powershell
alembic upgrade head
```
*Note: This creates the tables defined in [rm_models.py](file:///c:/Users/Amit/Desktop/Audi/backend/app/models/rm_models.py).*

#### Step 1.4: Seed Lookup Tables
Run the database seed script to populate lookups like stores, PO status, procurement sources, and material types:

```powershell
python scripts/seed_data.py
```
*Note: This runs [seed_data.py](file:///c:/Users/Amit/Desktop/Audi/backend/scripts/seed_data.py).*

#### Step 1.5: Ingest Initial Raw Material Master Data
Ingest raw materials data from the Excel template `Stock report (APR-26) 30.04.26.xlsx` located in the backend root:

```powershell
# Perform a dry-run first to validate the data quality
python scripts/ingest_rm_master.py --file "Stock report (APR-26) 30.04.26.xlsx" --dry-run

# Commit data ingestion to the database
python scripts/ingest_rm_master.py --file "Stock report (APR-26) 30.04.26.xlsx"
```
*Note: This runs the [ingest_rm_master.py](file:///c:/Users/Amit/Desktop/Audi/backend/scripts/ingest_rm_master.py) script.*

#### Step 1.6: Start FastAPI Server
Start the development server with hot-reloading active:

```powershell
uvicorn app.main:app --reload --port 8000
```
- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. Frontend Setup

The React client code is located in the [frontend](file:///c:/Users/Amit/Desktop/Audi/frontend) directory.

#### Step 2.1: Install Node Modules
Open a new terminal in the [frontend](file:///c:/Users/Amit/Desktop/Audi/frontend) folder and run:

```powershell
npm install
```
*Note: Refer to [package.json](file:///c:/Users/Amit/Desktop/Audi/frontend/package.json) for Javascript dependency declarations.*

#### Step 2.2: Configure Environment Settings
Check or edit [frontend/.env](file:///c:/Users/Amit/Desktop/Audi/frontend/.env) to point to the backend API:

```ini
VITE_API_URL=http://localhost:8000/api/v1
```

#### Step 2.3: Start Vite Development Server
Run the local Vite web server:

```powershell
npm run dev
```
- **Local Application Link**: [http://localhost:5173](http://localhost:5173)

---

## 🔐 Credentials & Authentication

The authentication system is configured with default local development credentials in [routes.py](file:///c:/Users/Amit/Desktop/Audi/backend/app/modules/auth/routes.py):

- **Username**: `admin`
- **Password**: `admin`

Simply type these credentials in the login page of the application to gain access to the dashboard and management views.

---

## 🔧 Troubleshooting

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **Port 5432 already in use** | Another Postgres server instance is running on your host machine. | Stop the local Postgres service, run Docker on a different port, or update the ports in `.env`. |
| **asyncpg connection refused** | Database server is not running or credentials in `.env` are mismatched. | Confirm your PostgreSQL server status and check that the user, password, and port in `DATABASE_URL` in [backend/.env](file:///c:/Users/Amit/Desktop/Audi/backend/.env) are correct. |
| **ModuleNotFoundError: No module named 'app'** | `uvicorn` command or python scripts are run from the wrong directory. | Always run python scripts and the `uvicorn` server command from inside the [backend](file:///c:/Users/Amit/Desktop/Audi/backend) folder with the virtual environment activated. |
| **JWT 401 Unauthorized errors** | Missing or expired token on API requests. | Log out and log back in using the credentials above to refresh the local storage JWT. |
| **Alembic Target Metadata matches no models** | Models were not imported during Alembic configuration. | Verify that the models are imported inside [env.py](file:///c:/Users/Amit/Desktop/Audi/backend/migrations/env.py) to enable Alembic's autogenerate functionality. |
