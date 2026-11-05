# Bitácora Transer

Registro permanente del proyecto. Cada orden del usuario y cada proceso relevante se agrega al final con fecha y hora. No se borran entradas anteriores; las correcciones se registran como nuevas entradas.

## 1. Descripción del sistema

- **Qué es:** interfaz "SYSTEM TRANSER" inspirada en Mega Man Star Force, dentro de una app React (React Router + Tailwind CSS + TypeScript).
- **Idioma:** español por defecto, con cambio a inglés.
- **Dispositivos:** debe adaptarse a móvil y PC.
- **Pantallas principales:** HOME, E-MAIL, TELÉFONO, BROTHER BAND, PERSONAL CARD, NAVI CARDS, BATTLE CARDS (B.Cards), STATUS, SCAN/WAVE WORLD, S.O.S., ajustes, ON AIR, HERMNO (conexiones), Biblioteca/B.Card.
- **Colores de tema:** C.UNI, LEO (rojo-naranja), PEGASUS (azul), DRAGON (verde), LEGEND (oro), RENEGADO (morado), HARP (color extra).
- **Idioma de las cartas:** catálogo bilingüe; las imágenes van en `public/cartas`.

## 2. Arquitectura y estructura

- `app/`: interfaz (rutas en `app/routes`, componentes en `app/components`, utilidades en `app/lib`).
- `server/`: servidor (`server/db.ts`, `server/bcard.ts`, `server/transer-creator.ts`, rutas de perfil público en `server/routes/public-profile/`, plugins de auth en `server/plugins/auth.ts`).
- `actions/`: acciones Agent Native (lógica de negocio: B.Cards, correo, perfil, conexiones, eventos, recompensas, códigos Zenny, tienda, catálogo, gestión del creador).
- `drizzle/`: esquema y migraciones de PostgreSQL.
- `vite.config.ts`: configuración de Vite.

### Autenticación y acceso

- Autenticación por correo y contraseña mediante `createAuthPlugin` (Better Auth) de Agent Native.
- Rutas públicas: solo `/p` (perfiles compartidos). El resto requiere sesión mediante `RequireSession` de `AppProviders`.
- `/sign-in`, creación de cuenta y recuperación las gestiona el framework.
- Variable `AUTH_DISABLED`: debe ser `false` (o no existir). Si está en `true`, todas las peticiones entran como `dev@local.test`.

### Administración del creador

- Propietario del creador: se define con la variable `TRANSER_CREATOR_EMAIL`. Se inserta en la tabla `transerCreatorOwner` (fila `primary`) solo si no existe.
- Administradores: tabla `transerCreatorAdmins`. El propietario los otorga o revoca con la acción `manage-transer-creator`.
- Transferencia de propiedad: misma acción, operación `transfer`. La cuenta destino debe haber iniciado sesión en Transer al menos una vez.
- Valor configurado: `TRANSER_CREATOR_EMAIL=nathan11.adams3@gmail.com` (cuenta de administración y desarrollo, según indicó el usuario).

## 3. Cómo se construyó

- Fase inicial: interfaz replicada desde imágenes, con ajustes responsivos, idiomas, temas de color, perfil, catálogo de cartas, correo (redacción, bandejas, borradores), sonidos y hermanos.
- Fase de integración: el usuario envió `transer-0f6 (4).zip` con una versión más avanzada. Se extrajo en `/tmp/transer-zip/extraido/` y se compararon `app/`, `server/`, `actions/` y `drizzle/` con `diff -rq`.
- Se copiaron de la versión avanzada: `app/` y `server/` completos, acciones nuevas, esquema y migraciones `0000`–`0008`.
- Respaldo previo de `app/` y `server/` en `/tmp/transer-backup/` (temporal, no garantizado).
- Dependencias añadidas: `qrcode@^1.5.4` y `@types/qrcode@^1.5.6`.

## 4. Registro de cambios y procesos

### 2026-10-25 — Sesión de integración y correcciones

- **19:35 UTC** — Creación de esta bitácora (`BITACORA.md`) a petición del usuario.

- **Integración del ZIP avanzado.** Se copiaron `app/`, `server/`, `actions/` y `drizzle/` desde el ZIP. Se añadió la dependencia `qrcode`. Se eliminó `app/data/cartas.ts` (no se usaba). `pnpm typecheck` pasó.

