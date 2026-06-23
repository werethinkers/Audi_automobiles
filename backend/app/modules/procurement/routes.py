# app/modules/procurement/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rm_models import RmPurchaseOrder, RmPoDetail, RmReceivingLog, GrnDetail, PoStatusMaster
from app.modules.inventory.service import InventoryService
from .schemas import (
    RmPurchaseOrderCreate, RmPurchaseOrderResponse, RmPurchaseOrderStatusUpdate,
    RmReceivingLogCreate, RmReceivingLogResponse
)
from uuid import UUID
from typing import List, Optional
from decimal import Decimal
 
router = APIRouter()
 
@router.get('/po-statuses')
async def list_po_statuses(db: AsyncSession = Depends(get_db)):
    """
    Fetch all available PO statuses (e.g., OPEN, APPROVED, CLOSED).
    Purpose: Used by the frontend dropdowns to display valid status transitions
    for Purchase Orders within the procurement module.
    """
    result = await db.execute(select(PoStatusMaster).order_by(PoStatusMaster.code.asc()))
    return list(result.scalars().all())
 
# ── PO ROUTES ────────────────────────────────────────
@router.get('/purchase-orders', response_model=List[RmPurchaseOrderResponse])
async def list_purchase_orders(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Fetch a paginated list of Purchase Orders along with their associated details.
    Purpose: Serves the primary data grid on the PO Management page. Uses `selectinload`
    to efficiently fetch child line items (details) avoiding N+1 query problems.
    """
    stmt = (
        select(RmPurchaseOrder)
        .options(selectinload(RmPurchaseOrder.details))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
 
@router.post('/purchase-orders', response_model=RmPurchaseOrderResponse, status_code=201)
async def create_purchase_order(
    data: RmPurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Create a new Purchase Order (Header) along with its line items (Details).
    Purpose: This is the core entry point for ordering Raw Materials from vendors.
    It automatically calculates line amounts including GST, aggregates the total
    PO amount, and persists the hierarchical data (header + children) together.
    """
    # Calculate PO line amounts and total amount programmatically
    total_amount = Decimal('0.0')
    po_details = []
    
    # Iterate through requested line items to prepare child records
    for detail_in in data.details:
        gst = Decimal(str(detail_in.gst_percent or 0.0))
        qty = Decimal(str(detail_in.order_qty))
        price = Decimal(str(detail_in.unit_price))
        
        # Calculate line total: (Qty * Price) + GST
        line_amount = qty * price * (1 + gst / 100)
        total_amount += line_amount
        
        detail = RmPoDetail(
            rm_id=detail_in.rm_id,
            order_qty=qty,
            received_qty=Decimal('0.0'),
            unit_price=price,
            gst_percent=gst,
            line_amount=line_amount,
            line_status='OPEN'
        )
        po_details.append(detail)
        
    # Construct the parent PO record with the aggregated total and child items
    po = RmPurchaseOrder(
        po_number=data.po_number,
        vendor_id=data.vendor_id,
        order_date=data.order_date,
        expected_delivery_date=data.expected_delivery_date,
        status_id=data.status_id,
        notes=data.notes,
        total_amount=total_amount,
        details=po_details
    )
    db.add(po)
    await db.flush() # Send changes to DB to generate primary keys without committing
    
    # Reload with details using eager loading (`selectinload`) to ensure it is 
    # fully populated for the Pydantic response model and to prevent MissingGreenlet errors.
    stmt = (
        select(RmPurchaseOrder)
        .options(selectinload(RmPurchaseOrder.details))
        .where(RmPurchaseOrder.po_id == po.po_id)
    )
    result = await db.execute(stmt)
    po = result.scalar_one()
    return po
 
@router.get('/purchase-orders/{po_id}', response_model=RmPurchaseOrderResponse)
async def get_purchase_order(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Fetch a single Purchase Order by its ID.
    Purpose: Used when opening a specific PO for viewing or editing. Eagerly 
    loads details so the frontend has complete context of the ordered items.
    """
    stmt = (
        select(RmPurchaseOrder)
        .options(selectinload(RmPurchaseOrder.details))
        .where(RmPurchaseOrder.po_id == po_id)
    )
    result = await db.execute(stmt)
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(404, 'Purchase Order not found')
    return po
 
@router.put('/purchase-orders/{po_id}/status', response_model=RmPurchaseOrderResponse)
async def update_po_status(
    po_id: UUID,
    status_data: RmPurchaseOrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Update the lifecycle status of a PO (e.g., from DRAFT to APPROVED).
    Purpose: Drives the procurement workflow state machine. Validates against
    the Status Master table to prevent invalid states.
    """
    # Verify status exists in the master table
    status_exists = await db.get(PoStatusMaster, status_data.status_id)
    if not status_exists:
        raise HTTPException(400, 'Invalid status ID')
        
    stmt = (
        select(RmPurchaseOrder)
        .options(selectinload(RmPurchaseOrder.details))
        .where(RmPurchaseOrder.po_id == po_id)
    )
    result = await db.execute(stmt)
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(404, 'Purchase Order not found')
        
    po.status_id = status_data.status_id
    await db.flush()
    # Note: refresh() here is safe because we already eager-loaded relationships
    await db.refresh(po)
    return po
 
# ── GRN ROUTES ────────────────────────────────────────
@router.get('/grn', response_model=List[RmReceivingLogResponse])
async def list_grn(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Fetch a list of Goods Receipt Notes (GRN).
    Purpose: Drives the GRN Log grid, showing historical receipts of raw materials
    along with their detailed line items.
    """
    stmt = (
        select(RmReceivingLog)
        .options(selectinload(RmReceivingLog.details))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
 
@router.post('/grn', response_model=RmReceivingLogResponse, status_code=201)
async def create_grn(
    data: RmReceivingLogCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Create a new Goods Receipt Note (GRN) when a delivery arrives.
    Purpose: This is a highly critical cross-module boundary function.
    1. It logs the physical receipt of goods from a vendor.
    2. It updates the parent Purchase Order line item's 'received_qty' and status.
    3. It talks to the Inventory module (`InventoryService`) to instantly
       update stock levels (Stock Ledgers/Balances) for any accepted quantities.
    """
    # 1. Create the GRN Header record
    grn = RmReceivingLog(
        grn_number=data.grn_number,
        po_id=data.po_id,
        vendor_id=data.vendor_id,
        received_date=data.received_date,
        vehicle_number=data.vehicle_number,
        dc_number=data.dc_number,
        grn_status=data.grn_status or 'PENDING_QA',
        remarks=data.remarks
    )
    db.add(grn)
    await db.flush() # Flush to generate grn.grn_id required for child rows
    
    inv_service = InventoryService(db)
    grn_details = []
    
    # 2. Process each receipt line item
    for detail_in in data.details:
        rec_qty = Decimal(str(detail_in.received_qty))
        acc_qty = Decimal(str(detail_in.accepted_qty)) if detail_in.accepted_qty is not None else rec_qty
        rej_qty = Decimal(str(detail_in.rejected_qty or 0.0))
        
        detail = GrnDetail(
            grn_id=grn.grn_id,
            po_detail_id=detail_in.po_detail_id,
            rm_id=detail_in.rm_id,
            received_qty=rec_qty,
            accepted_qty=acc_qty,
            rejected_qty=rej_qty,
            rejection_reason=detail_in.rejection_reason,
            store_id=detail_in.store_id
        )
        db.add(detail)
        grn_details.append(detail)
        
        # 3. Post to Inventory (if goods are accepted)
        # We delegate stock movement logic to the dedicated InventoryService.
        if acc_qty > 0:
            await inv_service.grn_post(
                rm_id=detail_in.rm_id,
                store_id=detail_in.store_id,
                accepted_qty=acc_qty,
                grn_id=grn.grn_id
            )
            
        # 4. Update parent PO fulfillment status
        # We find the original PO line item and increment its received quantity.
        po_detail = await db.get(RmPoDetail, detail_in.po_detail_id)
        if po_detail:
            po_detail.received_qty = (po_detail.received_qty or Decimal('0.0')) + acc_qty
            
            # Mark the line item as fully or partially completed based on fulfillment
            if po_detail.received_qty >= po_detail.order_qty:
                po_detail.line_status = 'COMPLETED'
            else:
                po_detail.line_status = 'PARTIALLY_RECEIVED'
 
    await db.flush()

    # Load the GRN including its detail lines using selectinload.
    # This avoids a lazy-load on the async session when FastAPI serializes the response.
    stmt = (
        select(RmReceivingLog)
        .options(selectinload(RmReceivingLog.details))
        .where(RmReceivingLog.grn_id == grn.grn_id)
    )
    result = await db.execute(stmt)
    grn = result.scalar_one()
    return grn
