"""add company contacts

Revision ID: 20260226_1300
Revises: 20260226_1200
Create Date: 2026-02-26 13:00:00.000000

"""

import uuid

import sqlalchemy as sa
from alembic import op


revision = "20260226_1300"
down_revision = "20260226_1200"
branch_labels = None
depends_on = None

_BATCH_SIZE = 500
_LOCK_KEY_1 = 20260226
_LOCK_KEY_2 = 1300


def _run_backfill(connection: sa.Connection) -> int:
    inserted_total = 0
    last_company_id: str | None = None

    while True:
        rows = connection.execute(
            sa.text(
                """
                SELECT
                    id AS company_id,
                    organization_id,
                    NULLIF(BTRIM(contact_name), '') AS name,
                    NULLIF(BTRIM(contact_email), '') AS email,
                    NULLIF(BTRIM(contact_phone), '') AS phone
                FROM companies
                WHERE (
                    NULLIF(BTRIM(contact_name), '') IS NOT NULL
                    OR NULLIF(BTRIM(contact_email), '') IS NOT NULL
                    OR NULLIF(BTRIM(contact_phone), '') IS NOT NULL
                )
                AND (:last_company_id IS NULL OR id > CAST(:last_company_id AS UUID))
                ORDER BY id ASC
                LIMIT :batch_size
                """
            ),
            {
                "last_company_id": last_company_id,
                "batch_size": _BATCH_SIZE,
            },
        ).mappings().all()

        if not rows:
            break

        for row in rows:
            company_id = row["company_id"]
            org_id = row["organization_id"]
            name = row["name"]
            email = row["email"]
            phone = row["phone"]

            if not (name or email or phone):
                continue

            result = connection.execute(
                sa.text(
                    """
                    INSERT INTO company_contacts (
                        id,
                        organization_id,
                        company_id,
                        name,
                        email,
                        phone,
                        title,
                        notes,
                        is_primary
                    )
                    SELECT
                        :id,
                        :organization_id,
                        :company_id,
                        :name,
                        :email,
                        :phone,
                        NULL,
                        NULL,
                        NOT EXISTS (
                            SELECT 1
                            FROM company_contacts existing_primary
                            WHERE existing_primary.organization_id = :organization_id
                              AND existing_primary.company_id = :company_id
                              AND existing_primary.is_primary IS TRUE
                        )
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM company_contacts existing
                        WHERE existing.organization_id = :organization_id
                          AND existing.company_id = :company_id
                          AND COALESCE(NULLIF(BTRIM(existing.name), ''), '') = COALESCE(:name, '')
                          AND COALESCE(NULLIF(BTRIM(existing.email), ''), '') = COALESCE(:email, '')
                          AND COALESCE(NULLIF(BTRIM(existing.phone), ''), '') = COALESCE(:phone, '')
                    )
                    """
                ),
                {
                    "id": uuid.uuid4(),
                    "organization_id": org_id,
                    "company_id": company_id,
                    "name": name,
                    "email": email,
                    "phone": phone,
                },
            )
            inserted_total += result.rowcount

        last_company_id = str(rows[-1]["company_id"])

    return inserted_total


def upgrade() -> None:
    op.create_table(
        "company_contacts",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "num_nonnulls(NULLIF(BTRIM(name), ''), NULLIF(BTRIM(email), ''), NULLIF(BTRIM(phone), '')) >= 1",
            name="ck_company_contacts_identity_present",
        ),
        sa.ForeignKeyConstraint(
            ["company_id", "organization_id"],
            ["companies.id", "companies.organization_id"],
            name="fk_company_contacts_company_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_company_contacts_organization_id"),
        "company_contacts",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_company_contacts_company_id"),
        "company_contacts",
        ["company_id"],
        unique=False,
    )

    with op.get_context().autocommit_block():
        op.create_index(
            "uq_company_contacts_primary_per_company",
            "company_contacts",
            ["organization_id", "company_id"],
            unique=True,
            postgresql_where=sa.text("is_primary IS TRUE"),
            postgresql_concurrently=True,
        )
    with op.get_context().autocommit_block():
        op.create_index(
            "ix_company_contacts_org_company_name_id",
            "company_contacts",
            ["organization_id", "company_id", "name", "id"],
            unique=False,
            postgresql_concurrently=True,
        )

    connection = op.get_bind()
    connection.execute(
        sa.text("SELECT pg_advisory_xact_lock(:lock_key_1, :lock_key_2)"),
        {"lock_key_1": _LOCK_KEY_1, "lock_key_2": _LOCK_KEY_2},
    )

    pre_candidate_count = connection.execute(
        sa.text(
            """
            SELECT COUNT(*)
            FROM companies
            WHERE NULLIF(BTRIM(contact_name), '') IS NOT NULL
               OR NULLIF(BTRIM(contact_email), '') IS NOT NULL
               OR NULLIF(BTRIM(contact_phone), '') IS NOT NULL
            """
        )
    ).scalar_one()
    pre_total_contacts = connection.execute(
        sa.text("SELECT COUNT(*) FROM company_contacts")
    ).scalar_one()

    first_run_inserted = _run_backfill(connection)
    after_first_total_contacts = connection.execute(
        sa.text("SELECT COUNT(*) FROM company_contacts")
    ).scalar_one()

    second_run_inserted = _run_backfill(connection)
    after_second_total_contacts = connection.execute(
        sa.text("SELECT COUNT(*) FROM company_contacts")
    ).scalar_one()

    op.get_context().config.print_stdout(
        "company_contacts backfill verification: %s",
        {
            "companies_with_legacy_contact_values": pre_candidate_count,
            "contacts_total_before": pre_total_contacts,
            "first_run_inserted": first_run_inserted,
            "contacts_total_after_first": after_first_total_contacts,
            "second_run_inserted": second_run_inserted,
            "contacts_total_after_second": after_second_total_contacts,
        },
    )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index(
            "ix_company_contacts_org_company_name_id",
            table_name="company_contacts",
            postgresql_concurrently=True,
        )
    with op.get_context().autocommit_block():
        op.drop_index(
            "uq_company_contacts_primary_per_company",
            table_name="company_contacts",
            postgresql_concurrently=True,
        )
    op.drop_index(op.f("ix_company_contacts_company_id"), table_name="company_contacts")
    op.drop_index(op.f("ix_company_contacts_organization_id"), table_name="company_contacts")
    op.drop_table("company_contacts")
