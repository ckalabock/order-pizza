"""add order bonus_spent

Revision ID: 0003_order_bonus_spent
Revises: 0002_user_addresses
Create Date: 2026-03-06
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_order_bonus_spent"
down_revision = "0002_user_addresses"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("bonus_spent", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("orders", "bonus_spent")
