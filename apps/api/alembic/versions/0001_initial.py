"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-03-10 19:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


user_role_enum = sa.Enum("student", "ambassador", "admin", name="userrole")
meeting_status_enum = sa.Enum("pending", "confirmed", "declined", "cancelled", name="meetingstatus")
meeting_type_enum = sa.Enum("virtual", "in_person", name="meetingtype")


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    meeting_status_enum.create(bind, checkfirst=True)
    meeting_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "student_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("program_interest", sa.String(length=255), nullable=True),
        sa.Column("country", sa.String(length=120), nullable=True),
        sa.Column("career_interests", sa.JSON(), nullable=False),
        sa.Column("goals", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_student_profiles_user_id"), "student_profiles", ["user_id"], unique=True)

    op.create_table(
        "ambassador_profiles",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("program", sa.String(length=255), nullable=False),
        sa.Column("major", sa.String(length=255), nullable=False),
        sa.Column("graduation_year", sa.Integer(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("interests", sa.JSON(), nullable=False),
        sa.Column("career_background", sa.String(length=255), nullable=True),
        sa.Column("linkedin", sa.String(length=255), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("country", sa.String(length=120), nullable=True),
        sa.Column("meeting_types", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ambassador_profiles_program"), "ambassador_profiles", ["program"], unique=False)
    op.create_index(
        op.f("ix_ambassador_profiles_user_id"), "ambassador_profiles", ["user_id"], unique=True
    )

    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=True),
        sa.Column("raw_content", sa.Text(), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("document_id", sa.String(length=36), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("vector_id", sa.String(length=255), nullable=False),
        sa.Column("topic_tags", sa.JSON(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["knowledge_documents.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("vector_id"),
    )
    op.create_index(
        op.f("ix_knowledge_chunks_document_id"), "knowledge_chunks", ["document_id"], unique=False
    )

    op.create_table(
        "availability_rules",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("ambassador_id", sa.String(length=36), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(["ambassador_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_availability_rules_ambassador_id"), "availability_rules", ["ambassador_id"], unique=False
    )

    op.create_table(
        "availability_exceptions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("ambassador_id", sa.String(length=36), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("is_available", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["ambassador_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_availability_exceptions_ambassador_id"),
        "availability_exceptions",
        ["ambassador_id"],
        unique=False,
    )

    op.create_table(
        "meetings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("student_id", sa.String(length=36), nullable=False),
        sa.Column("ambassador_id", sa.String(length=36), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", meeting_status_enum, nullable=False),
        sa.Column("meeting_type", meeting_type_enum, nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("meeting_link", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["ambassador_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_meetings_ambassador_id"), "meetings", ["ambassador_id"], unique=False)
    op.create_index(op.f("ix_meetings_start_time"), "meetings", ["start_time"], unique=False)
    op.create_index(op.f("ix_meetings_status"), "meetings", ["status"], unique=False)
    op.create_index(op.f("ix_meetings_student_id"), "meetings", ["student_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_meetings_student_id"), table_name="meetings")
    op.drop_index(op.f("ix_meetings_status"), table_name="meetings")
    op.drop_index(op.f("ix_meetings_start_time"), table_name="meetings")
    op.drop_index(op.f("ix_meetings_ambassador_id"), table_name="meetings")
    op.drop_table("meetings")

    op.drop_index(op.f("ix_availability_exceptions_ambassador_id"), table_name="availability_exceptions")
    op.drop_table("availability_exceptions")

    op.drop_index(op.f("ix_availability_rules_ambassador_id"), table_name="availability_rules")
    op.drop_table("availability_rules")

    op.drop_index(op.f("ix_knowledge_chunks_document_id"), table_name="knowledge_chunks")
    op.drop_table("knowledge_chunks")
    op.drop_table("knowledge_documents")

    op.drop_index(op.f("ix_ambassador_profiles_user_id"), table_name="ambassador_profiles")
    op.drop_index(op.f("ix_ambassador_profiles_program"), table_name="ambassador_profiles")
    op.drop_table("ambassador_profiles")

    op.drop_index(op.f("ix_student_profiles_user_id"), table_name="student_profiles")
    op.drop_table("student_profiles")

    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    meeting_type_enum.drop(bind, checkfirst=True)
    meeting_status_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)
