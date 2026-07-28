"""add job_type to stem_jobs

Revision ID: f4d8e21a6c93
Revises: a1c3d9f2b7e4
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4d8e21a6c93'
down_revision: Union[str, None] = 'a1c3d9f2b7e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'stem_jobs',
        sa.Column('job_type', sa.String(length=20), nullable=False, server_default='separate'),
    )


def downgrade() -> None:
    op.drop_column('stem_jobs', 'job_type')
