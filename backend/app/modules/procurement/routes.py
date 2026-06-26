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
    total_amount = Decimal('0.0')
    po_details = []
    
    for detail_in in data.details:
        gst = Decimal(str(detail_in.gst_percent or 0.0))
        qty = Decimal(str(detail_in.order_qty))
        price = Decimal(str(detail_in.unit_price))
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
    await db.flush()
    
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

@router.put('/purchase-orders/{po_id}', response_model=RmPurchaseOrderResponse)
async def update_purchase_order(
    po_id: UUID,
    data: RmPurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Update a Purchase Order by its ID.
    Replaces existing line items with the provided ones.
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
        
    po.po_number = data.po_number
    po.vendor_id = data.vendor_id
    po.order_date = data.order_date
    po.expected_delivery_date = data.expected_delivery_date
    po.status_id = data.status_id
    po.notes = data.notes

    # Clear old details and create new ones
    po.details.clear()
    
    total_amount = Decimal('0.0')
    for detail_in in data.details:
        qty = Decimal(str(detail_in.order_qty))
        price = Decimal(str(detail_in.unit_price))
        gst = Decimal(str(detail_in.gst_percent or 0))
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
        po.details.append(detail)
        
    po.total_amount = total_amount
    try:
        await db.flush()
    except Exception as e:
        raise HTTPException(400, f'Failed to update PO: {str(e)}')
    
    await db.refresh(po)
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
    """
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
    await db.refresh(po)
    return po

@router.delete('/purchase-orders/{po_id}', status_code=204)
async def delete_purchase_order(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Delete a Purchase Order permanently.
    Purpose: Allows admin to remove a PO record.
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
    await db.delete(po)
    await db.flush()
 
# ── GRN ROUTES ────────────────────────────────────────
@router.get('/grn', response_model=List[RmReceivingLogResponse])
async def list_grn(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Fetch a list of Goods Receipt Notes (GRN).
    """
    stmt = (
        select(RmReceivingLog)
        .options(selectinload(RmReceivingLog.details))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
 
@router.get('/grn/{grn_id}', response_model=RmReceivingLogResponse)
async def get_grn(
    grn_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Fetch a single Goods Receipt Note (GRN) by its ID.
    """
    stmt = (
        select(RmReceivingLog)
        .options(selectinload(RmReceivingLog.details))
        .where(RmReceivingLog.grn_id == grn_id)
    )
    result = await db.execute(stmt)
    grn = result.scalar_one_or_none()
    if not grn:
        raise HTTPException(404, 'GRN not found')
    return grn
 
@router.post('/grn', response_model=RmReceivingLogResponse, status_code=201)
async def create_grn(
    data: RmReceivingLogCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Create a new Goods Receipt Note (GRN) when a delivery arrives.
    Cross-module: updates PO line statuses and posts stock to inventory.
    """
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
    await db.flush()
    
    inv_service = InventoryService(db)
    grn_details = []
    
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
        
        if acc_qty > 0:
            await inv_service.grn_post(
                rm_id=detail_in.rm_id,
                store_id=detail_in.store_id,
                accepted_qty=acc_qty,
                grn_id=grn.grn_id
            )
            
        po_detail = await db.get(RmPoDetail, detail_in.po_detail_id)
        if po_detail:
            po_detail.received_qty = (po_detail.received_qty or Decimal('0.0')) + acc_qty
            if po_detail.received_qty >= po_detail.order_qty:
                po_detail.line_status = 'COMPLETED'
            else:
                po_detail.line_status = 'PARTIALLY_RECEIVED'
 
    await db.flush()

    stmt = (
        select(RmReceivingLog)
        .options(selectinload(RmReceivingLog.details))
        .where(RmReceivingLog.grn_id == grn.grn_id)
    )
    result = await db.execute(stmt)
    grn = result.scalar_one()
    return grn

@router.put('/grn/{grn_id}', response_model=RmReceivingLogResponse)
async def update_grn(
    grn_id: UUID,
    data: RmReceivingLogCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Update an existing Goods Receipt Note (GRN).
    Adjusts inventory and PO line statuses based on delta quantities.
    """
    stmt = (
        select(RmReceivingLog)
        .options(selectinload(RmReceivingLog.details))
        .where(RmReceivingLog.grn_id == grn_id)
    )
    result = await db.execute(stmt)
    grn = result.scalar_one_or_none()
    if not grn:
        raise HTTPException(404, 'GRN not found')
        
    grn.grn_number = data.grn_number
    grn.po_id = data.po_id
    grn.vendor_id = data.vendor_id
    grn.received_date = data.received_date
    grn.vehicle_number = data.vehicle_number
    grn.dc_number = data.dc_number
    grn.grn_status = data.grn_status or 'PENDING_QA'
    grn.remarks = data.remarks
    
    inv_service = InventoryService(db)
    
    old_details_map = {d.po_detail_id: d for d in grn.details}
    
    for detail_in in data.details:
        rec_qty = Decimal(str(detail_in.received_qty))
        acc_qty = Decimal(str(detail_in.accepted_qty)) if detail_in.accepted_qty is not None else rec_qty
        rej_qty = Decimal(str(detail_in.rejected_qty or 0.0))
        
        old_detail = old_details_map.get(detail_in.po_detail_id)
        if old_detail:
            diff_acc = acc_qty - (old_detail.accepted_qty or Decimal('0.0'))
            
            old_detail.received_qty = rec_qty
            old_detail.accepted_qty = acc_qty
            old_detail.rejected_qty = rej_qty
            old_detail.rejection_reason = detail_in.rejection_reason
            old_detail.store_id = detail_in.store_id
            
            if diff_acc != 0:
                await inv_service.post_transaction(
                    rm_id=detail_in.rm_id,
                    store_id=detail_in.store_id,
                    qty=diff_acc,
                    transaction_type='GRN_ADJUSTMENT',
                    reference_type='GRN', reference_id=grn.grn_id
                )
                
                po_detail = await db.get(RmPoDetail, detail_in.po_detail_id)
                if po_detail:
                    po_detail.received_qty = (po_detail.received_qty or Decimal('0.0')) + diff_acc
                    if po_detail.received_qty >= po_detail.order_qty:
                        po_detail.line_status = 'COMPLETED'
                    else:
                        po_detail.line_status = 'PARTIALLY_RECEIVED'
        else:
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
            
            if acc_qty > 0:
                await inv_service.grn_post(
                    rm_id=detail_in.rm_id,
                    store_id=detail_in.store_id,
                    accepted_qty=acc_qty,
                    grn_id=grn.grn_id
                )
                
                po_detail = await db.get(RmPoDetail, detail_in.po_detail_id)
                if po_detail:
                    po_detail.received_qty = (po_detail.received_qty or Decimal('0.0')) + acc_qty
                    if po_detail.received_qty >= po_detail.order_qty:
                        po_detail.line_status = 'COMPLETED'
                    else:
                        po_detail.line_status = 'PARTIALLY_RECEIVED'

    try:
        await db.flush()
    except Exception as e:
        raise HTTPException(400, f'Failed to update GRN: {str(e)}')
        
    await db.refresh(grn)
    return grn

@router.delete('/grn/{grn_id}', status_code=204)
async def delete_grn(
    grn_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Delete a GRN record permanently.
    Purpose: Allows admin to remove a GRN entry.
    """
    stmt = (
        select(RmReceivingLog)
        .options(selectinload(RmReceivingLog.details))
        .where(RmReceivingLog.grn_id == grn_id)
    )
    result = await db.execute(stmt)
    grn = result.scalar_one_or_none()
    if not grn:
        raise HTTPException(404, 'GRN not found')
    await db.delete(grn)
    await db.flush()
