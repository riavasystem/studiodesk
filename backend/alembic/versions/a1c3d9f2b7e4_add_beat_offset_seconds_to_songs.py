"""add beat_offset_seconds to songs

Revision ID: a1c3d9f2b7e4
Revises: e71ab7ae94f4
Create Date: 2026-07-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1c3d9f2b7e4'
down_revision: Union[str, None] = 'e71ab7ae94f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('songs', sa.Column('beat_offset_seconds', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('songs', 'beat_offset_seconds')
