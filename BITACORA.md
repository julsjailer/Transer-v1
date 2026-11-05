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

- **2026-10-26 — Ajustes de interfaz y proveedor DEMPA** — Avisos colocados a la derecha del encabezado; cambio de idioma conservado en Ajustes; Al Aire compactado con navegación horizontal y etiquetas «REGISTRO» / «Escanear descubrimiento»; fotos PERSONAL sin fondo turquesa y con `object-contain`; MEGA ahora muestra solo la entrada DEMPA, con chat abierto mediante el AgentSidebar existente. Conectar se simplificó visualmente a Buscar/Siguiendo con desplazamiento horizontal; la lógica de solicitudes se conserva en backend porque sigue siendo necesaria para la sección de hermanos. Correo ahora busca cuentas Transer por nombre/usuario, muestra avatar/nombre y envía mensajes usando la acción persistente existente; REGAL limita los adjuntos a cartas/objetos/imagen y añade captura con cámara en vivo (requiere permiso del navegador). Se solicitó y configuró `TRANSER_CREATOR_EMAIL=nathan11.adams3@gmail.com` mediante configuración de entorno, no con una regla de admin en cliente.
  - **DEMPA y modelos:** el prompt de servidor mantiene el nombre DEMPA y las acciones del agente; se habilitó selector de modelo en AgentSidebar. La auditoría no encontró corpus, modelo local ni memoria de entrenamiento de Transer; Agent-Native admite Gemini y Ollama, pero el proyecto no tiene clave Gemini ni endpoint/modelo Ollama configurados. No se añadió clave ficticia ni se afirmó que el entrenamiento local exista. La selección del proveedor requiere configurarlo en Ajustes → Agent → Model; funciones de voz dependen de la configuración del toolkit/navegador.
  - **Verificaciones:** `pnpm typecheck` pasó; `pnpm test` pasó (9 archivos, 25 pruebas); `oxfmt --check` pasó para los seis archivos de interfaz editados. El servidor de desarrollo está activo y ya no reporta el error SSR `IconBolt is not defined`; navegación a `/` solicitada en vista previa. No se pudo confirmar visualmente la app autenticada ni probar cámara/voz por falta de sesión/permiso. `pnpm build` se inició una vez y fue cancelado por el usuario durante «Building (React Router framework mode)»; estado del build: pendiente, no reintentar sin autorización.
  - **Pendientes:** probar con sesión autenticada (MEGA/voz, correo/cámara, permisos y layout móvil); añadir la clave Gemini de forma segura y configurar Ollama si se desea modo híbrido; confirmar que la fila de propietario en PostgreSQL coincide con el correo configurado; realizar un build autorizado.
  - **Incidente corregido durante los cambios:** al quitar el icono de perfil MEGA se eliminó también `IconBolt` que se usa en el selector de módulo; el SSR informó `ReferenceError`. Se restauró la importación y los logs posteriores quedaron libres de ese error.

