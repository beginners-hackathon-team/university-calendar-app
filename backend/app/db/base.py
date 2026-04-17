# SQLAlchemyのModelが継承する基底クラス

from sqlalchemy.orm import DeclarativeBase


# 全modelクラスがこれを継承
# Base.metadataに全テーブル情報が集約 -> Alembicがマイグレーション生成
class Base(DeclarativeBase):
    pass
