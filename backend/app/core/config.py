"""
Application configuration using Pydantic Settings.
Loads configuration from environment variables.
"""

from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with validation."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    # Application
    APP_NAME: str = "H2O Allegiant API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # API
    API_V1_PREFIX: str = "/api/v1"
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # Database - PostgreSQL
    POSTGRES_USER: str = "h2o_user"
    POSTGRES_PASSWORD: str = Field(..., min_length=8)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "h2o_allegiant"

    @property
    def database_url(self) -> str:
        """Construct database URL."""
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def async_database_url(self) -> str:
        """Construct async database URL."""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None

    @property
    def redis_url(self) -> str:
        """Construct Redis URL."""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # Security - JWT
    SECRET_KEY: str = Field(..., min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # OpenAI
    OPENAI_API_KEY: str = Field(..., min_length=20)
    OPENAI_MODEL: str = "gpt-5-mini"
    OPENAI_TEMPERATURE: float = Field(default=0.7, ge=0.0, le=2.0)
    OPENAI_MAX_TOKENS: int = Field(default=4000, ge=100, le=128000)


    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = Field(default="us-east-1", validation_alias="S3_REGION")
    AWS_S3_BUCKET: Optional[str] = Field(default=None, validation_alias="S3_BUCKET")

    # Storage
    USE_LOCAL_STORAGE: bool = True
    LOCAL_STORAGE_PATH: str = "./storage"

    # File Upload
    MAX_UPLOAD_SIZE: int = 10485760  # 10MB
    ALLOWED_EXTENSIONS: str = ".pdf,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.txt"

    @property
    def allowed_extensions_list(self) -> List[str]:
        """Parse allowed extensions from comma-separated string."""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    # Background Jobs
    JOB_BACKEND: str = "background"  # 'background' or 'celery'
    JOB_STATUS_TTL_SECONDS: int = 3600

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_BURST: int = 10

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            raise ValueError(f"LOG_LEVEL must be one of: {', '.join(allowed)}")
        return v.upper()

    # Email (Optional)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None

    # Monitoring
    SENTRY_DSN: Optional[str] = None

    # Auth Flow Toggles
    AUTH_ENABLE_REGISTRATION: bool = False
    AUTH_ENABLE_PASSWORD_RESET: bool = False
    AUTH_ENABLE_EMAIL_VERIFICATION: bool = False

    # Foundational Superuser (for initial bootstrap only)
    FIRST_SUPERUSER_EMAIL: Optional[str] = None
    FIRST_SUPERUSER_PASSWORD: Optional[str] = None


# Create global settings instance
settings = Settings()
