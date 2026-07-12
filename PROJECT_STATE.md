# PROJECT_STATE.md

# Estado del Proyecto

Proyecto:

Salem Studio

Versión

0.7.0

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

Entregado hasta ahora:

- Dominio `users`: modelo `User` (email único, hashed_password, full_name, is_active, is_superuser), schemas (`UserCreate`, `UserRead`), service y endpoints (`POST /api/v1/users` registro, `GET /api/v1/users/me`, `GET /api/v1/users`, `GET /api/v1/users/{id}` — estos dos últimos protegidos, solo superusuario).
- Dominio `auth`: hashing con passlib/bcrypt y JWT (access + refresh) en `app/core/security.py`, dependencias `get_current_user`/`get_current_superuser` en `app/core/deps.py`, endpoints `POST /api/v1/auth/login` (OAuth2PasswordRequestForm) y `POST /api/v1/auth/refresh`.
- Primera migración Alembic (`ddab0d4d613c_create_users_table`) generada contra la DB real de Hetzner y aplicada en producción vía el pipeline de CI/CD.
- Superusuario inicial sembrado en producción: `contacto@riava.cl` (password hasheado con bcrypt, nunca almacenado en texto plano ni en git). Login y endpoint protegido verificados end-to-end contra `https://api.studiodesk.riava.cl`.
- Dominios de catálogo completos, con CRUD y control de ownership (dueño o superusuario) en cada escritura:
  - `categories`: catálogo simple (nombre único).
  - `albums`: título, artista, portada opcional, dueño.
  - `songs`: título, artista, bpm, tonalidad, duración, categoría y álbum opcionales, dueño.
  - `tracks`: pertenece a una `song` (1:N con cascade delete), con `name`, `file_path`, `order_index`, `volume`, `is_muted`, `is_solo` — implementa la estructura de instrumentos independientes por canción (voz, coros, piano, bajo, etc.) definida en CLAUDE.md.
  - `playlists`: pertenece a un usuario, con tabla intermedia `PlaylistSong` (con `order_index`, `id`, `created_at`, `updated_at` propios — no un secondary table plano, para respetar la regla de CLAUDE.md de que toda tabla tenga esas 3 columnas).
  - `storage`: subida (`POST /api/v1/storage/upload`, multipart) y descarga de archivos de audio a disco local en Hetzner (`shared/uploads`), validando extensión/content-type; nunca usa almacenamiento externo (S3, Firebase, etc.), tal como exige CLAUDE.md.
- Segunda migración Alembic (`b06ea4f4fef5_add_catalog_domains`) con las 6 tablas nuevas, generada y aplicada en producción.
- CRUD verificado end-to-end en producción: creación de categoría → álbum → canción → track → playlist con la canción, y borrado en cascada confirmado (al borrar una canción, su track se elimina solo).

Pendiente (siguiente iteración del mismo módulo):

- `playback`: no tiene modelo todavía — es un dominio de control en vivo (tiempo real), no de catálogo. Se diseñará junto con el reproductor (Fase 9-10) cuando existan requisitos concretos de frontend/WebSocket, en vez de modelarlo especulativamente ahora.

Estado

🟢 Completado (dominios de catálogo listos; `playback` queda deliberadamente para la fase del reproductor)

---

# Próximo Módulo

Dashboard: CRUD de canciones/tracks/playlists/álbumes desde el frontend (hoy el dashboard solo lista canciones, de solo lectura), y eventualmente el Reproductor (Tone.js + WaveSurfer.js).

## Autenticación en el frontend — completada (2026-07-12)

Entregado:

- Cliente API (`src/lib/api-client.ts`): wrapper de `fetch` con refresh automático de JWT en 401, apuntando a `NEXT_PUBLIC_API_URL`.
- Store de sesión con Zustand + `persist` (`src/lib/auth-store.ts`): `accessToken`, `refreshToken`, `user`, persistido en localStorage.
- Provider de TanStack Query (`src/app/providers.tsx`) + `Toaster` (sonner) para errores.
- Hooks: `useLogin`, `useRegister`, `useCurrentUser`, `useLogout` (`src/hooks/use-auth.ts`).
- Páginas `/login` y `/registro` (shadcn/ui: Card, Input, Label).
- `/dashboard` protegido: guard client-side que espera la hidratación de Zustand antes de redirigir a `/login`; lista las canciones del usuario vía `/api/v1/songs`.
- Verificado end-to-end en producción: login real con `contacto@riava.cl` contra `https://api.studiodesk.riava.cl`, token válido, `/users/me` responde, headers CORS correctos para `https://studiodesk.riava.cl`.

