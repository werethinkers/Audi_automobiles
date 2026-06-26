# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
 
# ── ROUTER IMPORTS ────────────────────────────────────
# Import modular API routers. Each module represents a distinct business domain.
from app.modules.auth.routes          import router as auth_router
from app.modules.rm_master.routes     import router as rm_router
from app.modules.vendor.routes        import router as vendor_router
from app.modules.store.routes         import router as store_router
from app.modules.procurement.routes   import router as procurement_router
from app.modules.inventory.routes     import router as inventory_router
from app.modules.station.routes       import router as station_router

# ── APP INITIALIZATION ────────────────────────────────
# Main FastAPI application instance. This is the entry point for Uvicorn.
app = FastAPI(
    title=settings.APP_NAME,
    version='1.0.0',
    description='ERP RM & Inventory Module API',
    docs_url='/docs',
    redoc_url='/redoc',
)
 
# ── MIDDLEWARE ────────────────────────────────────────
# Configure CORS to allow the frontend React app to communicate with this backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
 
# ── ROUTE REGISTRATION ────────────────────────────────
# Mount all domain routers under the /api/v1 prefix to support versioning.
from app.modules.vendor_portal.routes import router as vendor_portal_router

from app.modules.vendor_portal_admin.routes import router as vendor_portal_admin_router

app.include_router(auth_router,        prefix='/api/v1/auth',            tags=['Authentication'])
app.include_router(rm_router,          prefix='/api/v1/rm-master',      tags=['RM Master'])
app.include_router(vendor_router,      prefix='/api/v1/vendors',         tags=['Vendors'])
app.include_router(store_router,       prefix='/api/v1/stores',          tags=['Stores'])
app.include_router(station_router,     prefix='/api/v1/stations',        tags=['Stations'])
app.include_router(procurement_router, prefix='/api/v1/procurement',     tags=['Procurement'])
app.include_router(inventory_router,   prefix='/api/v1/inventory',       tags=['Inventory'])
app.include_router(vendor_portal_router, prefix='/api/v1/portal',        tags=['Vendor Portal'])
app.include_router(vendor_portal_admin_router, prefix='/api/v1/admin/vendor-portal', tags=['Admin Vendor Portal'])

@app.get('/health')
async def health():
    return {'status': 'ok', 'version': '1.0.0'}
