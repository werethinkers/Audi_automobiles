from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.models.bom_models import BomMaster, BomDetail, ProductMaster
from app.models.rm_models import RmMaster
from . import schemas

router = APIRouter()

# ─── PRODUCT ENDPOINTS ────────────────────────────────────────────────────────

@router.get("/products", response_model=List[schemas.ProductResponse])
async def list_products(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProductMaster).order_by(ProductMaster.name))
    return result.scalars().all()

@router.get("/products/{product_id}", response_model=schemas.ProductResponse)
async def get_product(product_id: UUID, db: AsyncSession = Depends(get_db)):
    product = await db.get(ProductMaster, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(payload: schemas.ProductCreate, db: AsyncSession = Depends(get_db)):
    # Check for existing code
    if payload.product_code:
        stmt = select(ProductMaster).where(ProductMaster.product_code == payload.product_code)
        existing = await db.execute(stmt)
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Product code already exists")
    
    product = ProductMaster(**payload.model_dump())
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product

@router.put("/products/{product_id}", response_model=schemas.ProductResponse)
async def update_product(product_id: UUID, payload: schemas.ProductUpdate, db: AsyncSession = Depends(get_db)):
    product = await db.get(ProductMaster, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)
        
    await db.commit()
    await db.refresh(product)
    return product

# ─── BOM ENDPOINTS ────────────────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.BomResponse])
async def list_boms(db: AsyncSession = Depends(get_db)):
    # Fetch all BOMs, eagerly loading product and details. For details, also load rm_master? 
    # Let's populate the additional fields manually to fit the schema
    stmt = select(BomMaster).options(
        selectinload(BomMaster.product),
        selectinload(BomMaster.details)
    ).order_by(BomMaster.created_at.desc())
    
    result = await db.execute(stmt)
    boms = result.scalars().all()
    
    # We also need RM details for each BomDetail
    # Let's fetch all relevant RM masters to map rm_name and rm_part_no
    rm_ids = set()
    for b in boms:
        for d in b.details:
            rm_ids.add(d.rm_id)
            
    rm_map = {}
    if rm_ids:
        rm_stmt = select(RmMaster).where(RmMaster.rm_id.in_(rm_ids))
        rm_res = await db.execute(rm_stmt)
        for rm in rm_res.scalars().all():
            rm_map[rm.rm_id] = rm
            
    # Transform response
    response_list = []
    for b in boms:
        bom_dict = {
            "bom_id": b.bom_id,
            "product_id": b.product_id,
            "bom_number": b.bom_number,
            "description": b.description,
            "is_active": b.is_active,
            "created_at": b.created_at,
            "updated_at": b.updated_at,
            "product_name": b.product.name if b.product else None,
            "product_code": b.product.product_code if b.product else None,
            "details": []
        }
        for d in b.details:
            rm = rm_map.get(d.rm_id)
            bom_dict["details"].append({
                "bom_detail_id": d.bom_detail_id,
                "bom_id": d.bom_id,
                "rm_id": d.rm_id,
                "quantity": d.quantity,
                "uom": d.uom or (rm.unit_of_measurement if rm else None),
                "scrap_percentage": d.scrap_percentage,
                "rm_name": rm.name if rm else "Unknown",
                "rm_part_no": rm.part_no if rm else None
            })
        response_list.append(bom_dict)

    return response_list

@router.get("/{bom_id}", response_model=schemas.BomResponse)
async def get_bom(bom_id: UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(BomMaster).where(BomMaster.bom_id == bom_id).options(
        selectinload(BomMaster.product),
        selectinload(BomMaster.details)
    )
    result = await db.execute(stmt)
    bom = result.scalars().first()
    
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")
        
    rm_ids = [d.rm_id for d in bom.details]
    rm_map = {}
    if rm_ids:
        rm_stmt = select(RmMaster).where(RmMaster.rm_id.in_(rm_ids))
        rm_res = await db.execute(rm_stmt)
        for rm in rm_res.scalars().all():
            rm_map[rm.rm_id] = rm
            
    bom_dict = {
        "bom_id": bom.bom_id,
        "product_id": bom.product_id,
        "bom_number": bom.bom_number,
        "description": bom.description,
        "is_active": bom.is_active,
        "created_at": bom.created_at,
        "updated_at": bom.updated_at,
        "product_name": bom.product.name if bom.product else None,
        "product_code": bom.product.product_code if bom.product else None,
        "details": []
    }
    for d in bom.details:
        rm = rm_map.get(d.rm_id)
        bom_dict["details"].append({
            "bom_detail_id": d.bom_detail_id,
            "bom_id": d.bom_id,
            "rm_id": d.rm_id,
            "quantity": d.quantity,
            "uom": d.uom or (rm.unit_of_measurement if rm else None),
            "scrap_percentage": d.scrap_percentage,
            "rm_name": rm.name if rm else "Unknown",
            "rm_part_no": rm.part_no if rm else None
        })
        
    return bom_dict

@router.post("/", response_model=schemas.BomResponse, status_code=status.HTTP_201_CREATED)
async def create_bom(payload: schemas.BomCreate, db: AsyncSession = Depends(get_db)):
    # Check if product exists
    product = await db.get(ProductMaster, payload.product_id)
    if not product:
        raise HTTPException(status_code=400, detail="Product not found")
        
    # Check for existing BOM number
    stmt = select(BomMaster).where(BomMaster.bom_number == payload.bom_number)
    existing = await db.execute(stmt)
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="BOM number already exists")
        
    bom = BomMaster(
        product_id=payload.product_id,
        bom_number=payload.bom_number,
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(bom)
    await db.flush() # To get bom_id
    
    for d in payload.details:
        detail = BomDetail(
            bom_id=bom.bom_id,
            rm_id=d.rm_id,
            quantity=d.quantity,
            uom=d.uom,
            scrap_percentage=d.scrap_percentage
        )
        db.add(detail)
        
    await db.commit()
    
    # Return via get_bom to properly fetch relationships and RM info
    return await get_bom(bom.bom_id, db)

@router.put("/{bom_id}", response_model=schemas.BomResponse)
async def update_bom(bom_id: UUID, payload: schemas.BomUpdate, db: AsyncSession = Depends(get_db)):
    stmt = select(BomMaster).where(BomMaster.bom_id == bom_id).options(selectinload(BomMaster.details))
    result = await db.execute(stmt)
    bom = result.scalars().first()
    
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")
        
    if payload.bom_number is not None and payload.bom_number != bom.bom_number:
        stmt_check = select(BomMaster).where(BomMaster.bom_number == payload.bom_number)
        existing = await db.execute(stmt_check)
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="BOM number already exists")
        bom.bom_number = payload.bom_number
        
    if payload.description is not None:
        bom.description = payload.description
    if payload.is_active is not None:
        bom.is_active = payload.is_active
        
    if payload.details is not None:
        # Delete existing details
        for d in bom.details:
            await db.delete(d)
        bom.details.clear()
        
        # Add new details
        for d in payload.details:
            detail = BomDetail(
                bom_id=bom.bom_id,
                rm_id=d.rm_id,
                quantity=d.quantity,
                uom=d.uom,
                scrap_percentage=d.scrap_percentage
            )
            db.add(detail)
            bom.details.append(detail)
            
    await db.commit()
    return await get_bom(bom_id, db)