Dos bugs de Next.js App Router encontrados y corregidos (dejar registro para no repetirlos):

1. `export const dynamic` (route segment config) no puede exportarse desde un archivo `"use client"` — Next.js lo ignora/falla. Cualquier página que necesite forzar `force-dynamic` debe hacerlo desde un Server Component (layout o page sin `"use client"`), delegando la lógica de cliente a un componente separado.
2. Nunca llamar a la API de Zustand `persist` (`.persist.hasHydrated()`, etc.) durante el render — solo dentro de `useEffect`. Aunque la ruta sea `force-dynamic`, Next.js igual hace un SSR por request (en Node, sin `localStorage`), y tocar `.persist` durante ese render causó primero un error de build (prerender) y después un 500 en runtime hasta que se corrigió.

## Landing page pública — completada (2026-07-12)

Entregado:

- Hero con escena 3D (React Three Fiber + drei): barras tipo ecualizador/mixer animadas con `InstancedMesh`, parallax de cámara según el mouse, cargada con `next/dynamic({ ssr: false })` para no bloquear el LCP.
- Secciones con scroll reveal vía Framer Motion (`whileInView`, `useScroll`/`useTransform` para parallax de stats).
- Dirección visual deliberadamente distinta a landings genéricas de IA: dark mode forzado, acento ámbar/naranja (consola de mezcla / luces de escenario) en vez del gradiente morado-azul típico, tipografía editorial con Geist.
- SEO: metadata completa (OpenGraph, Twitter Card, canonical, keywords) en `layout.tsx`.
- Desplegada y verificada en `https://studiodesk.riava.cl` (contenido confirmado vía curl en producción).

Nota de entorno (importante para próximas sesiones): en este Mac, `next build` y `eslint` se cuelgan indefinidamente al cargar el binario nativo de SWC (`node_modules/@next/swc-darwin-arm64/*.node`) — Gatekeeper lo rechaza (`spctl` devuelve `rejected`) y el intento de cargarlo nunca retorna. Es el mismo problema ya visto con el binario de `psycopg` en el backend. `tsc --noEmit` sí corre limpio (no depende de binarios nativos). La validación real de build/lint del frontend debe hacerse dejando que Vercel construya en su propio entorno (Linux), no localmente.

## CRUD completo del dashboard — completada (2026-07-12)

Entregado:

- Backend: endpoint faltante `GET /api/v1/playlists/{id}/songs` (listado ordenado por `order_index`).
- Frontend, hooks CRUD completos por dominio (`use-categories.ts`, `use-albums.ts`, `use-songs.ts`, `use-tracks.ts`, `use-playlists.ts`) sobre TanStack Query.
- Navegación con tabs (`dashboard-nav.tsx`) entre Canciones / Playlists / Álbumes / Categorías.
- Páginas CRUD: `categories`, `albums`, `songs` (con selects de categoría/álbum opcionales), `songs/[id]` (detalle: subida de audio, alta de tracks, control de volumen/mute/solo por track, borrado), `playlists`, `playlists/[id]` (agregar/quitar canciones de la playlist).
- Componentes shadcn nuevos: `dialog`, `select`, `tabs`, `badge`, `slider`, `switch`.
- Verificado en producción: las 4 rutas (`/dashboard/songs`, `/dashboard/playlists`, `/dashboard/categories`, `/dashboard/albums`) responden HTTP 200 en `https://studiodesk.riava.cl`.

Fixes de tipos por diferencias de API entre `base-ui` (preset shadcn "Nova") y Radix estándar (dejar registro para no repetirlos):

1. `DialogTrigger` no tiene prop `asChild` — usar `render`: `<DialogTrigger render={<Button>X</Button>} />`.
2. `Select`'s `onValueChange` tiene firma `(value: string | null, ...) => void` — los setters de `useState<string>` no aceptan `null`, hay que envolver: `onValueChange={(value) => setX(value ?? FALLBACK)}`.

## Reproductor multipista — completada (2026-07-12)

Entregado:

