"""add user addresses

Revision ID: 0002_user_addresses
Revises: 0001_init
Create Date: 2026-03-05
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_user_addresses"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_addresses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False, server_default="Home"),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("comment", sa.String(length=255), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_user_addresses_user_id", "user_addresses", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_addresses_user_id", table_name="user_addresses")
    op.drop_table("user_addresses")
