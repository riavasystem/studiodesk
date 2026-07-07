# Salem Studio

Plataforma SaaS profesional para reproducción y control de pistas multipista (Multitrack Playback), diseñada para músicos, iglesias, bandas, productores y eventos en vivo.

## Arquitectura

```
                     GitHub
                        │
           ┌────────────┴────────────┐
           │                         │
      Frontend                  Backend
      Next.js 15                FastAPI
      Vercel                    Hetzner
           │                         │
           └────────────┬────────────┘
                        │
                   PostgreSQL
                     Hetzner
                        │
                 Audio Storage
                    Hetzner
```

Frontend y Backend están completamente desacoplados y se comunican mediante API REST.

## Estructura

- `frontend/` — Next.js 15, React 19, TypeScript, TailwindCSS, shadcn/ui, Tone.js, WaveSurfer.js
- `backend/` — Python 3.12, FastAPI, SQLAlchemy, Alembic, PostgreSQL
- `docs/` — Documentación técnica del proyecto

## Estado del proyecto

Ver [PROJECT_STATE.md](./PROJECT_STATE.md) para el estado actual, módulo en desarrollo y roadmap.

Ver [CLAUDE.md](./CLAUDE.md) para la arquitectura oficial, tecnologías y principios de desarrollo.

## Desarrollo local

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```
