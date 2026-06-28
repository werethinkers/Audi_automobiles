"""Merge heads

Revision ID: 1460bb586a73
Revises: c865b07aaf35, fb3c88bb8890
Create Date: 2026-06-26 17:52:07.803657

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1460bb586a73'
down_revision: Union[str, None] = ('c865b07aaf35', 'fb3c88bb8890')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
