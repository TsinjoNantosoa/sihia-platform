"""Tables pipeline Airflow (runs, snapshots analytics, features ML).

Revision ID: 003
Revises: 002
Create Date: 2026-06-10
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pipeline_runs",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("dag_id", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("started_at", sa.Text(), nullable=False),
        sa.Column("finished_at", sa.Text()),
        sa.Column("metrics", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("error", sa.Text()),
    )
    op.create_index("ix_pipeline_runs_dag", "pipeline_runs", ["dag_id", "started_at"])

    op.create_table(
        "analytics_snapshots",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("snapshot_key", sa.Text(), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.Text(), nullable=False),
    )
    op.create_index("ix_analytics_snapshots_key", "analytics_snapshots", ["snapshot_key", "created_at"])

    op.create_table(
        "ml_features_daily",
        sa.Column("day", sa.Text(), primary_key=True),
        sa.Column("appointment_count", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("ml_features_daily")
    op.drop_index("ix_analytics_snapshots_key", table_name="analytics_snapshots")
    op.drop_table("analytics_snapshots")
    op.drop_index("ix_pipeline_runs_dag", table_name="pipeline_runs")
    op.drop_table("pipeline_runs")
