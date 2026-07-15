# CLAUDE.md

# Professional Development Guide

## Proyecto

Nombre temporal del proyecto:
Studiodesk

Descripción:

StudioDesk es una plataforma SaaS profesional para reproducción y control de pistas multipista (Multitrack Playback), diseñada para músicos, iglesias, bandas, productores y eventos en vivo.

La plataforma permitirá administrar canciones, controlar instrumentos individuales, realizar mezclas en tiempo real y ejecutar presentaciones con una interfaz moderna, rápida y profesional.

La primera versión NO utilizará Inteligencia Artificial.

La separación automática mediante IA será considerada únicamente como una futura versión del producto.

**Excepción v2 — separación de stems con IA (Demucs):** habilitada como excepción puntual dentro de v1, ya en progreso. Usa Demucs (Meta AI Research), un modelo gratuito y open source, corriendo en el mismo servidor de Hetzner (sin GPU, sin APIs de pago, sin servidores adicionales). Ver la sección "REPRODUCTOR" y el ejemplo de estructura de canción más abajo para el detalle de la limitación de 6 stems.

---

# Objetivo del Proyecto

Construir una plataforma profesional similar a un DAW simplificado, enfocada exclusivamente en la reproducción en vivo de canciones multipista.

El sistema debe ser:

- extremadamente rápido
- intuitivo
- moderno
- profesional
- escalable
- responsive
- fácil de mantener

El usuario debe poder controlar individualmente cada instrumento de una canción.

# OBJETIVO GENERAL

Construir una plataforma profesional de reproducción multipista que permita:

- Administrar canciones.
- Administrar pistas individuales.
- Crear playlists.
- Organizar repertorios.
- Controlar cada instrumento en tiempo real.
- Ejecutar presentaciones en vivo con estabilidad y baja latencia.

La primera versión NO utilizará Inteligencia Artificial.

Las funcionalidades basadas en IA serán desarrolladas en versiones futuras.

---

# VALOR DIFERENCIADOR DEL PRODUCTO

Este proyecto NO busca ser solamente un reproductor de pistas.

Busca convertirse en la mejor plataforma profesional para reproducción multipista en vivo.

Los principales diferenciadores serán:

• Interfaz extremadamente intuitiva.
• Experiencia similar a una aplicación de escritorio.
• Control independiente de cada instrumento.
• Waveforms sincronizados.
• Mezclador profesional integrado.
• Organización profesional de repertorios.
• Excelente rendimiento.
• Baja latencia.
• Animaciones modernas.
• Diseño Premium.
• Arquitectura escalable.
• Toda la infraestructura optimizada para minimizar costos utilizando Hetzner.

Cada nueva funcionalidad debe aportar valor real durante una presentación en vivo.

---

# FILOSOFÍA DEL PROYECTO

Cada decisión técnica debe priorizar:

- Simplicidad.
- Escalabilidad.
- Rendimiento.
- Experiencia de usuario.
- Código limpio.
- Fácil mantenimiento.

Nunca desarrollar una solución más compleja de lo necesario.

---

# ARQUITECTURA

                     GitHub
                        │
                        │
           ┌────────────┴────────────┐
           │                         │
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
                        │
                 Audio Storage
                    Hetzner

Toda la comunicación se realizará mediante API REST.

Frontend y Backend permanecerán completamente desacoplados.

---

# TECNOLOGÍAS

## Frontend

- Next.js 15
- React 19
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- Zustand
- TanStack Query
- Tone.js
- WaveSurfer.js

Deploy:

Vercel

Repositorio:

GitHub

---

## Backend

- Python 3.12
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- JWT
- Gunicorn
- Uvicorn
- FFmpeg

Deploy:

Hetzner

---

## Base de Datos

PostgreSQL

Deploy:

Hetzner

---

## Storage

Todo el almacenamiento estará en Hetzner.

No utilizar:

- AWS S3
- Firebase Storage
- Cloud Storage

Los archivos serán organizados por carpetas.

---

# REPRODUCTOR

El reproductor es el núcleo del sistema.

Debe implementarse utilizando:

- Tone.js
- WaveSurfer.js

Debe soportar:

- Play
- Pause
- Stop
- Loop
- Tempo
- Pitch
- Volumen individual
- Solo
- Mute
- Fade In
- Fade Out
- Barra de progreso
- Marcadores
- Waveforms sincronizados
- Baja latencia

---

# FUNCIONALIDADES PRINCIPALES

El sistema debe permitir:

- Gestión de usuarios.
- Gestión de canciones.
- Gestión de álbumes.
- Gestión de playlists.
- Gestión de categorías.
- Gestión de repertorios.
- Gestión de instrumentos.

Cada canción estará formada por múltiples pistas independientes.

Ejemplo:

Canción

├── Voz Principal

├── Coros

├── Piano

├── Bajo

├── Guitarra

├── Batería

├── Pads

├── Click

└── Cue

**Nota sobre separación automática por IA:** la separación automática (Demucs `htdemucs_6s`, gratuito, corriendo por CPU en el servidor actual) entrega 6 stems fijos: voz, batería, bajo, guitarra, piano y "otros" (pads, sintes, cuerdas, metales, etc. quedan mezclados en ese último track). No reproduce el árbol completo de instrumentos de este ejemplo (coros separados de voz principal, click, cue) — eso sigue siendo trabajo manual del usuario.

Cada pista será completamente independiente.

---

# PRINCIPIOS DE UX

