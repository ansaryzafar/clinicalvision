"""add_contact_messages_table

Durable inbox + email outbox for the public contact form and the
research-demo request form.

Revision ID: c3f8a2d41b6e
Revises: b7e2a1f34c89
Create Date: 2026-11-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c3f8a2d41b6e'
down_revision: Union[str, Sequence[str], None] = 'b7e2a1f34c89'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'contact_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=False),
        sa.Column('company', sa.String(length=200), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('role', sa.String(length=100), nullable=True),
        sa.Column('subject', sa.String(length=200), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('delivery_status', sa.String(length=10), nullable=False, server_default='pending'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('last_attempt_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_attempt_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_contact_messages_created_at', 'contact_messages', ['created_at'])
    op.create_index('ix_contact_messages_is_deleted', 'contact_messages', ['is_deleted'])
    op.create_index('ix_contact_messages_kind', 'contact_messages', ['kind'])
    op.create_index('ix_contact_messages_delivery_status', 'contact_messages', ['delivery_status'])
    op.create_index('ix_contact_messages_next_attempt_at', 'contact_messages', ['next_attempt_at'])


def downgrade() -> None:
    op.drop_index('ix_contact_messages_next_attempt_at', table_name='contact_messages')
    op.drop_index('ix_contact_messages_delivery_status', table_name='contact_messages')
    op.drop_index('ix_contact_messages_kind', table_name='contact_messages')
    op.drop_index('ix_contact_messages_is_deleted', table_name='contact_messages')
    op.drop_index('ix_contact_messages_created_at', table_name='contact_messages')
    op.drop_table('contact_messages')
