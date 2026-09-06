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

    # Public URL of the frontend, used to build links inside notification
    # emails/pushes (falls back to the first configured origin).
    app_url: str = ""

    # ── Email notifications (Gmail SMTP; leave blank to disable email) ──────
    # Reuses the same Gmail account/app-password configured for Supabase auth.
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 465  # implicit TLS (SSL)
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""  # defaults to smtp_user when blank
    smtp_from_name: str = "Awn"

    # ── Web push (VAPID; leave blank to disable push) ──────────────────────
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:notifications@awn.app"

    @property
    def admin_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]

    @property
    def app_base_url(self) -> str:
        return (self.app_url or (self.origins_list[0] if self.origins_list else "")).rstrip("/")

    @property
    def email_enabled(self) -> bool:
        return bool(self.smtp_user and self.smtp_password)

    @property
    def push_enabled(self) -> bool:
        return bool(self.vapid_public_key and self.vapid_private_key)

    @property
    def from_email(self) -> str:
        return self.smtp_from_email or self.smtp_user

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
