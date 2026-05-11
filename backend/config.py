from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./globaltradex.db"
    # JWT: set SECRET_KEY and ALGORITHM in .env (mapped by pydantic-settings)
    secret_key: str = "dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    openai_api_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    sms_api_key: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    did_api_key: str = ""
    did_presenter_url: str = ""
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""
    heygen_api_key: str = ""
    heygen_avatar_id: str = "Brandon_expressive3_public"
    heygen_voice_id: str = ""
    assistant_enabled: bool = True
    assistant_greeting_message: str = "Hi, I am your GlobalTradeX support assistant. How can I help you today?"
    assistant_session_ttl_seconds: int = 600
    assistant_video_cache_ttl_seconds: int = 3600
    assistant_rate_limit_per_minute: int = 20
    public_api_base_url: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