Toda pantalla debe responder las siguientes preguntas:

- ¿El usuario entiende qué hacer en menos de cinco segundos?
- ¿Puede realizar la acción principal en menos de tres clics?
- ¿La interfaz está libre de elementos innecesarios?
- ¿La navegación es consistente?
- ¿La experiencia se siente como una aplicación profesional?

Inspiración:

- Spotify
- Ableton Live
- Logic Pro
- Apple Music
- Linear
- Raycast
- Notion

Siempre priorizar simplicidad.

---

# UI

Obligatorio

- Responsive
- Mobile First
- Dark Mode
- Componentes reutilizables
- Skeleton Loading
- Lazy Loading
- Diseño Premium
- Animaciones suaves
- Excelente UX

---

# PERFORMANCE

Toda nueva funcionalidad debe mantener el sistema rápido.

Implementar:

- Lazy Loading
- Dynamic Imports
- Code Splitting
- Memoization
- Virtualización
- Caché
- Optimización de imágenes
- Optimización de audio
- Suspense
- Skeleton Loading

Objetivo:

Lighthouse superior a 90.

---

# SEGURIDAD

Implementar desde el inicio:

- JWT
- Refresh Tokens
- Password Hash (bcrypt)
- Variables de entorno
- Validaciones Backend
- Validaciones Frontend
- Sanitización de datos
- Prevención SQL Injection
- Prevención XSS
- Rate Limiting
- CORS
- HTTPS obligatorio
- Security Headers
- Logs de auditoría

Nunca almacenar información sensible en el Frontend.

---

# SEO

Todo el Frontend debe cumplir SEO básico.

Implementar:

- Metadata dinámica
- Title único
- Description
- Open Graph
- Twitter Cards
- Sitemap.xml
- robots.txt
- Canonical URL
- JSON-LD
- URLs amigables
- Optimización de imágenes

---

# ACCESIBILIDAD

Cumplir WCAG.

Implementar:

- navegación por teclado
- aria-label
- contraste correcto
- focus visible
- labels accesibles
- diseño responsive

---

# CALIDAD DEL CÓDIGO

Todo el proyecto debe seguir:

- SOLID
- DRY
- KISS
- Clean Code
- Clean Architecture
- Separation of Concerns

Nunca escribir código duplicado.

Cada componente debe tener una única responsabilidad.

---

# CONVENCIONES

Variables:

camelCase

Componentes:

PascalCase

Hooks:

useNombre()

Interfaces:

INombre

Types:

NombreType

Constantes:

UPPER_CASE

Archivos:

kebab-case

---

# BACKEND

Arquitectura modular.

Separar por dominios:

- auth
- users
- songs
- tracks
- playlists
- albums
- categories
- storage
- playback

Nunca concentrar toda la lógica en un único archivo.

---

# BASE DE DATOS

Todas las tablas deberán incluir:

- id
- created_at
- updated_at

Siempre utilizar migraciones con Alembic.

---

# CONTROL DE VERSIONES

Repositorio:

GitHub

Cada módulo terminado debe generar un commit.

Ejemplos:

feat(auth): implement JWT authentication

feat(player): professional multitrack mixer

feat(storage): upload songs

fix(api): improve validation

refactor(playback): optimize Tone.js synchronization

---

# ESTRUCTURA GENERAL

frontend/

backend/

docs/

---

# ROADMAP

Fase 1

- Infraestructura

Fase 2

- Backend FastAPI

Fase 3

- PostgreSQL

Fase 4

- Storage

Fase 5

- Autenticación

Fase 6

- API REST

Fase 7

- Frontend

Fase 8

- Dashboard

Fase 9

- Reproductor

Fase 10

- Mixer Profesional

Fase 11

- Administración

Fase 12

- Testing

Fase 13

- Deploy

Fase 14

- Optimización

---

# VERSIONES FUTURAS

Estas funcionalidades NO pertenecen a la versión inicial.

Versión 2

- IA para separación automática de instrumentos. **(EN PROGRESO — ver "Excepción v2" al inicio del documento. Implementado con Demucs (`htdemucs_6s`), gratuito/open source, 6 stems: voz/batería/bajo/guitarra/piano/otros, corriendo en el servidor Hetzner actual sin GPU.)**
- IA para eliminación de voz.
- IA para detección automática de BPM.
- IA para cambio automático de tono.
- IA para armonización.

Versión 3

- Aplicación iOS.
- Aplicación Android.
- Modo Offline.
- Sincronización entre dispositivos.
- Control remoto.
- Integración MIDI.
- Integración Stream Deck.
- Integración OBS.

---

# REGLAS PARA CLAUDE

Antes de escribir una sola línea de código Claude debe:

1. Leer completamente este archivo.

2. Leer PROJECT_STATE.md.

3. Comprender el módulo actual.

4. Continuar exactamente desde el último módulo completado.

5. Nunca reconstruir módulos ya finalizados.

6. Nunca cambiar la arquitectura definida.

7. Nunca cambiar las tecnologías acordadas.

8. Nunca modificar funcionalidades estables sin autorización.

9. Mantener siempre la coherencia del proyecto.

10. Al finalizar un módulo actualizar PROJECT_STATE.md con:

- módulo completado
- versión
- siguiente módulo
- tareas pendientes
- decisiones técnicas nuevas

Este documento constituye la única fuente de verdad respecto a la arquitectura, tecnologías, principios y visión del proyecto.