- **2026-10-26 03:30 UTC — Informe de continuidad para otra cuenta (inspección, sin cambios de producto).** Se revisó el estado real de DEMPA/MEGA y se actualiza esta bitácora para facilitar el traspaso. En esta inspección no se modificó código ni configuración; esta entrada es el único cambio.
  - **MEGA:** `app/routes/_index.tsx` (bloque `slot === "mega"`, alrededor de líneas 972–1034) muestra la pantalla DEMPA, el sprite, etiquetas visuales y el botón «ABRIR CHAT DEMPA». El botón llama a `sendToAgentChat` con contexto de Transer, módulo e idioma; `submit: false` significa que abre el sidebar sin enviar el texto inicial automáticamente. Las tarjetas «Chat», «Voz» y «Funciones Transer» son rótulos, no controles separados.
  - **Sidebar:** `app/components/layout/Layout.tsx` monta `AgentSidebar` globalmente a la derecha, con `storageKey="transer-agent-chat"` y `showModelSelector`. El contexto de MEGA se pasa desde `_index.tsx`, no como prop del layout. El historial lo gestiona el toolkit instalado. El selector permite elegir entre opciones disponibles, pero por sí solo no confirma que haya un proveedor operativo.
  - **Registro del agente:** `server/plugins/agent-chat.ts` define el prompt de sistema como DEMPA y carga acciones del registro estático de Transer. El catálogo MCP está vacío y este plugin no fija un motor (`engine`) propio. `server/plugins/config.ts` desactiva `observational-memory`, además de integraciones, Sentry y terminal.
  - **Modelos y credenciales:** el toolkit instalado incluye soporte para Gemini y Ollama. En la comprobación de esta sesión, las variables de entorno `GOOGLE_GENERATIVE_AI_API_KEY`, `GEMINI_API_KEY`, `OLLAMA_BASE_URL`, `AGENT_ENGINE` y `AGENT_MODEL` no estaban presentes; sus valores no se consultaron ni se divulgaron. Esto no permite concluir si hay credenciales guardadas en el almacén del framework: la consulta al endpoint de estado del motor devolvió `HTTPError`. Por tanto, conexión efectiva y modelo listo siguen **sin verificar**. Gemini requiere credencial del proveedor; Ollama requiere una instancia/modelo accesible desde el servidor de Transer.
  - **Memoria y conocimiento:** no se encontró corpus local ni configuración de entrenamiento activa en el proyecto inspeccionado. Las instrucciones del prompt y las acciones registradas no equivalen a entrenamiento. La memoria observacional está desactivada. No se debe afirmar que DEMPA tenga memoria persistente o entrenamiento local hasta integrar y verificar una solución concreta.
  - **Traspaso de cuenta/entorno:** los archivos y cambios de código pertenecen al proyecto; la sesión de inicio de sesión, variables secretas, credenciales del proveedor y estado de PostgreSQL son externos al texto de esta bitácora y no se transfieren por copiarla. En la cuenta/entorno de destino se debe abrir el mismo proyecto, iniciar sesión, volver a configurar los secretos mediante los ajustes seguros del entorno y comprobar el estado real del motor. No copiar claves o tokens a este archivo. La variable `TRANSER_CREATOR_EMAIL` ya se había configurado en el entorno de origen, pero la fila de propietario efectiva en PostgreSQL continúa sin confirmación; no asumir que se transfirió ni que cambiar la variable reemplaza una fila existente.
  - **Verificaciones y límites:** `pnpm typecheck`, `pnpm test` (9 archivos, 25 pruebas) y `oxfmt --check` de los seis archivos de interfaz constan como aprobados en la sesión anterior. El build de producción quedó cancelado por petición del usuario y sigue sin resultado; no relanzarlo sin autorización. La interfaz autenticada, voz, cámara y proveedor no se probaron de extremo a extremo por falta de sesión/permisos y del estado de proveedor verificable. No hay que presentar estas funciones como verificadas visualmente.
  - **Siguiente orden sugerido:** recibir el paquete DEMPA estructurado que el usuario está preparando; compararlo primero con esta integración sin reemplazar Transer ni editar archivos hasta recibir autorización. Después, con autorización, integrar lo necesario y verificar con una sesión autenticada; decidir/configurar Gemini u Ollama; confirmar el propietario en la base de datos; y solicitar autorización antes de repetir el build cancelado.
  - **Nota de precisión:** esta entrada aclara la nota anterior sobre ausencia de configuración Gemini/Ollama: lo comprobado fueron variables de entorno ausentes, no el almacén privado de credenciales, cuyo endpoint de estado no respondió correctamente.

