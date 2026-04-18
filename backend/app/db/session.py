# DB接続engineとセッション管理
# セッションはリクエストごとに作り、終わったら捨てる

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings


# DBへの接続、アプリで1個
engine = create_engine(settings.database_url, echo=False)  # 実行SQLログがみたいならTrue

# SessionLocal()で新しいセッションが取れる
SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False
)  # 明示的にcommit/flushするまでDBに送らない（意図しない書込み防止）


# FastAPIの依存注入用。yieldで返し、リクエスト終了時に必ずclose
# 使い方：def endpoint(db: Session = Depends(get_db)):
def get_db():
    db: Session = SessionLocal()  # 新しいセッション
    try:
        yield db
    finally:
        db.close()
