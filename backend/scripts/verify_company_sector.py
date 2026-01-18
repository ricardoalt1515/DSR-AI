"""
Verification script for company sector migration.

Run this after applying the migration to verify:
1. All companies have sector/subsector
2. CRUD operations work correctly
3. Schema validation works

Usage:
    python -m scripts.verify_company_sector
"""

import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models import Company
from app.schemas.company import CompanyCreate


async def verify_migration():
    """Verify sector/subsector migration was successful."""

    async with AsyncSessionLocal() as db:
        # Check 1: All companies have sector/subsector
        result = await db.execute(select(Company))
        companies = result.scalars().all()

        print(f"\n📊 Total companies: {len(companies)}")

        missing_sector = [c for c in companies if not c.sector]
        missing_subsector = [c for c in companies if not c.subsector]

        if missing_sector:
            print(f"❌ {len(missing_sector)} companies missing sector")
            for c in missing_sector[:5]:  # Show first 5
                print(f"   - {c.name} (ID: {c.id})")
        else:
            print("✅ All companies have sector")

        if missing_subsector:
            print(f"❌ {len(missing_subsector)} companies missing subsector")
            for c in missing_subsector[:5]:
                print(f"   - {c.name} (ID: {c.id})")
        else:
            print("✅ All companies have subsector")

        # Check 2: Sector distribution
        from collections import Counter

        sector_counts = Counter(c.sector for c in companies)

        print("\n📈 Sector Distribution:")
        for sector, count in sector_counts.most_common():
            print(f"   {sector}: {count}")

        return len(missing_sector) == 0 and len(missing_subsector) == 0


async def test_create_company():
    """Test creating a company with new schema."""

    test_data = CompanyCreate(
        name="Test Company (Auto-created for verification)",
        industry="Testing",
        sector="industrial",
        subsector="food_processing",
        contact_name="Test User",
        contact_email="test@example.com",
        tags=["test", "verification"],
    )

    async with AsyncSessionLocal() as db:
        # Try to create
        company = Company(**test_data.model_dump())
        db.add(company)
        await db.commit()
        await db.refresh(company)

        print("\n✅ Successfully created test company:")
        print(f"   Name: {company.name}")
        print(f"   Sector: {company.sector}")
        print(f"   Subsector: {company.subsector}")
        print(f"   ID: {company.id}")

        # Clean up
        await db.delete(company)
        await db.commit()
        print("   (Test company deleted)")

        return True


async def main():
    """Run all verification checks."""

    print("🔍 Starting Company Sector Verification\n")
    print("=" * 60)

    try:
        # Check migration
        migration_ok = await verify_migration()

        # Test create
        create_ok = await test_create_company()

        print("\n" + "=" * 60)
        if migration_ok and create_ok:
            print("✅ ALL CHECKS PASSED")
            print("\nNext steps:")
            print("1. Update frontend types (lib/types/company.ts)")
            print("2. Update CreateCompanyDialog UI")
            print("3. Remove sector from PremiumProjectWizard")
        else:
            print("❌ SOME CHECKS FAILED")
            print("\nPlease review the errors above and fix before proceeding.")

    except Exception as e:
        print(f"\n❌ Error during verification: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
