from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
 
# Create the asynchronous SQLAlchemy engine to connect to PostgreSQL.
# Connection pooling is configured to handle multiple concurrent API requests.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)
 
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)
 
class Base(DeclarativeBase):
    pass
 
async def get_db():
    """
    FastAPI Dependency that yields an asynchronous database session.
    Purpose: Automatically manages the transaction lifecycle (commit on success, 
    rollback on exception) for every API request that injects this dependency.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
