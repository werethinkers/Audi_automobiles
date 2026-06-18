# app/modules/procurement/routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.rm_models import RmPurchaseOrder, RmPurchaseOrderDetails, RmReceivingLog, GrnDetail, PoStatusMaster
from app.modules.inventory.service import InventoryService
from .schemas import (
    RmPurchaseOrderCreate, RmPurchaseOrderResponse, RmPurchaseOrderStatusUpdate,
    RmReceivingLogCreate, RmReceivingLogResponse
)
from uuid import UUID
from typing import List, Optional
from decimal import Decimal
import uuid

router = APIRouter()

@router.get('/po-statuses')
async def list_po_statuses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PoStatusMaster).order_by(PoStatusMaster.sort_order.asc()))
    return list(result.scalars().all())

# ── PO ROUTES ────────────────────────────────────────
@router.get('/purchase-orders', response_model=List[RmPurchaseOrderResponse])
async def list_purchase_orders(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
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
    user=Depends(get_current_user)
):
    # Calculate PO line amounts and total amount
    total_amount = Decimal('0.0')
    total_with_tax = Decimal('0.0')
    po_details = []
    
    # Create the PO object first
    po = RmPurchaseOrder(
        po_number=data.po_number,
        vendor_id=data.vendor_id,
        order_date=data.order_date,
        expected_date=data.expected_date,
        status=data.status,
        po_type=data.po_type,
        total_weight_kg=Decimal(str(data.total_weight_kg)) if data.total_weight_kg else None,
        total_amount=Decimal('0.0'),
        total_with_tax=Decimal('0.0'),
        freight_amount=Decimal(str(data.freight_amount)),
        payment_terms_days=data.payment_terms_days,
        remarks=data.remarks,
        custom_fields=data.custom_fields,
        created_by=user.user_id
    )
    db.add(po)
    await db.flush() # get po.po_id
    
    for detail_in in data.details:
        gst = Decimal(str(detail_in.gst_rate_pct or 18.0))
        qty = Decimal(str(detail_in.ordered_quantity))
        price = Decimal(str(detail_in.unit_price))
        
        line_amount = qty * price
        line_tax = line_amount * (gst / 100)
        line_total_with_tax = line_amount + line_tax
        
        total_amount += line_amount
        total_with_tax += line_total_with_tax
        
        detail = RmPurchaseOrderDetails(
            po_id=po.po_id,
            rm_id=detail_in.rm_id,
            ordered_quantity=qty,
            received_quantity=Decimal('0.0'),
            unit_price=price,
            price_per_kg=Decimal(str(detail_in.price_per_kg)) if detail_in.price_per_kg else None,
            price_basis=detail_in.price_basis,
            calculated_weight=Decimal(str(detail_in.calculated_weight)) if detail_in.calculated_weight else None,
            line_total_amount=line_amount,
            line_total_with_tax=line_total_with_tax,
            hsn_code=detail_in.hsn_code,
            gst_rate_pct=gst,
            line_cgst=Decimal(str(detail_in.line_cgst or 0)),
            line_sgst=Decimal(str(detail_in.line_sgst or 0)),
            line_igst=Decimal(str(detail_in.line_igst or 0)),
            status='PENDING',
            custom_fields=detail_in.custom_fields
        )
        db.add(detail)
        po_details.append(detail)
        
    po.total_amount = total_amount
    po.total_with_tax = total_with_tax
    await db.flush()
    await db.refresh(po)
    
    # Pre-populate details list for response serialization
    po.details = po_details
    return po

@router.get('/purchase-orders/{po_id}', response_model=RmPurchaseOrderResponse)
async def get_purchase_order(
    po_id: UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
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
    stmt = (
        select(RmPurchaseOrder)
        .options(selectinload(RmPurchaseOrder.details))
        .where(RmPurchaseOrder.po_id == po_id)
    )
    result = await db.execute(stmt)
    po = result.scalar_one_or_none()
    if not po:
        raise HTTPException(404, 'Purchase Order not found')
        
    po.status = status_data.status
    await db.flush()
    await db.refresh(po)
    return po

# ── GRN ROUTES ────────────────────────────────────────
@router.get('/grn', response_model=List[RmReceivingLogResponse])
async def list_grn(
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user)
):
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
    user=Depends(get_current_user)
):
    grn = RmReceivingLog(
        grn_number=data.grn_number,
        po_id=data.po_id,
        vendor_id=data.vendor_id,
        received_date=data.received_date,
        vehicle_number=data.vehicle_number,
        grn_status=data.grn_status or 'PENDING_QC',
        notes=data.notes,
        gate_entry_id=data.gate_entry_id,
        gate_log_id=data.gate_log_id,
        received_by=user.user_id
    )
    db.add(grn)
    await db.flush() # get grn.grn_id
    
    inv_service = InventoryService(db)
    grn_details = []
    
    for detail_in in data.details:
        rec_qty = Decimal(str(detail_in.qty_received))
        acc_qty = Decimal(str(detail_in.qty_accepted)) if detail_in.qty_accepted is not None else rec_qty
        rej_qty = Decimal(str(detail_in.qty_rejected or 0.0))
        
        detail = GrnDetail(
            grn_id=grn.grn_id,
            po_detail_id=detail_in.po_detail_id,
            batch_code=detail_in.batch_code,
            rm_id=detail_in.rm_id,
            qty_received=rec_qty,
            qty_accepted=acc_qty,
            qty_rejected=rej_qty,
            rejection_reason=detail_in.rejection_reason,
            weight_received_kg=Decimal(str(detail_in.weight_received_kg)) if detail_in.weight_received_kg else None,
            uom=detail_in.uom,
            batch_status=detail_in.batch_status,
            destination_store_id=detail_in.destination_store_id,
            assigned_operator_id=detail_in.assigned_operator_id,
            bin_location=detail_in.bin_location,
            location_type=detail_in.location_type,
            fifo_rank=detail_in.fifo_rank,
            custom_fields=detail_in.custom_fields
        )
        db.add(detail)
        grn_details.append(detail)
        
        if acc_qty > 0 and detail_in.destination_store_id:
            await inv_service.grn_post(
                rm_id=detail_in.rm_id,
                store_id=detail_in.destination_store_id,
                accepted_qty=acc_qty,
                grn_id=grn.grn_id,
                user_id=user.user_id
            )
            
        # Update received_qty on PO detail
        if detail_in.po_detail_id:
            po_detail = await db.get(RmPurchaseOrderDetails, detail_in.po_detail_id)
            if po_detail:
                po_detail.received_quantity = (po_detail.received_quantity or Decimal('0.0')) + acc_qty
                if po_detail.received_quantity >= po_detail.ordered_quantity:
                    po_detail.status = 'COMPLETED'
                else:
                    po_detail.status = 'PARTIALLY_RECEIVED'

    await db.flush()
    await db.refresh(grn)
    grn.details = grn_details
    return grn
