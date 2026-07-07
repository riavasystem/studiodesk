# Salem Studio — Backend

API REST construida con FastAPI, siguiendo arquitectura modular separada por dominios.

## Dominios

`auth`, `users`, `songs`, `tracks`, `playlists`, `albums`, `categories`, `storage`, `playback`

Cada dominio contiene: `router.py`, `models.py`, `schemas.py`, `service.py`.

## Desarrollo local

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

La API queda disponible en `http://localhost:8000`, con healthcheck en `/health`.

## Migraciones

```bash
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
```
