# My App

Transer es una app de estilo consola portátil inspirada en Mega Man Star Force. Reúne perfiles, Battle Cards, correo, conexiones, avisos categorizados y la asistente DEMPA en una interfaz adaptable en español e inglés.

## Develop locally

```bash
cp .env.example .env
corepack enable
pnpm install
pnpm dev
```

`.env.example` sets `AUTH_DISABLED=true` as a commented-out option; uncomment it
to skip sign-in while developing.

## Project layout

- `app/`: interfaz Transer, componentes y perfiles públicos
- `actions/`: operaciones compartidas por la interfaz y el agente
- `server/`: autenticación, lógica de negocio y cliente de base de datos
- `drizzle/`: esquema y migraciones PostgreSQL
- `public/cartas/`: imágenes del catálogo de Battle Cards
- `public/images/dempa/`: hoja y recortes de sprites con atlas documentado
- `public/sonidos/`: sonidos de módulos del Transer

Framework docs: [agent-native.com/docs](https://agent-native.com/docs?utm_source=github&utm_medium=referral&utm_content=fusion-starter-readme).
