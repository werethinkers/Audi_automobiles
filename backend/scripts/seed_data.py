import asyncio
import uuid
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.rm_models import ProcurementSourceMaster, MaterialTypeMaster, PoStatusMaster, StoreMaster, RoleMaster, LoginUser

load_dotenv()
db_url = os.environ.get('DATABASE_URL')
engine = create_async_engine(db_url)
Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed():
    async with Session() as db:
        print("Seeding database...")
        
        from sqlalchemy import text
        
        # Clean existing data to allow re-running the seed script safely
        print("Cleaning existing seed data...")
        await db.execute(text("TRUNCATE TABLE role_master, login_users, procurement_source_master, material_type_master, po_status_master, store_master CASCADE"))
        
        from sqlalchemy import select
        
        # 0. Roles and Admin User
        result = await db.execute(select(RoleMaster).where(RoleMaster.role_code == 'ADMIN'))
        admin_role = result.scalar_one_or_none()
        if not admin_role:
            admin_role = RoleMaster(role_code='ADMIN', role_name='Administrator', description='System Admin')
            db.add(admin_role)
            await db.flush()
 
        result = await db.execute(select(LoginUser).where(LoginUser.employee_code == 'EMP001'))
        admin_user = result.scalar_one_or_none()
        if not admin_user:
            admin_user = LoginUser(
                employee_code='EMP001',
                name='Admin User',
                email='admin@audi.local',
                password_hash='hashed_password_here', # Replace with proper hash in prod
                role_id=admin_role.role_code
            )
            db.add(admin_user)
            await db.flush()

        # 1. Procurement Sources
        sources = ['BOP', 'In-House BOP', 'On-Plant', 'Imported', 'Consignment']
        for i, name in enumerate(sources):
            db.add(ProcurementSourceMaster(
                source_code=f'SRC_{i}', source_name=name, description=f"{name} Source", is_active=True
            ))

        # 2. Material Types
        types = ['Raw Material', 'Consumable', 'Semi-Finished', 'Packing Material', 'Capital Item']
        for i, name in enumerate(types):
            db.add(MaterialTypeMaster(
                type_code=f'TYP_{i}', type_name=name, description=f"{name} Type", is_active=True
            ))

        # 3. PO Statuses
        statuses = [
            ('DRAFT', 'Draft'),
            ('PENDING_APPROVAL', 'Pending Approval'),
            ('BLOCKED', 'Blocked - Price Variance'),
            ('RELEASED', 'Released'),
            ('PARTIALLY_RECEIVED', 'Partially Received'),
            ('COMPLETED', 'Completed'),
            ('CANCELLED', 'Cancelled'),
        ]
        for i, (code, name) in enumerate(statuses):
            db.add(PoStatusMaster(status_code=code, name=name, description=name, sort_order=i))

        # 4. Default Stores (Skipped for now due to constraint mismatch)
        # stores = [
        #     ('Main Store', 'MAIN', 'Main Store Location'),
        #     ('Floor Inventory', 'WIP', 'Floor Inventory Location'),
        #     ('Rejection Store', 'REJECT', 'Rejection Store Location'),
        #     ('QA Quarantine', 'QA', 'QA Quarantine Location'),
        # ]
        # for name, stype, location in stores:
        #     db.add(StoreMaster(
        #         store_code=name.upper().replace(' ', '_'),
        #         store_name=name, store_type=stype, store_location=location,
        #         manager_id=admin_user.user_id, is_active=True
        #     ))

        await db.commit()
        print('Seed data inserted successfully.')

if __name__ == "__main__":
    asyncio.run(seed())
