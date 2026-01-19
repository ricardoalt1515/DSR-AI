"""Authorization policies for role-based access."""

from app.models.company import Company
from app.models.location import Location
from app.models.user import User, UserRole


def is_agent(user: User) -> bool:
    return user.role in (UserRole.FIELD_AGENT, UserRole.CONTRACTOR)


def can_create_project(user: User) -> bool:
    return user.is_superuser or user.is_org_admin() or is_agent(user)


def can_create_company(user: User) -> bool:
    return user.is_superuser or user.is_org_admin() or is_agent(user)


def can_update_company(user: User, company: Company) -> bool:
    if user.is_superuser or user.is_org_admin():
        return True
    return is_agent(user) and company.created_by_user_id == user.id


def can_create_location_for_company(user: User, company: Company) -> bool:
    if user.is_superuser or user.is_org_admin():
        return True
    return is_agent(user)


def can_delete_company(user: User) -> bool:
    return user.is_superuser or user.is_org_admin()


def can_create_location(user: User) -> bool:
    return user.is_superuser or user.is_org_admin() or is_agent(user)


def can_update_location(user: User, location: Location) -> bool:
    if user.is_superuser or user.is_org_admin():
        return True
    return is_agent(user) and location.created_by_user_id == user.id


def can_delete_location(user: User) -> bool:
    return user.is_superuser or user.is_org_admin()


def can_delete_project(user: User) -> bool:
    return user.is_superuser or user.is_org_admin()


def can_create_location_contact(user: User) -> bool:
    return user.is_superuser or user.is_org_admin() or is_agent(user)


def can_update_location_contact(user: User) -> bool:
    return user.is_superuser or user.is_org_admin() or is_agent(user)


def can_delete_location_contact(user: User) -> bool:
    return user.is_superuser or user.is_org_admin()
