# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
 
# Import all routers
from app.modules.auth.routes          import router as auth_router
from app.modules.rm_master.routes     import router as rm_router
from app.modules.vendor.routes        import router as vendor_router
from app.modules.store.routes         import router as store_router
from app.modules.procurement.routes   import router as procurement_router
from app.modules.inventory.routes     import router as inventory_router
from app.modules.custom_fields.routes import router as cf_router
 
app = FastAPI(
    title=settings.APP_NAME,
    version='1.0.0',
    description='ERP RM & Inventory Module API',
    docs_url='/docs',
    redoc_url='/redoc',
)
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
 
app.include_router(auth_router,        prefix='/api/v1/auth',            tags=['Authentication'])
app.include_router(rm_router,          prefix='/api/v1/rm-master',      tags=['RM Master'])
app.include_router(vendor_router,      prefix='/api/v1/vendors',         tags=['Vendors'])
app.include_router(store_router,       prefix='/api/v1/stores',          tags=['Stores'])
app.include_router(procurement_router, prefix='/api/v1/procurement',     tags=['Procurement'])
app.include_router(inventory_router,   prefix='/api/v1/inventory',       tags=['Inventory'])
app.include_router(cf_router,          prefix='/api/v1/custom-fields',   tags=['Custom Fields'])
 
@app.get('/health')
async def health():
    return {'status': 'ok', 'version': '1.0.0'}
