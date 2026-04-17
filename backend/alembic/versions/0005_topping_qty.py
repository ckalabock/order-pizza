"""add qty for repeated toppings

Revision ID: 0005_topping_qty
Revises: 0004_stage3
Create Date: 2026-04-09
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_topping_qty"
down_revision = "0004_stage3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "order_item_toppings",
        sa.Column("qty", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    op.drop_column("order_item_toppings", "qty")
