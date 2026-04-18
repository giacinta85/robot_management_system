from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://rms_user:password@postgres:5432/robot_management"
    SECRET_KEY: str = "changeme"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    FIRST_ADMIN_USERNAME: str = "admin"
    FIRST_ADMIN_PASSWORD: str = "admin123"


settings = Settings()
