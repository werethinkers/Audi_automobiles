"""Merge migration branches

Revision ID: 8035782e3e9c
Revises: ba17d284be21, ea8b2f6f8a8d
Create Date: 2026-06-25 11:12:54.844894

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8035782e3e9c'
down_revision: Union[str, None] = ('ba17d284be21', 'ea8b2f6f8a8d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
