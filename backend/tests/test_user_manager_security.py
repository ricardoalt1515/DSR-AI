import pytest
from fastapi_users.exceptions import InvalidPasswordException

from app.core.user_manager import UserManager
from app.models.user import UserRole


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "password",
    [
        "Short1",  # too short
        "lowercaseonly1",  # missing uppercase
        "UPPERCASEONLY",  # missing number
    ],
)
async def test_validate_password_enforces_strength(password: str) -> None:
    manager = UserManager.__new__(UserManager)
    with pytest.raises(InvalidPasswordException):
        await manager.validate_password(password)


@pytest.mark.asyncio
async def test_validate_password_rejects_email_prefix() -> None:
    manager = UserManager.__new__(UserManager)

    class DummyUser:
        email = "john.doe@example.com"

    with pytest.raises(InvalidPasswordException):
        await manager.validate_password("John.Doe1234", DummyUser())


def test_normalize_role_superuser_is_consistent() -> None:
    manager = UserManager.__new__(UserManager)

    class Payload:
        def __init__(self, role: str | None, is_superuser: bool | None) -> None:
            self.role = role
            self.is_superuser = is_superuser

    # role governs is_superuser when role is provided
    payload = Payload(role=UserRole.ADMIN.value, is_superuser=False)
    manager._normalize_role_superuser(payload)
    assert payload.is_superuser is True

    payload = Payload(role=UserRole.SALES.value, is_superuser=True)
    manager._normalize_role_superuser(payload)
    assert payload.is_superuser is False

    # is_superuser governs role when role is absent
    payload = Payload(role=None, is_superuser=True)
    manager._normalize_role_superuser(payload)
    assert payload.role == UserRole.ADMIN.value

    class ExistingUser:
        role = UserRole.ADMIN.value

    payload = Payload(role=None, is_superuser=False)
    manager._normalize_role_superuser(payload, existing_user=ExistingUser())
    assert payload.role == UserRole.FIELD_AGENT.value
