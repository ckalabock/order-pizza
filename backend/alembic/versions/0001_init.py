"""init

Revision ID: 0001_init
Revises:
Create Date: 2026-02-27
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "sizes",
        sa.Column("id", sa.String(10), primary_key=True),
        sa.Column("name", sa.String(40), nullable=False),
        sa.Column("multiplier", sa.Float(), nullable=False),
    )

    op.create_table(
        "toppings",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column("available", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "pizzas",
        sa.Column("id", sa.String(50), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("base_price", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(20), nullable=False),
        sa.Column("image", sa.String(255), nullable=True),
        sa.Column("available", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "orders",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("public_token", sa.String(64), nullable=False, unique=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="created"),
        sa.Column("customer_name", sa.String(120), nullable=False),
        sa.Column("customer_phone", sa.String(40), nullable=False),
        sa.Column("delivery_address", sa.String(255), nullable=False),
        sa.Column("delivery_comment", sa.String(255), nullable=True),
        sa.Column("payment_method", sa.String(20), nullable=False),
        sa.Column("subtotal", sa.Integer(), nullable=False),
        sa.Column("discount", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("delivery_price", sa.Integer(), nullable=False),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_orders_public_token", "orders", ["public_token"], unique=True)

    op.create_table(
        "order_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("order_id", sa.Uuid(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pizza_id", sa.String(50), sa.ForeignKey("pizzas.id"), nullable=False),
        sa.Column("size_id", sa.String(10), sa.ForeignKey("sizes.id"), nullable=False),
        sa.Column("qty", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(120), nullable=False),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"], unique=False)

    op.create_table(
        "order_item_toppings",
        sa.Column(
            "order_item_id",
            sa.Uuid(),
            sa.ForeignKey("order_items.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("topping_id", sa.String(50), sa.ForeignKey("toppings.id"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("order_item_toppings")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_public_token", table_name="orders")
    op.drop_table("orders")
    op.drop_table("pizzas")
    op.drop_table("toppings")
    op.drop_table("sizes")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