- **2026-10-27 00:55 UTC — Cardex, inventario, perfiles y sonidos (cambios implementados).** Se trabajó en el árbol activo de la raíz del proyecto; no se modificó la carpeta archivada `interfaz-replicada-80b/`.
  - **Cardex informativo:** `app/components/cartas/PanelAlAire.tsx` ya no muestra el catálogo con botones de descubrimiento dentro de CARDEX. CARDEX tiene cámara para escanear e identificar el nombre de la carta mediante Tesseract OCR en el dispositivo, muestra su información y no modifica la colección. El flujo conserva el escaneo QR separado y ahora se llama «Escanear Carta de Batalla»; ese flujo continúa usando `actions/scan-bcard.ts` y sus límites de colección. No se debe atribuir esos límites al identificador informativo de CARDEX.
  - **OCR local y privacidad:** se añadió `tesseract.js` y el modelo inglés en dependencias; worker, WASM y modelo se sirven desde `public/ocr/` y no requieren descargar el modelo del CDN al utilizar la app. La captura se procesa en el dispositivo, no se guarda ni se envía al servidor; solo se guarda la clave identificada. El lector compara el texto OCR con el nombre normalizado del catálogo. La cámara y el reconocimiento en una carta física todavía requieren prueba autenticada con permiso de cámara; los recursos estáticos sí respondieron HTTP 200.
  - **REGISTROS:** `drizzle/schema.ts` y `drizzle/migrations/0009_slippery_gorgon.sql` añaden `bcard_cardex_identifications` con índice único por usuario/carta y fecha/hora. Las acciones `actions/identify-bcard-cardex.ts` y `actions/get-bcard-cardex-identifications.ts` guardan o recuperan la identificación del usuario autenticado. Si la carta ya existe en el registro, no crea duplicado y dirige a REGISTROS, donde puede abrirse la carta guardada. La migración aditiva fue aplicada en la base de datos conectada a este entorno; las otras cuentas/entornos deben ejecutar las migraciones del proyecto.
  - **Correo:** `app/components/correo/PanelCorreo.tsx` permite adjuntar un objeto existente del inventario y una cantidad disponible; `actions/send-transer-gift.ts` valida tipo, existencia y saldo dentro de una transacción. «Adjuntar imagen» usa el selector de galería/archivos y ya no fuerza cámara; «Abrir cámara» sigue siendo un control independiente. Los adjuntos de objetos se presentan con el nombre y categoría del objeto.
  - **Objetos/tienda:** `app/lib/bcard-store.ts` define categorías para aceleradores de tiempo, recuperación, acceso y experiencia. Se agregó el Chip de experiencia, comprable/publicable en tienda y utilizable desde OBJETO; cada chip consumido otorga 25 XP y recalcula nivel. Los relojes se clasifican como «Aceleradores de Tiempo» y conservan el efecto existente de reducir una hora del temporizador. Antídoto y Llave de red pueden inventariarse, regalarse y publicarse, pero no tienen todavía una acción de uso funcional; no presentarlos como consumibles activos.
  - **Conectar y perfiles:** `app/components/hermano/PanelConectar.tsx` agrupa Siguiendo, Seguidores, Amigos, Hermanos y Conexiones bajo Filtros; la búsqueda devuelve perfiles abribles, botones en grilla responsiva evitan superposición y se muestran descripción pública y favoritos únicamente si la colección está pública. `drizzle/schema.ts`, `actions/get-transer-profile.ts`, `actions/save-transer-profile.ts` y `actions/get-transer-connections.ts` incorporan `secret_description`; el endpoint de conexiones solo la devuelve a una amistad activa marcada como hermano. En perfiles fuera de Banda-Hermano, Secrt muestra el aviso «Debes formar parte de su Banda-Hermano para ver su Secreto Compartido». Ajustes guarda por separado el mensaje público y el secreto.
  - **Banda-Hermano/foto:** `app/components/hermano/PanelHermano.tsx` muestra los seis huecos como cuadros «Vacío», fotos favoritas reales, mensaje público y secreto autorizado. El recorte de `AvatarCropDialog` es cuadrado; la foto del PERSONAL usa `object-cover` para llenar el marco.
  - **SONIDOS-V2:** se inspeccionó el ZIP adjunto y se copiaron sus 13 WAV a `public/sonidos/` con nombres seguros. `app/lib/sonidos.ts`, `app/routes/_index.tsx`, `NotificationCenter.tsx`, `PanelCorreo.tsx`, `PanelAlAire.tsx`, `PanelConectar.tsx` y `BCardColeccion.tsx` conectan audio de DEMPA on/off, avisos, correo, desplazamiento, retorno, selección/obtención de cartas, escaneo QR, compra, errores/denegación y subida de nivel.
  - **Verificaciones de esta sesión:** `pnpm typecheck` pasó; `pnpm test` pasó (9 archivos, 25 pruebas); `oxfmt --check` pasó para los nueve archivos reescritos/formateados. La vista previa raíz y los recursos OCR/sonido comprobaron respuesta HTTP 200. No se pudo probar el flujo autenticado con cámara ni recorrer Conectar/Correo como usuario porque no se contó con una sesión autenticada/permisos de cámara. No se volvió a ejecutar `pnpm build`, que sigue pendiente de autorización por haber sido cancelado antes.
  - **Pendientes concretos:** hacer una prueba autenticada de OCR con cartas físicas (incluidas cartas cuyo nombre no esté en inglés); decidir e implementar los efectos de uso para Antídoto y Llave de red; probar envío y recepción de objetos/fotos, permisos de cámara, perfiles públicos/secretos y apariencia móvil; repetir build solo con autorización. La conexión de Gemini/Ollama y el propietario creador siguen pendientes tal como se registraron arriba.

- **2026-10-27 — Diagnóstico de carga persistente (sin cambios de código).** El servidor de desarrollo sigue activo y el proxy responde HTTP 2xx. La raíz, `/sign-in`, `/_agent-native/auth/session` y los módulos de arranque (`entry.client.tsx`, `root.tsx`, `_index.tsx`) respondieron HTTP 200; los logs no mostraron errores, solo una advertencia de JSX transform desactualizado. La sesión consultada sin cookies devuelve `Not authenticated`, comportamiento esperado para una petición sin sesión; la ruta `/` permanece detrás de autenticación y el marco muestra su esqueleto mientras resuelve la sesión. Los recursos de OCR se cargan solo al abrir ON AIR, por lo que no explican el bloqueo de inicio. No se desactivó autenticación ni se ejecutó el build. El usuario confirmó que ve una pantalla en blanco/error, no el esqueleto esperado ni el formulario de acceso. **Pendiente:** identificar el error exacto mediante captura o texto visible y revisar desde su sesión del navegador la consola y la petición de sesión; no se pudo automatizar una sesión visual porque no hay Playwright/Puppeteer instalado.

