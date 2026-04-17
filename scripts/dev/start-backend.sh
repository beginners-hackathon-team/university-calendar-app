#!/bin/bash
# 開発用バック起動
set -e

cd /workspace/backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
