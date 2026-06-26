"""merge heads

Revision ID: 72679df3ae7e
Revises: ba17d284be21, ea8b2f6f8a8d
Create Date: 2026-06-24 16:30:05.755493

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72679df3ae7e'
down_revision: Union[str, None] = ('ba17d284be21', 'ea8b2f6f8a8d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