- `MultitrackEngine` (`src/lib/multitrack-engine.ts`): motor no-React sobre Tone.js. Un `Tone.Player` por track, todos sincronizados vía `Tone.getTransport()` (`.sync().start(0)`). Cadena de audio por track: `Player → Gain (volumen) → PitchShift (pitch independiente del tempo) → Meter (VU en tiempo real) → Destination`. Tempo controlado con `playbackRate` (afecta velocidad y se compensa con `PitchShift` para pitch independiente). Fade in/out vía las props nativas de `Tone.Player`. Solo/Mute resuelto centralmente (`applySoloState`): si algún track está en solo, se mutean todos los que no lo están.
- Hook `useMultitrackPlayer` (`src/hooks/use-multitrack-player.ts`): descarga cada pista como blob autenticado (`apiFetchBlob`, nuevo en `api-client.ts`, ya que `GET /storage/{id}` requiere Bearer token y un `<audio src>` normal no puede mandar headers), crea Object URLs, carga el engine y expone estado reactivo (play/pause/stop/seek, loop, tempo, pitch, marcadores client-side, niveles VU por track vía `requestAnimationFrame`).
- UI (`src/components/player/multitrack-player.tsx`): consola de mezcla premium — transporte, barra de progreso con seek, controles de tempo/pitch, marcadores (agregar/saltar/eliminar), y una fila por track con waveform (WaveSurfer.js, solo visual/silenciado — el audio real lo reproduce Tone.js, WaveSurfer solo se usa para dibujar y sincronizar el cursor), medidor de niveles tipo LED animado en tiempo real, y botones de Mute/Solo iluminados. Cargado con `next/dynamic({ ssr:false })` (`multitrack-player-loader.tsx`) para no tocar Web Audio durante el SSR — mismo patrón ya usado para el hero 3D de la landing.
- Fix de datos: `track.file_path` pasó de guardar la ruta absoluta del servidor (inútil para el cliente) a guardar el `id` del `AudioFile`, que es lo que espera `GET /storage/{id}`.

Nota de entorno (nueva, dejar registro): en esta sesión `tsc --noEmit` empezó a colgarse indefinidamente en este Mac (mismo patrón Gatekeeper ya documentado, pero esta vez afectando también a `tsc`, no solo a binarios nativos como `psycopg`/SWC). Se validaron los tipos nuevos manualmente contra los `.d.ts` reales de `tone` y `wavesurfer.js` en `node_modules` antes de hacer commit; la validación real de compilación quedó, como en los demás módulos de frontend, en manos del build de Vercel.

Pendiente / decisiones conscientes para v2:
- Los marcadores son client-side (no persistidos en backend) — el dominio `playback` sigue sin modelo; si se requiere persistencia de marcadores/estado de sesión en vivo, ese es el momento de diseñarlo.
- El control de Tempo cambia `playbackRate` (afecta duración real de la pista); Pitch es un `PitchShift` independiente en semitonos — cumple el requisito de CLAUDE.md de tener ambos controles por separado.

---

# Roadmap

✅ Infraestructura

✅ Backend (catálogo completo; `playback` pendiente para la fase de reproductor)

✅ PostgreSQL

✅ Storage

✅ Autenticación

✅ API REST

🟢 Frontend (landing pública + login/registro/dashboard + CRUD completo)

✅ Dashboard

✅ Reproductor

🟡 Mixer Profesional (mezcla en tiempo real lista; falta persistencia de marcadores/sesión en vivo si se requiere)

⬜ Administración

⬜ Testing

⬜ Deploy

⬜ Optimización

---

# Tareas Pendientes

Infraestructura

Completada (repo, Vercel, Hetzner, DNS, SSL y CI/CD ya en producción).

Backend

- Modelo/lógica de `playback` (control en vivo, se hará junto al reproductor)

Base de Datos

Completada: PostgreSQL 16 en Hetzner, DB `studiodesk_prod`, 8 tablas migradas (`users`, `categories`, `albums`, `songs`, `tracks`, `playlists`, `playlist_songs`, `audio_files`).

Frontend

Completado: landing pública, autenticación y CRUD completo del dashboard.

Reproductor

Completado (Tone.js + WaveSurfer.js). Próximo módulo: Administración.

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

Auth: JWT access+refresh (python-jose) y hashing con passlib/bcrypt. `bcrypt` fijado a `4.0.1` en requirements.txt — passlib 1.7.4 se cuelga indefinidamente al inicializar `CryptContext` con bcrypt>=4.1 (incompatibilidad conocida de esa combinación de versiones).

Superusuario inicial (`contacto@riava.cl`) sembrado directo en la DB de producción vía script puntual por SSH — nunca se escribió la contraseña en código ni en git, solo su hash bcrypt en la tabla `users`.

