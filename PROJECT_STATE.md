# PROJECT_STATE.md

# Estado del Proyecto

Proyecto:

Salem Studio

Versión

0.1.0

Estado

🟢 En Desarrollo

Fecha Inicio

07/07/2026

---

# Arquitectura Confirmada

Frontend

Next.js 15

React 19

TypeScript

TailwindCSS

shadcn/ui

Tone.js

WaveSurfer.js

Framer Motion

Zustand

TanStack Query

Deploy:

Vercel

Repositorio

GitHub

Backend

Python 3.12

FastAPI

SQLAlchemy

Alembic

JWT

FFmpeg

Deploy:

Hetzner

Base de Datos

PostgreSQL

Deploy:

Hetzner

Storage

Hetzner

No utilizar almacenamiento externo.

---

# Último Módulo Completado

Infraestructura Inicial

Entregado:

- Monorepo con `frontend/`, `backend/`, `docs/`
- Frontend: Next.js 15.5.20 + React 19 + TypeScript + TailwindCSS v4 + shadcn/ui (preset Nova) + Zustand + TanStack Query + Framer Motion + Tone.js + WaveSurfer.js. Build, lint y typecheck verificados sin errores.
- Backend: FastAPI con arquitectura modular por dominios (`auth`, `users`, `songs`, `tracks`, `playlists`, `albums`, `categories`, `storage`, `playback`), cada uno con `router.py` / `models.py` / `schemas.py` / `service.py`. `Base` declarativa con `id`/`created_at`/`updated_at` en `app/db/base.py`. Settings vía `pydantic-settings` en `app/core/config.py`. Healthcheck `/health` verificado con uvicorn.
- Alembic inicializado y conectado a `Settings.DATABASE_URL` y `Base.metadata` (aún sin modelos concretos, listo para autogenerate en el módulo de Base de Datos).
- `.gitignore` raíz, `README.md` raíz y de backend, `.env.example` en frontend y backend.
- Repositorio remoto: `git@github.com:riavasystem/studiodesk.git` (push vía Deploy Key dedicado del repo).
- Frontend desplegado en Vercel (equipo `ClientesRiava`), dominio productivo `https://studiodesk.riava.cl`, deploy automático en cada push vía integración nativa Vercel↔GitHub.
- Backend desplegado en Hetzner (`root@49.12.66.17`), siguiendo la misma convención que las otras apps del servidor (`clientefiel`, `controlcost`):
  - Usuario/grupo de sistema `studiodesk`, estructura `/opt/apps/studiodesk/{releases/<timestamp>, current -> symlink, shared/{venv,.env,logs,uploads,backups,run}, scripts}`
  - systemd `studiodesk-api.service` (uvicorn, puerto interno 8002, no expuesto directo — solo vía nginx)
  - nginx + Certbot: `https://api.studiodesk.riava.cl` con SSL de Let's Encrypt (renovación automática), healthcheck verificado en `/health`
  - PostgreSQL 16 nativo compartido del servidor: DB `studiodesk_prod`, rol `studiodesk_user` (credenciales solo en `shared/.env` del servidor)
  - CI/CD: GitHub Actions (`.github/workflows/deploy-backend.yml`) — en push a `main` que toque `backend/**`, hace rsync del código al usuario `deploy` vía SSH (keypair dedicado, secret `HETZNER_SSH_KEY`), instala deps, corre `alembic upgrade head`, actualiza el symlink `current` y reinicia el servicio. Se decidió systemd+GitHub Actions sobre Docker para mantener consistencia con el resto de apps del servidor (ninguna usa Docker pese a estar instalado).
  - DNS gestionado en Cloudflare (zona `riava.cl`), registros DNS-only (sin proxy): CNAME `studiodesk` → Vercel, A `api.studiodesk` → `49.12.66.17`.

Estado

🟢 Completado

---

# Módulo Actual

Backend FastAPI

Objetivos:

- Definir modelos SQLAlchemy por dominio (empezando por `users` y `auth`)
- Generar primera migración Alembic
- Implementar endpoints CRUD base
- Definir esquemas Pydantic de entrada/salida

Estado

🟡 En Desarrollo

---

# Próximo Módulo

PostgreSQL

---

# Roadmap

✅ Infraestructura

⬜ Backend

⬜ PostgreSQL

⬜ Storage

⬜ Autenticación

⬜ API REST

⬜ Frontend

⬜ Dashboard

⬜ Reproductor

⬜ Mixer Profesional

⬜ Administración

⬜ Testing

⬜ Deploy

⬜ Optimización

---

# Tareas Pendientes

Infraestructura

Completada (repo, Vercel, Hetzner, DNS, SSL y CI/CD ya en producción).

Backend

- Definir modelos SQLAlchemy por dominio
- Primera migración Alembic
- Endpoints CRUD y schemas Pydantic

Base de Datos

Pendiente

Frontend

Pendiente

Reproductor

Pendiente

Deploy

Pendiente

---

# Decisiones Técnicas

Frontend

Next.js 15

Backend

FastAPI

Base de Datos

PostgreSQL

Storage

Hetzner

Frontend Deploy

Vercel

Backend Deploy

Hetzner

Repositorio

GitHub

Reproductor

Tone.js

Waveform

WaveSurfer.js

Arquitectura

Frontend separado del Backend.

Toda la comunicación mediante API REST.

Backend organizado por dominios (`app/domains/*`), cada uno con router, models, schemas y service propios.

shadcn/ui inicializado con preset "Nova" (Lucide + Geist), base "base" (no Radix).

Gestor de estado adicional: TanStack Query para estado de servidor, Zustand para estado de cliente.

---

# Reglas para Claude

Antes de comenzar cualquier tarea:

1. Leer CLAUDE.md.

2. Leer PROJECT_STATE.md.

3. Continuar desde el Módulo Actual.

4. Nunca reiniciar el proyecto.

5. Nunca modificar módulos completados sin autorización.

6. Al terminar un módulo:

- actualizar la versión
- marcar el módulo como completado
- mover el siguiente módulo a "Módulo Actual"
- actualizar las tareas pendientes
- registrar cualquier decisión técnica nueva

---

# Historial de Versiones

v0.0.1

- Inicio del proyecto.
- Arquitectura definida.
- Tecnologías confirmadas.
- Roadmap inicial creado.

v0.1.0

- Módulo Infraestructura Inicial completado.
- Monorepo frontend/backend/docs creado.
- Frontend Next.js 15 con stack completo instalado y verificado (build + lint + typecheck).
- Backend FastAPI con estructura modular por dominios, healthcheck funcional.
- Alembic configurado.
- Repositorio Git inicializado localmente.

v0.1.1

- Repositorio conectado a GitHub (`riavasystem/studiodesk`).
- Frontend desplegado en Vercel: `https://studiodesk.riava.cl`.
- Backend desplegado en Hetzner: `https://api.studiodesk.riava.cl` (systemd + nginx + Certbot).
- Base de datos `studiodesk_prod` provisionada en el PostgreSQL compartido del servidor.
- CI/CD con GitHub Actions para el backend (deploy automático en push a `main`).
- Fix: `.gitignore` excluía por error `backend/app/domains/storage/` (patrón `storage/` demasiado amplio); corregido a `/backend/shared/storage/`.