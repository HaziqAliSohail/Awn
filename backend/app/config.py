from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, loaded from environment / .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    # Supabase legacy JWT signing secret (HS256). If your project uses the
    # newer asymmetric signing keys, switch verification to JWKS (see security.py).
    supabase_jwt_secret: str

    # Claude (Anthropic) powers the scope engine.
    anthropic_api_key: str
    scope_model: str = "claude-haiku-4-5"

    # Google Gemini powers embeddings (Anthropic has no embeddings API).
    gemini_api_key: str
    gemini_embed_model: str = "gemini-embedding-001"

    admin_emails: str = ""
    # Comma-separated list of allowed browser origins for CORS.
    frontend_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,http://127.0.0.1:3003"

    @property
    def admin_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