Landing page (nueva, por pedido explícito del usuario 2026-07-12, fuera del orden estricto del roadmap): efectos 3D con **React Three Fiber + drei** (aprobado por el usuario entre 3 opciones), limitado al hero con lazy-load para no comprometer el objetivo de Lighthouse >90 de CLAUDE.md. Esto añade una tecnología no listada originalmente en CLAUDE.md — el resto de la landing usa Framer Motion (ya en el stack) para scroll/parallax.

Nota de entorno: el binario compilado de `psycopg[binary]` no logra importarse en el sandbox de macOS de este entorno de desarrollo (Gatekeeper lo rechaza). No es un bug del proyecto — en Linux (CI de GitHub Actions y el propio servidor Hetzner) funciona sin problemas. La migración Alembic y las pruebas de import se validan ahí, no localmente en Mac.

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

v0.2.0

- Dominios `users` y `auth` completos: modelo User, JWT (access+refresh), endpoints de registro/login/refresh/me, protección por rol (superusuario).
- Primera migración Alembic (tabla `users`) generada y aplicada en producción.
- Superusuario inicial `contacto@riava.cl` sembrado en producción; login end-to-end verificado.
- Fix: `bcrypt` fijado a `4.0.1` por incompatibilidad con `passlib` 1.7.4.
- Landing page 3D (React Three Fiber + drei) iniciada por pedido explícito del usuario.

v0.3.0

- Dominios de catálogo completos: `categories`, `albums`, `songs`, `tracks` (1:N con `songs`, cascade delete), `playlists` (con tabla intermedia `playlist_songs`), `storage` (upload/download de audio a disco local en Hetzner).
- Segunda migración Alembic (8 tablas en total) aplicada en producción.
- CRUD y relaciones verificadas end-to-end en producción, incluyendo borrado en cascada.
- `playback` queda deliberadamente sin modelo — se diseñará junto al reproductor (Fase 9-10).

v0.4.0

- Landing page pública con hero 3D (React Three Fiber + drei), scroll reveal (Framer Motion) y SEO completo.
- Desplegada y verificada en `https://studiodesk.riava.cl`.
- Documentado el problema de Gatekeeper con binarios nativos (SWC) que impide correr `next build`/`eslint` localmente en este Mac.

v0.5.0

- Autenticación en el frontend: cliente API, store Zustand persistido, TanStack Query, páginas `/login` y `/registro`, `/dashboard` protegido con listado de canciones.
- Login end-to-end verificado en producción contra el backend real.
- Fix: `export const dynamic` no funciona en archivos `"use client"` — layout de `/dashboard` separado en Server Component + client shell.
- Fix: nunca tocar la API de Zustand `persist` durante el render (solo en `useEffect`) para evitar crashes de build/runtime con SSR.

v0.6.0

- CRUD completo del dashboard: categorías, álbumes, canciones (con tracks: subida de audio, volumen, mute, solo), playlists (alta/baja de canciones).
- Endpoint backend faltante `GET /api/v1/playlists/{id}/songs`.
- Verificado en producción: 4 rutas del dashboard responden HTTP 200.
- Fixes de tipos por diferencias `base-ui` vs Radix (`DialogTrigger` sin `asChild`, `Select.onValueChange` nullable).
- Próximo módulo: Reproductor (Tone.js + WaveSurfer.js).

v0.7.0

- Reproductor multipista: motor `MultitrackEngine` sobre Tone.js (Players sincronizados vía Transport, volumen/mute/solo, tempo y pitch independientes, fade in/out, VU meters en tiempo real).
- UI premium tipo consola de mezcla: transporte, seek, marcadores, waveform por track (WaveSurfer.js, visual) y medidores LED animados.
- Fix de datos: `track.file_path` ahora guarda el `id` del `AudioFile` (antes guardaba la ruta absoluta del servidor, inútil para el cliente).
- Nuevo `apiFetchBlob` para descargar audio autenticado (`GET /storage/{id}` requiere Bearer token).
- Cargado con `next/dynamic({ ssr:false })` para no tocar Web Audio durante SSR.
- Nota de entorno: `tsc --noEmit` empezó a colgarse indefinidamente en este Mac esta sesión; validación de tipos hecha manualmente contra los `.d.ts` de `tone`/`wavesurfer.js`, validación de build real delegada a Vercel.