- **Migraciones de base de datos.** B.Cards fallaba porque faltaban tablas (`transer_profiles`, `zeny_accounts`, etc.). Se ejecutó `pnpm db:migrate` y se aplicaron correctamente.

- **Acceso sin sesión.** En `app/root.tsx`, `PUBLIC_PATHS` pasó de `["/", "/p"]` a `["/p"]`, para que la app raíz requiera inicio de sesión.

- **Error de ON AIR (`qrcode`).** Error: `The requested module ... qrcode/lib/browser.js does not provide an export named 'toDataURL'`.
  - Intento 1: `import { toDataURL } from "qrcode"` cambiado a `import QRCode from "qrcode"` en `app/components/cartas/print-bcard-catalog.ts`. Falló con `does not provide an export named 'default'`.
  - Corrección: se añadió `include: ["qrcode"]` en `optimizeDeps` de `vite.config.ts`, para pre-empaquetar el paquete CommonJS. Se reinició el servidor; `node_modules/.vite/deps/qrcode.js` existe.
  - Estado: pendiente de confirmar en el navegador.

- **Cuenta de administración.** Se configuró la variable `TRANSER_CREATOR_EMAIL=nathan11.adams3@gmail.com`. Pendiente: si ya existía otro propietario en la base de datos, la variable no lo reemplaza; en ese caso se debe transferir desde la cuenta actual.

- **Carga infinita (skeleton).** Causa identificada: `AUTH_DISABLED=true` en el entorno, que hacía entrar como `dev@local.test` sin perfil ni datos. Se cambió a `AUTH_DISABLED=false` y se reinició el servidor.
  - Verificado por servidor: `/` y `/sign-in` responden 200; `/_agent-native/auth/session` responde "Not authenticated" (esperado sin sesión).
  - Pendiente: confirmar en el navegador (recarga forzada o borrar datos del sitio, o revisar errores de consola).

## 5. Pendientes

- Confirmar en navegador que ON AIR carga sin error de `qrcode`.
- Confirmar que la app muestra inicio de sesión al entrar sin sesión.
- Confirmar que B.Cards carga tras iniciar sesión.
- Confirmar el propietario real del creador en la base de datos (y transferir si hace falta).
- Traducir y dar estilo Transer a inicio de sesión, creación de cuenta y recuperación (actualmente en inglés).

## 6. Registro de errores

| Fecha (UTC) | Error | Causa | Estado |
|---|---|---|---|
| 2026-10-25 | Tablas de B.Cards inexistentes | Migraciones del ZIP no aplicadas | Resuelto (`pnpm db:migrate`) |
| 2026-10-25 | Entrada directa sin login | `"/"` en `PUBLIC_PATHS` y `AUTH_DISABLED=true` | Corregido en código y variable |
| 2026-10-25 | `qrcode` sin export `toDataURL` / `default` | Paquete CommonJS no pre-empaquetado por Vite | Corregido (`optimizeDeps.include`), pendiente de verificar |
| 2026-10-25 | Carga infinita en skeleton | Sesión falsa `dev@local.test` (`AUTH_DISABLED`) y arranque lento (~15 s) | Corregido en variable; pendiente de verificar en navegador |

## 7. Notas de seguridad y privacidad

- No se consultan ni divulgan datos personales de usuarios por correo.
- Las variables sensibles (`DATABASE_URL`, `BETTER_AUTH_SECRET`, etc.) no se escriben en este archivo.

## 8. Entradas posteriores

- **2026-10-25 20:41 UTC** — El usuario solicitó continuar con los puntos de `Retomar.txt` (misiones/eventos, módulo Objetos e inventario, y migraciones de tienda). Se buscó el archivo en el proyecto, pero no está disponible. Pendiente: recibir el contenido o un adjunto accesible antes de modificar código.

- **2026-10-25 20:42 UTC** — Contexto de desarrollo confirmado: 16 misiones diarias con progreso verificable, recompensas transaccionales y experiencia/nivel; eventos temporales del creador con cartas GIGA y reclamación única; módulo Objetos conectado al inventario persistente con búsqueda, filtros y reloj de arena; identificador interno de tienda migrado de forma segura al no existir datos previos de tienda. La lógica social y de tienda pasa el typecheck. Próximo paso: atender la siguiente instrucción concreta del usuario desde este estado.
