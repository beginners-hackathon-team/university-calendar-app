## package install
入れる人
```
git branch develop
cd backend
uv add <パッケージ名>

```

他の人
```
git branch develop
git pull
cd backend
uv sync

```
---
## DB更新
```
alembic revision --autogenerate -m "コメント" 
alembic upgrade head
```
