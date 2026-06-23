"""add_grn_dc_number

Revision ID: ea8b2f6f8a8d
Revises: f8f08f7751dc
Create Date: 2026-06-23 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'ea8b2f6f8a8d'
down_revision = 'f8f08f7751dc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('rm_receiving_log', sa.Column('dc_number', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('rm_receiving_log', 'dc_number')
