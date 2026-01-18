#!/usr/bin/env python3
"""
Migrate orphaned projects to link them with their locations.

This script finds projects with location_id = NULL and attempts to link them
to existing locations by matching client name and location city.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.company import Company
from app.models.location import Location
from app.models.project import Project


async def migrate_orphaned_projects():
    """Find and link orphaned projects to their locations."""

    async with AsyncSessionLocal() as db:
        # Get orphaned projects
        result = await db.execute(select(Project).where(Project.location_id.is_(None)))
        orphaned_projects = result.scalars().all()

        if not orphaned_projects:
            print("✅ No orphaned projects found!")
            return

        print(f"Found {len(orphaned_projects)} orphaned projects\n")

        migrated = 0
        failed = 0

        for project in orphaned_projects:
            print(f"Processing: {project.name}")
            print(f"  Client: {project.client}")
            print(f"  Location: {project.location}")

            # Try to find matching location
            # Strategy: Match company name (case-insensitive) and location city
            if not project.client or not project.location:
                print("  ❌ Missing client or location data, skipping\n")
                failed += 1
                continue

            # Extract city from location string (e.g., "tijuana" or "guadalajara ")
            location_city = project.location.strip().lower()

            # Find company by name (case-insensitive)
            result = await db.execute(
                select(Company).where(Company.name.ilike(f"%{project.client}%"))
            )
            company = result.scalar_one_or_none()

            if not company:
                print(f"  ❌ Company '{project.client}' not found\n")
                failed += 1
                continue

            print(f"  ✓ Found company: {company.name} (id: {company.id})")

            # Find location in this company by city
            result = await db.execute(
                select(Location)
                .where(Location.company_id == company.id)
                .where(Location.city.ilike(f"%{location_city}%"))
            )
            location = result.scalar_one_or_none()

            if not location:
                print(f"  ❌ Location matching '{location_city}' not found in {company.name}\n")
                failed += 1
                continue

            print(f"  ✓ Found location: {location.name} in {location.city} (id: {location.id})")

            # Update project with location_id
            project.location_id = location.id
            await db.commit()

            print("  ✅ Linked project to location!\n")
            migrated += 1

        print("=" * 60)
        print("Migration complete:")
        print(f"  ✅ Migrated: {migrated}")
        print(f"  ❌ Failed: {failed}")
        print("=" * 60)


if __name__ == "__main__":
    print("🔄 Starting orphaned projects migration...\n")
    asyncio.run(migrate_orphaned_projects())
