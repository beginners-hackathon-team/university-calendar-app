from pydantic_settings import BaseSettings, SettingsConfigDict


# BaseSettings: os.environ から自動で値を読む
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str  # DATABASE_URLが自動代入
    cors_origins: str = ""

    # JWT認証用
    jwt_secret_key: str  # 環境変数
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24時間


# モジュールインポート時に1回インスタンス化
settings = Settings()  # type: ignore[call-arg]
