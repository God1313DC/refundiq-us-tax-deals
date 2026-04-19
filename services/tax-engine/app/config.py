from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "RefundIQ Tax Engine"
    frontend_base_url: str = "http://localhost:3000"
    api_base_url: str = "http://localhost:8000"
    default_tax_year: int = 2025
    estimation_engine_version: str = "2025.1-mvp"
    redis_url: str = "redis://localhost:6379/0"
    pii_log_redaction_enabled: bool = True
    data_retention_days: int = 365
    test_mode: bool = False
    supabase_url: str | None = None
    next_public_supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_storage_bucket: str = "tax-documents"
    research_alert_lookback_days: int = 30
    source_ingestion_user_agent: str = "RefundIQ-ResearchBot/1.0 (+https://ustaxdeals.example)"
    source_ingestion_timeout_seconds: int = 20
    allowed_web_origins: str = "http://localhost:3000"
    ocr_provider: str = "stub"
    scheduler_enabled: bool = False
    scheduler_source_interval_minutes: int = 360
    scheduler_startup_delay_seconds: int = 10
    scheduler_name: str = "source-ingestion-scheduler"
    scheduler_run_on_startup: bool = False
    scheduler_poll_seconds: int = 30
    admin_sync_limit: int = 10
    pdf_output_dir: str = "/tmp/refundiq-exports"

    @property
    def effective_supabase_url(self) -> str | None:
        return self.supabase_url or self.next_public_supabase_url

    @property
    def allowed_origins(self) -> list[str]:
        return [item.strip() for item in self.allowed_web_origins.split(",") if item.strip()]


settings = Settings()
