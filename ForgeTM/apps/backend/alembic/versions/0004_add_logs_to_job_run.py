"""add logs column to job_run

Revision ID: 0004_add_logs_to_job_run
Revises: 0003_add_used_caps_to_job_run
Create Date: 2025-10-31 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0004_add_logs_to_job_run'
down_revision = '0003_add_used_caps_to_job_run'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add a textual 'logs' snapshot column to job_run so the API can attach
    # on-disk logs into the DB for export and faster reads.
    op.add_column('job_run', sa.Column('logs', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('job_run', 'logs')