- **2026-10-27 — Corrección de Biblioteca y ON AIR.** Se restauró `SONIDO_MENU.biblio` a `library.wav` (el sonido que tenía antes) y se movió `card-select.wav` al evento de seleccionar una carta en `NavegadorCartas`. El error al abrir ON AIR ocurría porque `tesseract.js` v7 es CommonJS y Vite servía su entrada fuente sin preoptimizar; se añadió `tesseract.js` a `optimizeDeps.include`, conservando la API `createWorker`. Tras reiniciar, Vite transformó la importación a su módulo optimizado (`tesseract__js.js`), el módulo verificado exporta `createWorker` y responde HTTP 200. **Verificaciones:** `pnpm typecheck` pasó; `pnpm test` pasó (9 archivos, 25 pruebas); `oxfmt --check` pasó en los tres archivos editados; `/`, los módulos de ON AIR/Biblioteca y los dos WAV responden HTTP 200. El servidor de desarrollo está activo. La herramienta no pudo abrir el iframe, por lo que falta confirmar visualmente los clics en ON AIR y Biblioteca; no se ejecutó `pnpm build`.

- **2026-10-27 — Vista previa cargada tras espera.** El usuario confirma que ya ve Transer autenticado y funcionando. No hubo cambios adicionales de código durante el último diagnóstico; la causa exacta del retraso no se confirmó. Los logs de esa ejecución sí registraron un arranque frío aproximado de 16 segundos y generación inicial de CSS de Tailwind de unos 5 segundos, lo que pudo contribuir al primer render demorado. No se modificó la autenticación ni se ejecutó el build.

- **2026-10-27 — Informe de cambios en HP, PDF, conexiones, correo, colección y avisos.** En `app/routes/_index.tsx`, el HP del HUD inferior ahora reutiliza el mismo valor que PERSONAL; las notificaciones de eventos abren ON AIR en Eventos, recompensas abren la colección y correo/conexiones abren su apartado. En `app/components/cartas/print-bcard-catalog.ts`, se reemplazó la ventana de impresión por generación PDF en el navegador con `jspdf`, QR por carta, imágenes locales cargadas y auto-descarga; comprobadas 223 cartas y cero imágenes faltantes. La descarga en navegador real queda por confirmar. En `app/components/cartas/BCardColeccion.tsx`, se agregó la carpeta virtual «Mis cartas» con filtros de nombre, clase y serie dentro de colección y carpetas. A petición del usuario, no se duplica clase como Categoría; el filtro de categoría queda pendiente de recibir el formato de cartas legible. En `actions/get-transer-connections.ts` y `PanelConectar.tsx`, «Todos» lista los perfiles registrados sin búsqueda. `manage-transer-connection` añade aceptación atómica como amistad/hermano con control de seis vínculos por ambas cuentas; Conectar muestra solicitudes entrantes y ofrece aceptar como amistad, aceptar y añadir a Banda-Hermano, o rechazar. En Correo se usa sobre abierto para mensajes leídos, selector de destinatarios con filtros Todos/Amigos/Banda-Hermano/Siguiendo, autoenvío de mensajes sin adjuntos, burbuja para adjuntar imagen y se quitó el sonido al enviar; el sonido de mail permanece asociado a notificaciones recibidas. En `NotificationCenter.tsx` se agregó selección individual/masiva para leer o eliminar, refetch de conteos/lista y scroll flex; `actions/manage-transer-notifications.ts` aplica operaciones solo al propietario autenticado. **Adjunto/formato:** el ZIP compartido no se pudo inspeccionar por el formato de adjunto. Adaptar el PDF al nuevo diseño y el escáner QR/CARDEX quedan pendientes de recibir el formato como PDF o imágenes. No se hicieron cambios a la interpretación de los QR actuales.
  - **Verificaciones:** `pnpm typecheck` pasó; `pnpm test` pasó (9 archivos, 25 pruebas); `oxfmt --check` pasó en 11 archivos; recursos HTTP y rutas activas respondieron 200; el dev server permanece activo y se navegó la preview a `/`. No hubo recorrido autenticado de los botones nuevos ni descarga real del PDF en navegador. No se ejecutó `pnpm build`.
