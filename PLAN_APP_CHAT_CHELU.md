# App móvil Chat Chelu — Definición del proyecto

> Documento vivo: se actualiza a medida que se toman decisiones.
> Última actualización: 2026-10-09

## Objetivo

Crear una app móvil para usar el chatbot **Chat Chelu** (hoy solo en la web, `/chat-chelu`), con el mismo stack que la app de conductores (`C:/AppGovoy`). Se usa el backend actual (`Back-Govoy/agentes/chat_CEX/`) con los cambios mínimos necesarios.

---

## 1. Punto de partida

### Backend (FastAPI) — `Back-Govoy/agentes/chat_CEX/endpoint_chat.py`

| Método | Ruta | Uso en móvil |
|---|---|---|
| POST | `/chat-cex/stream` | Sí, conversación en streaming (eventos con campo `tipo`) |
| GET | `/chat-cex/get_chats` | Sí, lista de conversaciones |
| GET | `/chat-cex/get_chat` | Sí, abrir una conversación |
| DELETE | `/chat-cex/delete_chat` | Sí, borrado lógico |
| POST | `/chat-cex/duplicate_chat` | Sí, duplicar conversación (entera o hasta una respuesta) |
| PUT | `/chat-cex/feedback` | Sí (fase 3) |
| POST | `/chat-cex/transcribir` | Sí, notas de voz (fase 3) |
| GET | `/chat-cex/archivo/{file_id}` | Sí, descarga de documentos generados |
| POST | `/chat-cex/correo/enviar` | Fase 4 |
| GET | `/chat-cex/optimizacion/{id}`, POST `/resumen-optimizacion`, GET `/formulario-sectores` | Fase 4: los que necesite el formulario de sectores (ver abajo); abrir la optimización, no |
| GET | `/chat-cex/syncronize_data` | No (migración puntual de la web) |

Eventos del stream: `session, delta, tool, progreso, sugerencias, done, error, documento, grafica, mapa, sql, sectores, comparativa, correo_borrador, formulario_sectores, acciones_editor, carga_simulacion, orden_optimizacion`.

- **Fases 2–3:** `session`, `delta`, `tool`/`progreso`, `sugerencias`, `done`, `error`, `documento`, `grafica`, `mapa`.
- **Fase 4:** `correo_borrador`, `sectores`, `comparativa`, `formulario_sectores`.
- **No aplican:** los eventos del panel de simulación (`acciones_editor`, `carga_simulacion`, `orden_optimizacion`) y `contexto_pantalla`.
- **Optimización de sectores desde el chat (fase 4):** en la web, Chelu puede abrir un formulario de optimización de sectores en la conversación (mapa, zona, rango, demanda, flota, vehículos, capacidad…), lanzarla con "Optimizar" y luego mostrar el resultado con su valoración y una tarjeta con "Abrir en SmartZone". En la app **sí** se quiere el formulario (revisarlo, ajustarlo y lanzar la optimización) y ver el resultado en el chat, pero **no** abrir la optimización en sí: sin "Abrir en SmartZone" ni el editor, que se quedan en la web. Ya revisado cómo lo hace la web y qué endpoints usa: ver "Progreso de la fase 4".
- **Regla general: en la app no se "abre" nada en otras herramientas de GOVOY.** En el chat web solo hay dos sitios, y los dos acaban en `abrirEnSmartZone` (borrador en el editor):
  - `SectoresCard`: "Abrir en SmartZone" en el resultado de una optimización.
  - `ComparativaTable`: "Abrir" en cada escenario de una comparativa.
  
  En la app esas tarjetas se muestran sin el botón, y `GET /chat-cex/optimizacion/{id}` (que solo sirve para abrir) no se usa. Lo demás no abre nada: descargar documentos, enviar correos y lanzar el formulario sí se pueden hacer.
- **Ojo con el texto de Chelu:** a veces propone "abre esta optimización y guárdala". Valorar con el back que la app indique que es el móvil (p. ej. un campo en `ChatCexRequest`) para que Chelu no lo proponga.

### App de referencia — `C:/AppGovoy`

- Expo SDK 53 (bare, con carpeta `android/`), React Native 0.79, React 19, TypeScript estricto, alias `@/*`.
- React Navigation 7 (menú lateral) y estado con React Context.
- NativeWind v2 + react-native-paper.
- `fetch` nativo, tokens en `expo-secure-store` y resto de datos en AsyncStorage.
- Build con EAS (perfiles development / preview / production).

**Se copia casi sin cambios:**

| Fichero | Qué aporta |
|---|---|
| `src/auth/authManager.tsx` | `authFetch`: renovación de token compartida entre peticiones, reintento si hay 401 y cierre de sesión si hay 403 |
| `src/auth/tokenStorage.ts` | Guardado de tokens en SecureStore con escrituras en cola |
| `src/auth/RootNavigation.tsx` | Navegación desde fuera de los componentes |
| `src/utils/useConnectivity.tsx` | Detección de conexión con NetInfo |
| `src/utils/utilsFunctions.tsx` | Configuración de avisos (toasts) |
| `src/utils/utilsNotifications.tsx` | Registro de notificaciones push (fase 4) |

**No se copia:**
- Las URLs escritas a mano en `Constants.tsx`: aquí se usan variables `EXPO_PUBLIC_*`.
- El `UserContext` monolítico.
- Las contraseñas guardadas en SecureStore.
- `NSAllowsArbitraryLoads` y las claves de API dentro de `app.json`.

---

## 2. Decisiones tomadas

### D1. Login propio para la app, con un token como el de la web

- **Endpoint nuevo:** `POST /login-chat-movil` con cuerpo `{ username, password }`.
- **Contenido del token (JWT):** el mismo que el de `/login2-secure` (ver `models/db_inicio_sesion.py:151`): `sub`, `username`, `id_depot`, `rol_especial`, `rol`, `UsuarioID` (id de empresa), `id_depots`, `is_master`, `nombre_empresa`, `exp`. Así `validar_token` y `_chat_cex_identity` funcionan sin cambios.
- **Respuesta:** el mismo `body` que la web (`accessToken`, `CorreoElectronico`, `rol`, `rol_especial`, `UsuarioID`, `username`, `is_master`, `nombre_empresa`, `id_depot`, `id_depots`, `zoom`) **más `refreshToken` en el cuerpo**, porque en móvil no hay cookie httpOnly.
- **Renovación:** `POST /refresh-token-chat-movil` con el token de renovación como Bearer. Devuelve un `accessToken` nuevo y un `refreshToken` nuevo (se sustituye cada vez, como en la web). Es compatible con el `authManager` de AppGovoy.
- **Rechazos:**
  - Usuarios con rol `conductor`, igual que la web.
  - Usuarios cuya empresa no tiene Chat Chelu activado, para que no pueda entrar quien luego recibiría 403 en todo.
- **Duración (decidido): la misma que la web.**
  - Token de acceso: `ACCESS_TOKEN_EXPIRE_MINUTES`. Token de renovación: 10 × ese valor, sustituido en cada renovación.
  - En la práctica, la sesión caduca tras ~10 h sin abrir la app y al día siguiente se vuelve a pedir login.
  - Para hacerlo más cómodo, se puede recordar el **nombre de usuario** (nunca la contraseña).
- **Suplantación desde la app (decidido: sí):**
  - **Endpoint nuevo `POST /impersonate-chat-movil`**, copiando `/impersonate` de la web (`routes/login.py:244`). **`/impersonate-movil` no sirve:** genera tokens de la app de conductores y solo busca conductores.
    - Entrada: `{ target_username, iniciar_sin_maestro? }`, con el token del staff. Comprueba `is_govoy_staff` y responde 403 si no lo es.
    - Salida: el mismo `body` que `/login-chat-movil` (D1) del usuario suplantado, más `is_impersonation`, `impersonated_by` y `refreshToken`.
    - Token: claims `is_impersonation: true`, `impersonated_by` y `is_master` (false si `iniciar_sin_maestro`). A `nombre_empresa` se le añade " <GOVOY>". **Duración máxima 6 h, como en la web** (la renovación no la alarga).
  - **El staff tiene que poder entrar en la app aunque su empresa no tenga Chat Chelu.** `/login-chat-movil` le deja pasar si `is_govoy_staff`, y la app le lleva a la pantalla de suplantación, como hace AppGovoy con `ImpersonateDriverScreen`. Si no, el filtro de D9 le cerraría la puerta.
  - **Salir de la suplantación:** la app guarda los tokens del staff aparte en SecureStore y los recupera al pulsar "Salir de suplantación", igual que la web apila la cookie. Si la suplantación caduca, se vuelve a la sesión del staff si sigue viva y, si no, al login.
  - Durante la suplantación con master, los chats se guardan con `is_devs = true` (`endpoint_chat.py:1479`), así que el cliente no los ve. Es el comportamiento actual de la web.
  - Las entradas `-master` de D3 se cumplen en estas sesiones.
  - **Cómo se elige a quién suplantar (decidido):** escribiendo el nombre de usuario, como en la web. No hace falta endpoint de búsqueda.
- **Cierre de sesión (decidido): solo se borra en el móvil**, como en AppGovoy (`src/context/UserContext.tsx:177`) y en la web (`/logout` solo borra cookies, `routes/login.py:695`). No hay llamada al back ni lista de tokens revocados.
  - Se borran: los tokens de SecureStore (también los del staff guardados por la suplantación), los datos del usuario en AsyncStorage y la caché del chat. Se vuelve al login.
  - Consecuencia aceptada: un token copiado sigue sirviendo hasta que caduca (como en la web y en AppGovoy).

### D2. Arreglar la seguridad del chat en el backend

Los permisos se comprueban en el backend, no en la app. Los cambios también protegen la web.

1. **`get_chats`** (`endpoint_chat.py:2669`): **en revisión**. Hoy se lista por empresa a propósito (commits `d8484ef` y `87e1767`). Ver la nota de la fase 0.
2. **`get_chat`** (`endpoint_chat.py:2740`): **en revisión**, por el mismo motivo.
3. **`incluir_sql`:** solo se tiene en cuenta si el usuario es master (o tiene un permiso explícito); a los demás se les ignora.
4. **`modelo`:** solo se aceptan nombres de `MODELOS_DISPONIBLES`; el resto se rechaza o pasa al modelo por defecto. Para más adelante: que el back solo acepte `modelo` de sesiones master y fije el modelo por defecto con `CEX_MODELO` (ver D10).
5. **Claves de API de empresa (`api_…`):** no pueden usar `/chat-cex/*` (hoy crean chats sin usuario).
6. **Limpieza:** quitar el `print(chat)` (`endpoint_chat.py:2746`) y el print del token de renovación (`routes/login.py:386`).

### D3. Permisos: por empresa y luego por rol

- **Por empresa:** los IDs de las listas (`CHAT_CHELU`, `HAS_AUDIO_CHAT_CHELU`, …) son IDs de **empresa**. Si el usuario pertenece a esa empresa, tiene esas funciones.
- **Por rol:** los detalles más específicos se deciden según el `rol` y el `rol_especial` del usuario, por ejemplo quién ve el chat (`administrador`, `jefeDeOperaciones`) o el modo master.
- **Las funciones van en la app:** constantes en el código de la app, como `Front-Govoy/src/routes/ControlOpcionesUsuarios.tsx` en la web. Tendrá su propio `ControlOpcionesUsuarios.ts` con listas de IDs (`CHAT_CHELU`, `HAS_AUDIO_CHAT_CHELU`, `HAS_FEEDBACK_CHAT_CHELU`, `BLOCK_CHAT_CHELU`…) y una versión de `validatorUserHasOption`.
- **Back:** sin tabla ni endpoint de configuración. Como hasta ahora, como mucho tendrá funciones o condiciones concretas por ID, como los perfiles de `perfiles/__init__.py`. Los arreglos de seguridad de D2 sí se quedan en el back.
- ~~`GET /chat-cex/config`~~ → **Descartado.**
- **Sufijos:** solo se traslada `-master`; `-qa` y `-prod` no. Ejemplo: `HAS_AUDIO_CHAT_CHELU = ["92-master"]` → solo lo ve el staff de Govoy que suplanta a un usuario de la empresa 92.
  - **Regla:** una entrada `-master` se cumple si el token tiene `is_impersonation = true` **y** `is_master = true`. La app lo lee de la respuesta del login o suplantación, o decodificando el JWT, que ya trae los dos campos.
  - Hoy `is_master = true` se da en dos casos (`Back-Govoy/routes/login.py`):
    - Login del propio staff de Govoy (l.357).
    - Suplantación, salvo que se inicie con `iniciar_sin_maestro` (l.283).
  - Exigir también `is_impersonation` deja fuera el primer caso, como se ha decidido.
  - **Consecuencia:** para que `-master` sirva en la app, **la app debe permitir suplantar usuarios** (punto pendiente de D1). Si no, esas entradas nunca se cumplirán en el móvil.
- **Consecuencias de tener los permisos en la app:**
  - **Cambiar permisos exige publicar.** En la web, cambiar una lista es desplegar; en el móvil haría falta subir una versión nueva a la tienda o enviar el APK otra vez. **Solución: EAS Update (`expo-updates`)**, que actualiza el código JavaScript de la app sin pasar por la tienda. Apple y Google lo permiten siempre que no cambie la funcionalidad principal de la app. Lo recomendable es incluirlo desde la fase 1.
  - **No es una barrera de seguridad.** Las listas de la app solo ocultan pantallas o botones; lo que deba estar realmente prohibido lo tiene que impedir el back (por eso se mantienen D2 y el 403 sin perfil).
  - **Coherencia manual:** las listas de la app (y de la web) se mantienen a mano alineadas con los perfiles del back.

### D9. Usuarios: los mismos que en la web, con las mismas credenciales

- **Credenciales:** `/login-chat-movil` valida contra la misma tabla de usuarios y con la misma comprobación de contraseña (`verify_password`) que `/login2-secure`. No hay usuarios ni contraseñas propios de la app.
- **Quién entra:** la misma regla que muestra el chat en el menú de la web (`Front-Govoy/src/layout/PortalLayout.tsx:203`):
  - La empresa está en `CHAT_CHELU`, **o** está en `CHAT_CHELU_MASTER` y la sesión es master (en la app, una suplantación, ver D3).
  - **y** el rol es `administrador` o `jefeDeOperaciones`.
- **Dónde se comprueba:**
  - **App:** con las listas de `ControlOpcionesUsuarios.ts` (D3), justo después del login. Si no tiene acceso, muestra "Tu usuario no tiene acceso a Chat Chelu" y no guarda la sesión.
  - **Back (`/login-chat-movil`):** rechaza conductores (como la web) y empresas sin perfil de chat (`tiene_perfil(cliente_id)`, una condición por ID de las que ya existen). Así no se emiten tokens que luego darían 403 en todo. **Excepción: el staff de Govoy (`is_govoy_staff`) siempre puede entrar**, para poder suplantar (ver D1).
- **Aplazado:** hoy el back de `/chat-cex/*` **no comprueba el rol**, solo la empresa. Cualquier usuario no conductor de una empresa con perfil puede usar el chat llamando a la API con su token de la web. Se decide no añadir la comprobación de rol de momento. Se retomará más adelante y no bloquea la app.

### D10. Modelos: igual que la web

- **Cómo funciona hoy:**
  - **Back** (`agent.py:43-84`, `endpoint_chat.py:1492`): usa el `modelo` que llega en cada petición; si no llega, `CEX_MODELO` y, si no existe, `gpt-4o-mini`.
  - **Web** (`useChatChelu.ts:129`, `:905`): **siempre manda el modelo**. Lo guarda en `localStorage` y por defecto es `deepseek-v4-flash`.
  - **Selector:** solo para masters (`ConfigModal.tsx:32`). Cambiar de modelo empieza una conversación nueva, y al abrir una conversación antigua se usa el modelo con el que se creó.
  - La etiqueta `isDefault: gpt-4o-mini` de `constants.ts` está desactualizada.
- **En la app (decidido):** se replica la web.
  - Modelo por defecto `deepseek-v4-flash`, guardado en AsyncStorage y enviado siempre en `modelo`.
  - **Selector solo en sesiones master** (suplantación con `is_master`), con la lista de `MODELOS_DISPONIBLES` copiada en una constante de la app.
  - Mismo comportamiento al cambiar de modelo y al abrir conversaciones antiguas.
- **Para más adelante:** que el back solo acepte `modelo` de masters y el por defecto salga de `CEX_MODELO=deepseek-v4-flash`. La web seguiría funcionando igual.
- **A revisar (privacidad):** DeepSeek procesa los datos en China. Confirmar que es aceptable legalmente y en los contratos con los clientes. Relacionado con el punto 13.

### D4. ID de empresa = ID de cliente (comprobado)

Los dos salen del mismo campo, `users.empresa_id`:

- **JWT:** `UsuarioID = user.empresa_id` (`Back-Govoy/models/db_inicio_sesion.py:172`).
- **Back:** `decode_token` saca `ClienteID = user.empresa_id` de la base de datos en cada petición (`Back-Govoy/auth.py:101`). Ese valor elige el perfil del chat (`perfiles/__init__.py`, `REGISTRO[cliente_id]`) y el esquema `cliente_{id}`.
- **Front:** `userID = body.UsuarioID` del login (`Front-Govoy/src/auth/AuthProvider.tsx:155`). Es el valor que comprueba `validatorUserHasOption`.

Consecuencias:

- Las listas de la app pueden usar el mismo `UsuarioID` que la web, sin tablas de equivalencia.
- El front lee el valor del token, fijado al hacer login, y el back lo lee de la base de datos en cada petición. Solo difieren si a un usuario le cambian la empresa con la sesión abierta.
- Hay que alinear las listas de la web y del back (y las de la app desde el principio):
  - **Empresa 1:** tiene el chat en el menú de la web, pero no tiene perfil en el back y recibe 403 (salvo en modo depuración).
  - **Empresa 100:** tiene perfil en el back, pero no tiene el chat en el menú de la web.

### D5. Mismo stack que AppGovoy, en versiones actuales

- Mismas librerías que AppGovoy: Expo, React Native, TypeScript estricto, React Navigation, NativeWind, `expo-secure-store`, AsyncStorage, NetInfo y EAS.
- Se crea con el **último SDK estable de Expo** y las versiones de librerías compatibles con él, no con SDK 53 / RN 0.79. **Decidido: SDK 57** (comparado con 55 y 56: el 55 ya no recibe parches y el 56 solo evita el fallo de LogBox #1834, que es solo en desarrollo).
- **Desarrollo con build de desarrollo** (`npx expo run:android`, alias `runappdevice`) + `expo-dev-client`, no con Expo Go. La carpeta `android/` se genera y no se sube al repo.
  - **Diferencia con AppGovoy (que no tiene `expo-dev-client`):** en un móvil físico, la app descarga el JavaScript de Metro **por la Wi-Fi** (`http://<IP del PC>:8081`), no por el cable. Hace falta que el móvil y el PC estén en la misma red, que la IP sea la del adaptador Wi-Fi/Ethernet (en Windows, Expo puede coger la de un adaptador virtual; se fuerza con `REACT_NATIVE_PACKAGER_HOSTNAME`) y que el firewall deje pasar a Node. Alternativa por cable: `adb reverse tcp:8081 tcp:8081` y conectarse a `localhost:8081`. `connectback` solo cubre el 8000 (el back).
  - No afecta a los APK/AAB de release: llevan el JavaScript dentro y `expo-dev-client` no actúa.
- **Builds de release (APK/AAB):** los comandos de AppGovoy (`generateapk` / `generateaab` = `gradlew assembleRelease` / `bundleRelease`) siguen funcionando, con dos diferencias:
  - Antes de compilar hay que ejecutar `npx expo prebuild`, porque `gradlew` no lee `app.json` y `android/` tiene que estar al día.
  - **Firma:** en AppGovoy la firma de release se editó a mano en `android/app/build.gradle` + `android/gradle.properties`. Aquí esos cambios se perderían al regenerar `android/` y la plantilla firma el release con la clave de debug.
  - Opciones (se decide antes de la primera distribución):
    - **Plugin de configuración local** (`plugins/withReleaseSigning.js`) que añade la firma de release a `build.gradle` y lee el keystore y las contraseñas de `~/.gradle/gradle.properties` (fuera del repo). Se mantienen los comandos de siempre.
    - **EAS Build**, que guarda el keystore y genera APK o AAB por perfil (`eas build -p android --profile preview|production`, en la nube o con `--local`).
  - Pendiente: keystore nuevo para `com.govoy.chelu` o reutilizar el de AppGovoy.
  - Aviso: en AppGovoy, `android/gradle.properties` (con las contraseñas del keystore) está subido a git. Valorar sacarlo.
- NativeWind en la versión estable actual (v4 o posterior) en lugar de v2. Las clases se escriben igual; cambia la configuración inicial (CSS + plugin de Metro).
- **Detalles de instalación con el SDK 57 (comprobados al montar el proyecto):**
  - `babel-preset-expo` **hay que declararlo** en `package.json`: npm no lo deja en la raíz de `node_modules` (queda dentro de `expo/`) y `babel.config.js` no lo encontraría. En AppGovoy funciona sin declararlo porque con el SDK 53 sí quedaba en la raíz.
  - `expo-system-ui` es necesario para que Android aplique `userInterfaceStyle` (el `prebuild` avisa si falta).
  - TypeScript 6 comprueba los imports sin valor (`import './global.css'`); `css.d.ts` declara los `.css` para que no dé error.
  - Reanimated 4 separa los worklets en `react-native-worklets`. `babel-preset-expo` ya añade su plugin, no se pone en `babel.config.js`.
  - `tailwindcss` va en `dependencies`, como en AppGovoy.
  - Iconos con **`lucide-react-native`** (la misma librería que la web, `lucide-react`), que necesita `react-native-svg`. `react-native-svg` también pinta el robot de Chelu.
  - Alias `@/*` → `src/*` en `tsconfig.json` (`paths`, sin `baseUrl`, que TypeScript 6 da por obsoleto). Metro lo entiende sin configuración extra.
- El código copiado de AppGovoy (`authManager`, `tokenStorage`, `useConnectivity`) no depende de la versión.

**Versiones y compatibilidad (revisado el 2026-10-02):** SDK 57 (`expo` 57.0.26) = React Native 0.86.3, React 19.2.3, Reanimated 4.5.1. Datos de los `peerDependencies` en npm y de los issues de GitHub.

| Librería | Versión | Estado | Notas |
|---|---|---|---|
| Módulos de Expo (`expo-secure-store`, `expo-audio`, `expo-sharing`, `expo-updates`, `expo/fetch`…) | ~57.x | OK | Van con el SDK |
| `react-native-webview`, `@react-native-community/netinfo`, `@react-native-async-storage/async-storage`, `react-native-safe-area-context`, `react-native-screens`, `react-native-gesture-handler`, `react-native-svg` | Las que fija el SDK | OK | Instalar con `npx expo install` |
| `react-native-keyboard-controller` | 1.21.9 (la que fija el SDK) | OK | |
| `@sentry/react-native` | ~7.11 (la que fija el SDK) | OK | |
| `@react-navigation/*` v7 | native 7.5 / native-stack 7.20 / drawer 7.14 | OK | Requieren screens ≥4 y safe-area ≥4 |
| **NativeWind** | 4.2.7 + `react-native-css-interop` 0.2.7 + `tailwindcss` 3.4.x | **OK con un problema menor** | El PR #1864 (adaptación al SDK 57, RN 0.86 y React 19.2) se fusionó el 14/09 y 4.2.7 salió el 15/09. **Problema abierto #1834:** en RN 0.86 la ventana de errores de desarrollo (LogBox) se ve rota con NativeWind; la app funciona y producción no se ve afectada. Arreglo: un parche con `patch-package`, como en AppGovoy. También hay un problema conocido con `useAnimatedRef` de Reanimated 4 (#1560), que no usaremos al principio. |
| `@maplibre/maplibre-react-native` (fase 3, elegida) | 11.5.0 | OK, instalada | Pide expo ≥54, RN ≥0.80 y React ≥19.1. Necesita build de desarrollo. Trae plugin de Expo (sin opciones: OpenGL y motor de ubicación propio). `@types/geojson` en `devDependencies` |
| **`react-native-markdown-display`** | 7.0.2 (dic. 2023) | **DESCARTADA** | Sin mantenimiento desde 2023. Alternativas que se valoraron: `react-native-marked`, `react-native-enriched-markdown` (1.1.0, de Software Mansion, nativa) y el fork `@ronradtke/react-native-markdown-display` (9.0.3) |
| **`react-native-marked`** | 8.3.2 | **OK, elegida (fase 2)** | JS puro, con tablas. Depende de `marked` 18 y `react-native-reanimated-table`; pide `react-native-svg` y RN ≥0.76 |
| `jwt-decode` | 4.0.0 | No hace falta por ahora | La respuesta del login ya trae todos los datos de la sesión |
| `lucide-react-native` | 1.52 | OK | Admite React 19 y `react-native-svg` 12–15 (el SDK fija la 15.15) |
| `@shopify/flash-list` | 2.0.2 (la que fija el SDK) | OK, instalada | Licencia MIT. Solo JS (sin código nativo, no hace falta recompilar); la v2 necesita la nueva arquitectura, la única en RN 0.86. Se usa en la lista de conversaciones |
| **`react-native-enriched-html`** (fase 4, elegida) | 1.1.1 | OK, **sin instalar todavía** (bloque 3) | Software Mansion, MIT. Editor de texto enriquecido nativo, solo nueva arquitectura; el paquete se desarrolla contra RN 0.86.0. Antes se llamaba `react-native-enriched` (ese ya no se actualiza). Necesita recompilar, sin plugin de Expo. Ver "Progreso de la fase 4" para licencias de lo que lleva dentro |

### D6. Mismo backend que el resto de repositorios

- La app usa el mismo backend (`Back-Govoy`) y los mismos entornos que la web y AppGovoy. Se crean o adaptan endpoints según haga falta.
- **Las URL van en `src/auth/Constants.ts`, como en AppGovoy** (decidido el 2026-10-05, en lugar de `EXPO_PUBLIC_API_URL`): `API_URL` (la que usa la app, por defecto `https://api.govoy.es/`), `API_URL_DEV` (`https://developer.govoy.es/`) y `API_URL_LOCAL` (`http://127.0.0.1:8000/`, con `connectback`). Para cambiar de back se edita la línea de `API_URL`. **Ahora apunta al back local** mientras los endpoints de login móvil no estén subidos.

### D7. Diseño parecido al Chat Chelu web, con modo oscuro desde el inicio

- **Aspecto:** parecido al chat web (`Front-Govoy/src/routes/components/ChatChelu/`, `chatChelu.css`).
- **Paleta clara:** sale del chat web. La web mezcla colores propios del chat (`#128bec`, `#e6eaef`, `#f4f6f9`…) con grises de serie de Tailwind (`gray-200`, `gray-500`…). Criterio: el color propio del chat donde existe y, si no, el de Tailwind que más se usa en la web.

  | Color | Claro | Origen en la web |
  |---|---|---|
  | `fondo` | `#f4f6f9` | fondo del chat (`ChatCheluBody`) |
  | `superficie` | `#ffffff` | `bg-white` (lateral, tarjetas) |
  | `superficie-alt` | `#f7f9fb` | filas pares de tablas (≈ `gray-50`) |
  | `borde` | `#e6eaef` | tarjetas de herramientas y tablas (≈ `gray-200`) |
  | `borde-fuerte` | `#d1d5db` | `gray-300` |
  | `texto` | `#1c242b` | texto del markdown |
  | `texto-secundario` | `#6b7280` | `gray-500` |
  | `texto-tenue` | `#9ca3af` | `gray-400` |
  | `primario` | `#128bec` | burbuja del usuario |
  | `primario-presionado` | `#0c6fbe` | texto de las sugerencias (en la web no hay "pulsado"; en móvil, más oscuro al pulsar) |
  | `primario-suave` | `#e7f3fd` | fondo de las citas (≈ `sky-50`) |
  | `sobre-primario` | `#ffffff` | texto sobre el primario |
  | `peligro` / `peligro-suave` | `#c0392b` / `#fdecec` | mensaje de error |
  | `exito` / `exito-suave` | `#059669` / `#d1fae5` | `emerald-600` / `emerald-100` |
  | `aviso` / `aviso-suave` | `#d97706` / `#fffbeb` | `amber-600` / `amber-50` |

- **Paleta oscura:** la web **no tiene modo oscuro**, así que es propia de la app (en `palette.ts`). Se revisará al verla en las pantallas reales.
- **Cómo se implementa:**
  - Variables de color (`--color-fondo`…) con un valor para claro y otro para oscuro, mapeadas en Tailwind a clases con nombre según su uso (`bg-fondo`, `bg-superficie`, `text-texto`, `border-borde`, `bg-primario`…). Los componentes usan solo esas clases, sin escribir `dark:` en cada uno. Admiten transparencia (`bg-primario/50`).
  - La paleta está en `src/theme/palette.ts` (claro y oscuro, en hexadecimal). `ThemeProvider` la convierte en variables con `vars()`, y `useColores()` la da en hexadecimal para lo que no admite clases: navegación, barra de estado, iconos, gráficas y mapas. Los nombres se repiten en `tailwind.config.js` y tienen que coincidir.
  - **Por defecto la app arranca en claro**, aunque el sistema esté en oscuro. El tema elegido vive en el estado de `ThemeProvider` (`useTema()`), no en NativeWind: NativeWind sigue a `Appearance`, que Android devuelve al modo del sistema al volver a primer plano. Se reaplica a `Appearance` al volver a la app para los componentes nativos, y la barra de estado se pone según el tema. **La elección se guarda en AsyncStorage** (`preferencia_tema`) y se mantiene al cerrar la app. Pendiente: pantalla de ajustes y, si se quiere, la opción "igual que el sistema". Más adelante, opción en ajustes para elegir claro u oscuro (guardado en AsyncStorage). `userInterfaceStyle: "automatic"` en `app.json`, necesario para poder cambiarlo desde la app.
  - **Norma:** no se escriben colores a mano en los componentes.
- **Requieren atención especial:**
  - Los estilos del markdown.
  - Las gráficas (colores de ejes, rejilla y textos con `useColores()`; ver la fase 3).
  - Los mapas: **quedan fuera del modo oscuro**, solo el marco sigue el tema (ver D8).
  - La pantalla de arranque oscura.

### D8. Librería de mapas (decidido: MapLibre)

En la web, el mapa del chat usa OpenStreetMap estándar (`ChatMapCard.tsx:42`) y otras pantallas usan Carto `light_all` (`DispatchManagement.tsx:1067`).

**Decisión (2026-10-07): opción A, MapLibre** (`@maplibre/maplibre-react-native` 11.5.0), con este planteamiento:
- **En el chat no hay mapas vivos.** La tarjeta del mapa muestra título, número de puntos o zonas, la leyenda y (al final del plan) una vista previa en imagen. Así el coste no depende de cuántos mapas tenga la conversación y no hay conflictos entre los gestos del mapa y el desplazamiento del chat.
- **Al pulsar la tarjeta se abre el mapa a pantalla completa**, interactivo (zoom y desplazamiento, sin giro ni inclinación). Como mucho hay un mapa vivo a la vez.
- **Vista previa por captura:** se monta un mapa oculto con las mismas capas e iconos que la pantalla completa, se espera a `onDidFinishRenderingMapFully`, se captura con `createStaticMapImage()` y se desmonta. Así es idéntica a la pantalla completa (el generador sin vista, `StaticMapImageManager`, no admite los iconos registrados con `Images`). Una captura a la vez, en cola, y guardada en caché; de paso deja en la caché de MapLibre las teselas del encuadre inicial.
- **Por qué no Leaflet en WebView:** la memoria por mapa vivo es del mismo orden, pero con un solo mapa vivo eso pesa poco. A favor de MapLibre: pinta en nativo (gestos más fluidos), permite capturar la vista previa sin montar un WebView y esperar a que "termine", y `ChatMapCard` de la web no se reutilizaría tal cual (depende de Pixi, glify y la caché de imágenes del navegador).

| Opción | Pros | Contras |
|---|---|---|
| **A. MapLibre** (`@maplibre/maplibre-react-native`) con teselas abiertas | Igual en Android e iOS. No depende de Google ni de Apple y no necesita clave. Dibuja bien los polígonos GeoJSON. Modo oscuro cambiando la fuente de teselas | Librería nueva para el equipo. Necesita build de desarrollo (no Expo Go) |
| B. Leaflet en un WebView | Reutiliza `ChatMapCard` de la web, con el mismo aspecto | Rendimiento y gestos peores. Varios WebView en una conversación larga pesan |
| C. `react-native-maps` (Google/Apple) | Ya lo conoce el equipo | En Android necesita clave y **estilo JSON propio para el modo oscuro** (Apple Maps se adapta solo). Se ve distinto en cada plataforma |

- **Teselas (decidido):** **las mismas que el chat web**, OpenStreetMap estándar, pero sin subdominios: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (OSM ya no recomienda `{s}.`; la web aún los usa en `ChatMapCard.tsx` y `MapLayers.tsx`).
  - El volumen previsto (mapas puntuales en el chat, pocos usuarios) entra en el uso ligero que permite OSM.
  - **Condiciones (política de teselas y guía de atribución de OSM):**
    - User-Agent propio de la app: `CheluGovoy (com.govoy.chelu)`, sin contacto (comprobado en las peticiones: sustituye al de la librería).
    - Atribución "© OpenStreetMap contributors" visible, enlazada a openstreetmap.org/copyright. El botón (i) de MapLibre no basta porque la esconde.
    - Usar la caché (MapLibre revalida con `If-None-Match`) y sin descargas masivas ni paquetes sin conexión (`OfflineManager` no se usa).
    - Sin garantías: pueden bloquear sin avisar, por eso la URL se puede cambiar en una línea.
  - **Licencias del software:** MapLibre RN (MIT), MapLibre Native (BSD-2-Clause), turf (MIT), style-spec (ISC), OkHttp (Apache 2.0). Ninguna pide aparecer en el mapa (el logo de MapLibre se quita); van en la pantalla de licencias de terceros, pendiente antes de publicar. Falta revisar la de `leaflet-color-markers`, de donde vienen los pines que lleva la app.
  - **Modo oscuro (decidido): el mapa queda fuera.** Las teselas se ven siempre claras, como en la web, y los colores de polígonos se eligen para fondo claro.
    - El marco del mapa sí sigue el tema: tarjeta, cabecera, leyenda, tooltips, botones y pantalla completa.
    - Opcional más adelante: atenuar el mapa al ~85–90 % de brillo en modo oscuro para que no deslumbre (CSS en B, `raster-brightness-max` en A).
    - (Descartado: oscurecer OSM con filtros.)
  - **C queda descartada** (las teselas abiertas se pintan por encima del mapa de Google o Apple y siguen necesitando el SDK de Google).
  - **La URL de teselas va en una sola constante, `TILE_URL` en `src/auth/Constants.ts`** (como las del back, D6), para cambiar de proveedor en una línea si hace falta; más adelante podría venir del back. En la web ahora está repetida en `ChatMapCard.tsx`, `MapLayers.tsx` y `DispatchManagement.tsx`.
- **Condiciones de Google Maps (opción C):**
  - Mostrar mapas con el SDK nativo de Android e iOS es gratis y sin límite (comprobar en la página de precios vigente). Directions, Geocoding y Places se pagan por llamada, y el chat no las necesita.
  - Hace falta una cuenta de facturación aunque no se pague nada.
  - No se puede ocultar el logo ni los créditos de Google.
  - No se puede guardar contenido para usarlo sin conexión.
  - **Los datos sacados de APIs de Google (p. ej. geocodificación) no se pueden pintar sobre mapas que no sean de Google.** Esto afecta a las opciones A y B, y también a la web.
  - Navegación paso a paso solo con el SDK de navegación, que es de pago.
  - La clave debe restringirse al paquete de Android (con la huella del certificado) y al bundle de iOS.
  - Conclusión: si importa más no gastar ni preocuparse por licencias que parecerse a la web, C es una opción válida y el equipo ya la conoce.
- **Leaflet en WebView (opción B):**
  - Sin coste de licencia: Leaflet (BSD) y `react-native-webview` son gratuitos, y el WebView funciona en Expo Go.
  - Restricciones:
    - Las teselas tienen las mismas condiciones que en la web.
    - OSM exige que la petición indique su origen (Referer) y el HTML local no lo hace, así que hay que dar al WebView una URL base propia (`baseUrl`) o puede bloquearse.
    - El GeoJSON y los textos los genera el agente: tratarlos como texto, no como HTML, para evitar inyección de código. WebView sin acceso a archivos y sin cargar orígenes externos salvo las teselas.
  - Costes:
    - Comunicación por `postMessage` (tema, datos, toques); un GeoJSON grande se pasa entero como texto.
    - Cada WebView ocupa decenas de MB de memoria.
    - Conflictos entre mover el mapa y desplazar la conversación.
    - En Android depende de la versión del WebView del sistema.
    - Leaflet va empaquetado dentro de la app, no desde un CDN.
    - Patrón recomendado: vista previa fija en el mensaje y mapa interactivo a pantalla completa.
  - A favor:
    - Comparte el puente de comunicación, el tema y la seguridad con las gráficas de ApexCharts, que también van en WebView.
    - Modo oscuro barato con un filtro CSS `invert + hue-rotate` sobre OSM, o con Carto `dark_all`.
- **Licencias de teselas (también afecta a la web):** los servidores de `tile.openstreetmap.org` no permiten uso intensivo ni que una app dependa de ellos, y Carto exige licencia comercial. Valorar un proveedor con plan comercial (MapTiler, Stadia…) o servir las teselas vosotros mismos.

---

## 3. Notas técnicas para el diseño

- **Streaming:** el `fetch` estándar de React Native no permite leer la respuesta poco a poco; se usa `expo/fetch`, que sí lo permite. La lectura de eventos puede seguir la de la web (`Front-Govoy/src/routes/components/ChatChelu/useChatChelu.ts:880`), con el mismo procesado agrupado por fotograma y la cancelación con `AbortController`.
- **Markdown:** `react-native-marked` con el hook `useMarkdown` (decidido en la fase 2, ver su progreso), con las tablas dentro de un scroll horizontal.
- **Gráficas:** el back envía configuraciones de ApexCharts. Se leen en la app y se pintan en nativo con `react-native-gifted-charts`, sin WebView y sin cambios en el back (ver el progreso de la fase 3).
- **Mapas:** MapLibre pintando la geometría GeoJSON que manda el back (ver D8 y el progreso de la fase 3).
- **Voz:** grabación en m4a con `expo-audio` y envío a `/transcribir`, que ya acepta m4a y mp4.
- **Documentos (decidido):** `/archivo/{id}` devuelve un enlace temporal de S3 que ya lleva `Content-Disposition: attachment`. En Android se descarga con el `DownloadManager` del sistema (`react-native-blob-util`), a Descargas y sin salir de la app; en iOS con `Linking.openURL`, y Safari lo guarda en Archivos › Descargas. Detalle en el progreso de la fase 2.
- **Estilo del código:** la legibilidad va primero. Las promesas se escriben con `async`/`await` y `try`/`catch`/`finally`, no con cadenas `.then().catch()` (en un efecto, con una función async dentro). Las cadenas que quedan se cambian al tocar cada archivo; no hay diferencia de rendimiento. Al cambiarlas, lo que iba en paralelo sigue en paralelo (`await Promise.all(...)`, no `await` dentro de un bucle). Excepción: la cola de `tokenStorage.ts` (`cola.then(op, op)`), que encadena a propósito.

---

## 3b. Plataformas: hacer también la versión iOS desarrollando desde Android/Windows

**Conclusión:** es factible con Expo, porque las versiones de iOS se compilan en la nube (EAS Build) y no hace falta un Mac. El trabajo diario se hace en Android y en iOS se prueba de vez en cuando.

### Requisitos imprescindibles

| Requisito | Detalle |
|---|---|
| **Apple Developer Program (empresa)** | 99 USD/año, a nombre de Govoy. Pide **número D-U-N-S** de la empresa y la verificación puede tardar días o semanas: **conviene tramitarlo ya**. |
| **Al menos un iPhone físico** | El simulador de iOS solo funciona en Mac. Para instalar versiones de desarrollo hay que registrar el dispositivo (`eas device:create`). |
| **EAS Build / EAS Submit** | Compilación de iOS en la nube y subida a TestFlight y a la App Store. Expo gestiona certificados y perfiles. El plan gratuito tiene un número limitado de compilaciones de iOS al mes y las pone en cola; valorar un plan de pago si se compila mucho. |
| **Sin carpetas nativas en el repositorio** | A diferencia de AppGovoy (que tiene `android/` en el repo), aquí no se guardan `android/` ni `ios/`: Expo las genera en cada compilación. Toda la configuración nativa va en `app.config.ts` y plugins. Es lo que permite compilar iOS sin Mac. |
| **Solo librerías multiplataforma** | Expo SDK y librerías con soporte iOS. Nada de parches nativos solo para Android como el de `expo-task-manager`. |

### Depuración sin Mac

- **Código JavaScript:** igual que en Android. El iPhone con la versión de desarrollo se conecta al servidor de desarrollo (Metro) del PC Windows, por la misma red o por túnel, con recarga en caliente y React Native DevTools.
- **Fallos nativos:** no hay Xcode, así que hay que **reportar errores a un servicio (p. ej. Sentry)** desde el principio. Para algún caso puntual, un Mac prestado o alquilado en la nube.
- **Expo Go:** permite probar en iPhone sin compilar nada, siempre que solo se usen módulos incluidos en Expo Go y la versión de SDK que soporta. Sirve para empezar, pero la referencia es la versión de desarrollo.

### Diferencias de iOS que afectan a esta app

- **Teclado y caja de texto del chat** (lo más delicado): `KeyboardAvoidingView` se comporta distinto en cada plataforma; usar `react-native-keyboard-controller`. También hay que respetar los márgenes de seguridad de la pantalla (`react-native-safe-area-context`).
- **Permisos (Info.plist):** texto de `NSMicrophoneUsageDescription` para las notas de voz y, si los mapas muestran la ubicación del usuario, `NSLocationWhenInUseUsageDescription`.
- **Solo HTTPS:** sin `NSAllowsArbitraryLoads` (AppGovoy lo tiene activado). Para el back local en desarrollo, excepción solo en el perfil de desarrollo.
- **Cifrado:** declarar `ITSAppUsesNonExemptEncryption: false`, porque solo se usa HTTPS estándar.
- **Mapas:** `react-native-maps` usa **Google Maps en Android** (necesita clave; AppGovoy ya tiene una) y **Apple Maps en iOS** (gratis, sin clave). Apple Maps nativo no existe en Android. El código es el mismo en las dos plataformas y solo cambia el aspecto del mapa. Si se quiere el mismo aspecto en ambas: Google Maps también en iOS (clave y configuración extra) o MapLibre con mapas propios u OpenStreetMap.
- **SecureStore (Llavero de iOS):** los datos **sobreviven a desinstalar la app**. Hay que borrar los tokens en el primer arranque tras instalar.
- **Audio:** la grabación en m4a funciona igual; hay que configurar la sesión de audio de iOS.
- **Notificaciones push (fase 4):** clave de Apple Push Notification service (APNs) en la cuenta de Apple, gestionada por EAS.

### Distribución y revisión de Apple

- **En iOS no se puede pasar un archivo instalable al cliente.** En Android se le puede enviar el APK, pero un `.ipa` solo se instala en iPhones registrados (*Ad Hoc*, máximo 100 al año, inviable para clientes). La distribución alternativa de la UE no es viable para Govoy por sus requisitos de antigüedad y volumen. El programa *Enterprise* (299 USD/año) es solo para empleados propios.
- **Quién la puede instalar:** es una app B2B solo para clientes con cuenta. Opciones:
  - **TestFlight:** para pruebas y uso interno. Cada versión dura 90 días y para testers externos pasa una revisión ligera.
  - **App Store como app oculta (*unlisted*):** no aparece en búsquedas y se instala por enlace. Hay que solicitarlo a Apple.
  - **Custom App con Apple Business Manager:** solo si los clientes tienen ABM.
  - **App Store pública:** Apple puede rechazar apps de público restringido.
- **Revisión:**
  - Hay que dar **una cuenta de prueba con datos de demostración** a los revisores, porque la app requiere login.
  - Hay que publicar una **política de privacidad** y rellenar la ficha de privacidad, igual que en Google Play.
  - **IA de terceros:** las normas de Apple exigen avisar y pedir consentimiento antes de enviar datos personales a una IA externa (OpenAI/DeepSeek). Confirmar en las normas vigentes y valorar un aviso en el primer uso.
  - No hace falta ofrecer borrar la cuenta, porque las cuentas las crea Govoy y no se pueden crear desde la app.

---

## 4. Fases

| Fase | Contenido |
|---|---|
| **0. Backend** | D1 (login y renovación para móvil) y D2 (seguridad) |
| **1. Base** | Proyecto Expo, entornos con `EXPO_PUBLIC_API_URL`, login y tokens (copiados de AppGovoy), `ControlOpcionesUsuarios.ts` (D3), navegación, tema, perfiles EAS y EAS Update |
| **2. Versión mínima** | Chat con streaming, markdown, sugerencias, botón de parar, lista de conversaciones (nueva, duplicar y borrar) y descarga de documentos |
| **3. Contenido enriquecido** | Gráficas, mapas, valoración y notas de voz |
| **4. Interactivos** | Lo que en el chat pide algo al usuario: borradores de correo, formulario de optimización de sectores, su resultado y la comparativa de escenarios (ver "Progreso de la fase 4"). Push, más adelante |

**Fuera de alcance:** el panel de simulación.

### Progreso de la fase 1

La fase 0 (back) está **parada** hasta hablarla con el equipo. La fase 1 avanza en paralelo.

**Estado (2026-10-05): fase 1 cerrada en la app**, probada contra el back local. Queda fuera, a propósito:
- **Depende del back:** subir los endpoints de login móvil. Hasta entonces la app solo funciona contra el back local: `API_URL` apunta de momento a `http://127.0.0.1:8000/` (al subirlos, volver a `https://api.govoy.es/`).
- **Antes de la primera versión para clientes:** perfiles EAS y EAS Update, icono y pantalla de arranque, firma del APK, Sentry (pregunta 14).
- **Solo si aparece:** el parche de LogBox (#1834).

| # | Paso | Estado |
|---|---|---|
| 1 | Proyecto Expo SDK 57 (`blank-typescript`), nombres provisionales, `expo-dev-client`, primera compilación con `runappdevice` | Hecho |
| 2 | NativeWind 4, paleta clara y oscura (`src/theme/`), arranque en claro, `expo-system-ui`. Pantalla de prueba provisional en `App.tsx` | Hecho |
| 3 | URL del back en `src/auth/Constants.ts` (D6) | Hecho |
| 4 | Back: `/login-chat-movil`, `/refresh-token-chat-movil` e `/impersonate-chat-movil` en `routes/login.py`, en una **rama local de Back-Govoy sin subir** hasta hablarlo con el equipo | Hecho (probado sin BD; falta probar con BD) |
| 5 | Tokens (`tokenStorage`, `authApi`, `authManager` con `authFetch`), contexto de sesión (`SesionContext`), navegación (React Navigation 7, pantallas según el estado de la sesión) y regla de acceso (`ControlOpcionesUsuarios.ts`) | Hecho, falta probar en el móvil |
| 6 | Pantallas: login, suplantar (staff) e inicio provisional (datos de la sesión, cambiar tema, salir de suplantación, cerrar sesión) | Hecho; diseño del login revisado en el móvil. Falta probar el flujo completo contra el back local |

**Diseño de las pantallas de acceso (login y suplantar):**
- Estructura común en `PantallaAcceso`: arriba, el robot de Chelu de la web (`Front-Govoy/public/chelu.svg`, sin los filtros de brillo) flotando como en el chat web, sobre `primario-suave`; abajo, una hoja blanca con las esquinas superiores redondeadas, título grande alineado a la izquierda, subtítulo y el formulario. La zona de Chelu ocupa el espacio que sobra; la hoja mide lo que su contenido, con 56 px de margen inferior para subir el formulario.
- Con el teclado abierto, Chelu se encoge de 170 a 120 px (animación de 300 ms) y el margen inferior baja a 16 px (`useTecladoVisible`).
- Campos de 56 px con icono (usuario, candado), el texto dentro como placeholder, fondo gris sin borde en reposo y borde azul al enfocar. El ojo muestra u oculta la contraseña.
- Botón "Entrar" de 56 px justo debajo de los campos. Error en línea con icono.
- Suplantar: etiqueta "Staff · usuario", fila "Entrar sin maestro" pulsable entera y "Cerrar sesión" como botón de texto.
- Componentes: `CheluAvatar`, `PantallaAcceso`, `ui/CampoTexto`, `ui/Boton` (variantes primario, secundario, peligro y texto), `ui/MensajeError` y `ui/Pantalla`. Llevan propiedades de accesibilidad (rol, estado, etiquetas) para TalkBack/VoiceOver.

**Mensajes de error del login:**
- Sin acceso al chat, lo pare el back (empresa sin perfil) o la app (empresa fuera de `CHAT_CHELU` o rol sin acceso): siempre "Tu usuario no tiene acceso a Chat Chelu." (`SIN_ACCESO_CHAT` en `mensajesError.ts`). En suplantación: "El usuario X no tiene acceso a Chat Chelu.".
- Empresa desactivada: "Usuario o contraseña incorrectos." (decidido así para no dar pistas).
- Conductores: el back los excluye del login, así que responden 401 como si las credenciales fueran incorrectas.

**Cómo funciona la sesión en la app:**
- Solo se guardan en SecureStore los tokens de renovación, en dos ranuras: `usuario` (la sesión con chat, normal o suplantada) y `staff` (la propia del staff, para volver al salir de suplantación). El de acceso vive en memoria.
- Al abrir la app se renuevan las sesiones guardadas. Sin conexión se muestra "No se pudo conectar" con botón de reintentar.
- Login: staff sin suplantar → pantalla de suplantar; usuario que no cumple la regla de acceso (D9) → error, no se guarda nada; resto → inicio.
- Suplantar: se renueva antes el token del staff (puede llevar más de una hora parado) y se comprueba la regla de acceso del usuario suplantado.
- `authFetch`: si una petición da 401, renueva el token y reintenta una vez. Si la renovación da 401/403, la sesión caduca: en suplantación se vuelve a la pantalla de suplantar; si no, al login. **A diferencia de AppGovoy, un 403 solo cierra la sesión si es por empresa desactivada** (`detail: "EMPRESA_INACTIVA"`, se cierra al momento); el resto llegan a la pantalla, porque en el chat también significan "no puedes tocar este chat".
- Se guardan el usuario y la contraseña del último login (en SecureStore, como AppGovoy) para rellenar los campos, **solo si se entra de verdad** (staff o con acceso al chat; no si la app rechaza al usuario). Se conservan al cerrar sesión.

**Diferencias con lo previsto en la fase 0:**
- El token de renovación lleva `typ: "refresh"` (la propuesta pendiente); los de acceso no. `/refresh-token-chat-movil` solo acepta los de renovación e `/impersonate-chat-movil` los rechaza.
- En suplantación, el token de acceso dura lo normal (1 h) y el de renovación 6 h, en lugar de los dos 6 h: la sesión de soporte sigue teniendo el tope de 6 h.
- Los tres endpoints devuelven el mismo body (el de la web más `refreshToken`, `is_impersonation` e `impersonated_by`).
- El body incluye `zoom` (y `CorreoElectronico`) por ser igual que el de la web, pero **no hay planes de usar `zoom` en la app**: `sesionDesdeBody` no lo lee.
- Ojo: un token de renovación sigue valiendo como token de acceso en el resto de endpoints (`validar_token` ignora `typ`). Cerrarlo exigiría tocar `auth.py`, que usan todos; queda para hablarlo con el equipo.

Estructura de carpetas: como AppGovoy, código en `src/` (`auth/`, `chat/`, `components/`, `constants/`, `context/`, `hooks/`, `navigation/`, `screens/`, `theme/`, `types/`, `utils/`). En la raíz solo `App.tsx`, `index.ts` y los archivos de configuración.

### Progreso de la fase 2

Se trabaja en bloques pequeños, revisando cada uno antes de seguir.

**Estado (2026-10-06): fase 2 cerrada en la app**, probada en Android contra el back local. Queda fuera:
- **Probar en iOS:** nada se ha probado aún (falta la build de EAS y un iPhone).
- **Depende del back:** lo mismo que en la fase 1 (`API_URL` apunta al back local) y los puntos de D2.
- **Robot de Chelu:** pendiente de retocar.

| # | Bloque | Estado |
|---|---|---|
| 1 | Navegación de la app: menú lateral (Drawer de React Navigation) con una sola pantalla `Chat` (parámetro `chatId`), sustituyendo a la pantalla de inicio provisional. En el menú: Chelu y empresa, "Nueva conversación", lista, datos del usuario, tema, salir de suplantación y cerrar sesión | Hecho |
| 2 | Lista de conversaciones (`get_chats`, `useConversaciones`, `ListaConversaciones`) con fecha relativa. Se carga al arrancar y se recarga con un botón junto a "Conversaciones" (se quitó deslizar para recargar porque a veces impedía cerrar el menú); ya no al abrir el menú, ver "Rendimiento del menú lateral" en la fase 3 | Hecho |
| 3 | Abrir una conversación (`get_chat`, `useChat`): mensajes en una `FlatList` invertida para empezar abajo, markdown, cabeceras de emisor y conversación activa resaltada en el menú | Hecho |
| 4 | Enviar mensajes: (1) caja de texto ✔, (2) streaming con `expo/fetch` ✔, (3) conectar el envío (mensaje optimista, texto en directo, tarjetas de herramientas, puntos de "escribiendo", botón de parar, `session_id` nuevo) ✔, (4) preguntas sugeridas (píldoras en la última respuesta, ejemplos en la bienvenida) ✔ | Hecho |
| 5 | Borrar conversación ✔ y documentos (tarjeta en la respuesta y descarga) ✔ | Hecho |
| 6 | Duplicar conversación (entera desde el menú y "desde aquí" en cada respuesta), como la web | Hecho |
| 7 | Botón de actualizar la conversación en la cabecera del chat | Hecho |
| 8 | "Archivos generados": botón en la cabecera con contador y hoja inferior con los documentos de la conversación | Hecho |

**Detalles:**
- **Navegación:** `navigate('Chat', { chatId })` cambia los parámetros de la misma pantalla, no apila otra. Sin `chatId` es una conversación nueva (pantalla de bienvenida). El menú saca la conversación activa de `state.routes[state.index].params`.
- **`useSesionActiva`** guarda la última sesión en un `ref`, para que las pantallas que aún se están animando al cerrar sesión no fallen.
- **`get_chat`:** se mapea como `mapApiMessages` de la web: se descartan los mensajes vacíos y los de usuario que empiezan por "Optimizar sectores —" (resumen del formulario de sectores). Si se cambia de conversación antes de que llegue la respuesta, se descarta (`useChat`).
- **Markdown (decidido): `react-native-marked` 8.3.2**, con el hook `useMarkdown` (no el componente `<Markdown>`, que monta su propia `FlatList` y daría listas virtualizadas anidadas). Estilos con la paleta en `TextoMarkdown`; tablas y bloques de código con scroll horizontal; enlaces con `Linking`.
- **Mensajes (`BurbujaMensaje`), como en la web:**
  - Usuario: cabecera "Tú" + cuadrado gris con la inicial, a la derecha; burbuja azul `rounded-xl` con la esquina superior derecha recta.
  - Chelu: cabecera con el avatar y "CHELU"; el texto sin burbuja, a todo el ancho.
  - Sin sangría bajo la cabecera (se quitó en la fase 3, para que gráficas y tablas tengan todo el ancho); la fila de avatar y nombre sobresale 8 px hacia el borde.
- **Caja de texto (`CajaMensaje`):** campo multilínea (hasta ~5 líneas) y botón con el icono `Send` de lucide, como la web; gris y desactivado si está vacío.
- **Teclado:** `KeyboardAvoidingView` con `behavior="padding"`, como en el login. `Pantalla` tiene `margenInferior={false}` para que el margen inferior lo ponga la caja de texto, que lo quita con el teclado abierto (`useTecladoVisible`). `react-native-keyboard-controller` no se ha instalado; se valorará si en iOS hace falta.
- **Robot de Chelu (`CheluAvatar`):** desde el 2026-10-08 es la imagen de referencia en PNG (`assets/chelu.png`, 1242×1266 con transparencia, ~1 MB) con `resizeMode="contain"`, en lugar del SVG dibujado a mano.
- **Gráficas y mapas:** se hicieron en la fase 3.
- **Tablas del markdown:** `react-native-marked` da a la cabecera el mismo estilo que a las filas, así que `TextoMarkdown` sustituye la tabla con un `Renderer` propio (`RendererChelu.table`): cabecera oscura (`cabecera-tabla` / `sobre-cabecera-tabla`), filas alternas, columnas de 140 px como mínimo y scroll horizontal. Se probó justificar el texto y no tuvo efecto; se descartó. Retoques de la fase 3 para que se note que se desplaza:
  - El redondeo va en el marco y no en el contenido, así que el lado del corte también tiene esquinas.
  - Sombra degradada (`expo-linear-gradient`) en el lado por el que queda tabla: negra al 8 % en claro y al 40 % en oscuro.
  - Barra de desplazamiento nativa siempre visible (`persistentScrollbar`, solo Android). Se probó una barra propia con los colores del tema y se quitó.
- **Streaming (`chatApi.enviarMensaje`):** `POST /chat-cex/stream` con `expo/fetch` (`authFetch` admite otro `fetch` como tercer parámetro). Se leen los eventos `data: {json}` separados por línea en blanco, guardando el trozo incompleto. Eventos usados: `session`, `delta`, `tool`, `sugerencias`, `documento`, `done` (`run_id`) y `error`. Se envía `incluir_herramientas: true` e `incluir_metricas: false`; modelo fijo `deepseek-v4-flash`.
- **Envío (`useChat.enviar`):**
  - Mensaje del usuario y respuesta vacía en estado `escribiendo` al momento.
  - El texto se pinta como mucho una vez por fotograma (`requestAnimationFrame`).
  - Al acabar, la respuesta queda sin estado, `detenida` (se abortó) o `error`; se conserva el texto recibido.
  - En una conversación nueva, el evento `session` pone el id en la ruta (`setParams`). `creadaRef` evita que eso vuelva a cargar desde el back una conversación que ya está en pantalla.
  - Salir de la pantalla o cambiar de conversación aborta la respuesta en curso.
- **Tarjetas de herramientas (`TarjetasHerramientas`, `chat/herramientas.ts`):** copia de la lógica de la web (`describirConsulta`, `describirHerramienta`, "Generando gráfica de…"); hay que mantenerla igual que la web. Las llamadas con el mismo nombre y etiqueta se agrupan (×N) y el `fin` cierra la última abierta con ese nombre. Spinner mientras hay alguna en curso; check al acabar.
- **Puntos de "escribiendo" (`PuntosEscribiendo`):** tres puntos con Reanimated, como la web, mientras la respuesta está en curso (también tras el texto, porque una herramienta puede tardar segundos).
- **Duplicar:** `POST /chat-cex/duplicate_chat` (`session_id`, `hasta_run_id` opcional) devuelve el id de la copia, que se abre. Con confirmación en los dos casos (en la web no la hay), porque en el móvil es fácil tocar sin querer.
  - Desde el menú: icono `CopyPlus` a la derecha de la fecha; al acabar abre la copia y cierra el menú.
  - Desde una respuesta: "Duplicar desde aquí" con el icono de rama, solo en respuestas con `runId` que acabaron bien y nunca mientras se responde. El `runId` sale de `get_chat` o del evento `done`. Spinner y "Duplicando…" en la respuesta pulsada.
  - El `GitBranch` de `lucide-react-native` 1.x tiene otro dibujo que el de la web (`lucide-react` 0.477); se crea con `createLucideIcon` y el dibujo de la web. En `react-native-svg` las banderas de un arco deben ir separadas (`0 0 1`, no `001`).
- **Actualizar conversación:** botón a la derecha del título (truncado a una línea). Solo en conversaciones existentes; desactivado mientras se responde, porque cortaría la respuesta.
- **Modo oscuro:** paleta revisada hacia negros y grises casi neutros, con el azul solo en los acentos, y el texto principal sin llegar a blanco (`#d4d7dc`). Añadido `borde-medio`, entre `borde` y `borde-fuerte` (píldoras y tarjetas de ejemplo).
- **Preguntas sugeridas:** las del evento `sugerencias` y las de `get_chat` (`suggestions`) se guardan en el mensaje al acabar la respuesta. Se pintan como píldoras solo en la última respuesta y nunca mientras se responde; al tocar una se envía. En la bienvenida, los cuatro ejemplos de la web (`EXAMPLES`) con un icono cada uno, bajo un único "Prueba a preguntar".
- **Borrar conversación:** icono de papelera junto al de duplicar, con confirmación; `DELETE /chat-cex/delete_chat` (borrado lógico). Si era la abierta, se pasa a una nueva. Un solo estado `ocupado` en el menú para duplicar y borrar.
- **Documentos:**
  - Del evento `documento` y de los `docs` de `get_chat`. Se descarga **siempre por `fileId`** (la clave de S3): `/archivo/{fileId}` firma un enlace nuevo. El enlace que trae el back caduca (~15 min) y no se guarda; los documentos sin `file_id` se descartan.
  - La clave lleva barras y el back la recibe como ruta: se codifica por partes, como la web.
  - Tarjeta (`TarjetaDocumento`) como la web: icono y color por formato (Excel verde, PDF rojo, Word azul), nombre, tipo y tamaño, botón "Descargar" con spinner y aviso si falla. Sin número de filas ni "recortado".
  - **Android:** `react-native-blob-util` (0.25.1, con plugin en `app.json`) con el `DownloadManager` del sistema: a Descargas (`storeInDownloads`, Android 10+), con notificación y tipo MIME, sin salir de la app. En Android 9 o anterior el archivo se quedaría en la carpeta interna del gestor.
  - **iOS:** `Linking.openURL`, Safari lo descarga a Archivos › Descargas. Se probó el menú de compartir (`presentOptionsMenu`) y se descartó.
- **Archivos generados:** solo los de la conversación abierta, del más reciente al más antiguo y sin repetir (la web junta los de las conversaciones cargadas en memoria, que no es fiable). Sin "Borrar": en la web solo lo quita de la pantalla. Listar todas las conversaciones o borrar de verdad necesitaría endpoints nuevos en el back.
  - Es una capa dentro de la pantalla, no un `Modal`: en Android la ventana del `Modal` no llegaba al borde inferior y asomaba la caja de texto. Fondo con fundido y hoja que sube y baja con Reanimated; el botón atrás la cierra.
- **Tipos:** los del dominio del chat (`ResumenChat`, `Chat`, `Mensaje`, `Herramienta`, `Documento`) están en `src/types/Chat.ts`, como `Sesion.ts`. `EventoChat` se queda en `chatApi.ts`.
- **NativeWind, trampas conocidas:**
  - En `Animated.View` de Reanimated las clases no se aplican: se usa `style` (o un `View` con clases dentro).
  - En un `Pressable` con clases, el fondo de un `style` en forma de función (`({ pressed }) => …`) no se aplicaba (chips seleccionados en blanco): los colores van en un `View` interior con `style` fijo, usando `pressed` desde la función hija.
  - Las clases que se eligen en tiempo de ejecución (p. ej. un fondo según el formato) a veces no se generan: el color va en `style` con `useColores()`.
  - Tras cambiar `tailwind.config.js` hay que reiniciar Metro con caché limpia (`npx expo start -c`). Algunos fallos de clases en `Pressable` (el botón de parar gris, la píldora invisible) se debían a no haber recargado; el de parar sigue con el color en `style`.

### Progreso de la fase 3

| Parte | Estado |
|---|---|
| Gráficas | Hecho |
| Valoración de respuestas | Hecho |
| Mapas | Bloques 1 a 5 hechos; la vista previa queda aparcada hasta nuevo aviso |
| Notas de voz (`expo-audio`, m4a a `/transcribir`) | Aparcado de momento |

#### Gráficas

- **Librería: `react-native-gifted-charts`** (1.4.81, con `expo-linear-gradient`), pintando en nativo, no ApexCharts en un WebView. El back no cambia: sigue mandando la configuración de ApexCharts.
- **Lectura (`chat/graficas.ts`, `leerGrafica`):** tipo de `options.chart.type` (o `grafico`): `bar`/`column` → barras, `line`, `area`, `pie`, `donut`, `radialBar`. Las circulares toman las series como números y las etiquetas de `options.labels`; las cartesianas, `{ name, data }` y el eje X de `options.xaxis.categories`. Si el tipo no se sabe pintar o no hay datos, la tarjeta dice "No se puede mostrar esta gráfica".
- **Colores:** `PALETA_GRAFICAS` (20 colores, el primero el azul de la app). Ejes, rejilla y textos con `useColores()`, así que siguen el tema.
- **En el chat (`TarjetaGrafica`):** ajustada al ancho, sin toques dentro (el toque es de la tarjeta y la amplía).
  - Las barras van en **filas horizontales** (`Filas`): al encoger el eje X se perdían los nombres de las columnas. Las radiales, también en filas.
  - Valores en las columnas y en los vértices de las líneas (hasta 20 puntos) si caben, y porcentajes en las porciones de más del 5 %, como la web.
  - Ejes con un máximo "redondo" (`maximoRedondo`) y números sin abreviar con 2 decimales como mucho, como ApexCharts.
- **Ampliada (`GraficaScreen`, pantalla `Grafica` del stack raíz):** gira a horizontal, a pantalla completa, sin barras del sistema y con todas las etiquetas (scroll si no caben). Hasta que la ventana está en horizontal solo se ve un indicador, para no pintarla dos veces. El chat queda debajo congelado (`freezeOnBlur`) y `CapaGiro` lo tapa el momento en que vuelve a vertical.
- **Trampas:**
  - Con una sola serie las filas van en columna, y ahí `flex-1` le quitaba el alto a la barra (`flex-basis: 0`) y a veces no se veía: la barra usa `w-full shrink`.
  - La librería suma dos veces el margen final y la rejilla se sale de la tarjeta: se le dan los anchos exactos (`rulesLength`, `xAxisLength`).

#### Valoración de respuestas

- Pulgares arriba y abajo en cada respuesta guardada y completa (con `runId` y sin estado), solo para las empresas de `HAS_FEEDBACK_CHAT_CHELU` (o en sesiones master), como la web. El votado va relleno.
- Al pulsar se abre una hoja inferior (`HojaValoracion`, sobre `HojaInferior`): en la negativa, el motivo con un selector (`Selector`, los mismos motivos que la web) y una nota opcional (2000 caracteres). Si se repite el mismo pulgar, parte de lo ya puesto.
- `PUT /chat-cex/feedback` (`votarRespuesta`). El voto se pinta al momento y, si el back falla, vuelve el anterior y la hoja enseña el error (el `detail` del back ya viene en español, p. ej. el 409 si la empresa no tiene valoraciones). El voto guardado llega en `get_chat` (`feedback`).

#### Retoques de estilo del chat

- **Sin sangría** bajo las cabeceras de emisor: el contenido usa todo el ancho; la fila de avatar y nombre ("CHELU" y "Tú") sobresale 8 px hacia el borde. Margen lateral de la lista: `px-6`.
- Más espacio entre párrafos (6 px arriba y abajo) y entre elementos de lista (3 px).
- La cabecera del chat llega hasta arriba, bajo la barra de estado, con su color (`Pantalla` admite `margenSuperior={false}`).
- Tablas: ver los retoques en el progreso de la fase 2.

#### Menú lateral que se quedaba abierto (Reanimated)

- **Síntoma:** a veces el menú se abría solo y no se podía cerrar (los botones respondían). Se reproducía siempre mandando la app a segundo plano mientras cargaba un chat con gráficas.
- **Causa:** en Reanimated 4.5.1 la opción estática `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` (activa por defecto) pasa a React cada 500 ms los valores de las animaciones que han terminado, y el lado nativo los borra a los 2 s. Si el JS no llega a tiempo (app en segundo plano, recarga en desarrollo, JS ocupado), React se queda con el menú "abierto", lo vuelve a abrir en el siguiente render y no se puede cerrar porque Reanimated cree que ya está cerrado.
- **Arreglo:** desactivada en `package.json` (`reanimated.staticFeatureFlags`). Es una opción nativa: cambiarla exige recompilar.

#### Rendimiento del menú lateral

- **Síntoma:** con un cliente con muchos chats, al abrir el menú y cargarse la lista, la app iba lenta.
- **Causas:**
  - `get_chats` devuelve todas las conversaciones de golpe (sin paginar) y la lista se recargaba cada vez que se abría el menú.
  - Cada recarga crea objetos nuevos y las filas no estaban memorizadas: se repintaban todas las montadas.
  - La `FlatList` mantenía montadas unas 21 pantallas de filas, cada una con 3 iconos SVG.
  - `fechaRelativa` llamaba a `toLocaleDateString` en cada fila de más de 7 días, que en Hermes crea un formateador cada vez.
- **Arreglos:**
  - **Recarga:** al arrancar, con el botón, al borrar, y al abrir el menú solo si el chat abierto no está en la lista (recién creado o duplicado). El id de un chat nuevo llega al empezar la respuesta, antes de que el back lo guarde, por eso se comprueba al abrir el menú y no al cambiar de chat. El efecto depende solo de que el menú se abra, para no recargar en bucle si el back no devuelve ese chat. El título o la fecha de un chat que ya está en la lista no se actualizan solos (para eso, el botón).
  - **Filas memorizadas:** `ConversationRow` con `memo`, recibiendo los campos sueltos del chat (no el objeto, que cambia en cada recarga). `abrirChat`, `duplicar` y `borrar` con `useCallback` en `MenuLateral`. Las fechas relativas solo se actualizan al repintar la fila.
  - **`FlashList`** en lugar de `FlatList`: reutiliza las filas que salen de pantalla. Con scroll muy rápido aún se ven huecos en blanco un instante (`drawDistance` a 600 y 1000 no cambió nada, se quitó). No hay forma limpia de poner un skeleton en esos huecos.
  - **Fechas:** un único `Intl.DateTimeFormat` creado al cargar el módulo.
- **Para más adelante:** paginar `get_chats` en el back. El chat sigue con `FlatList` invertida: pasarlo a `FlashList` obliga a rehacer el scroll (la v2 no usa `inverted`), revisar el estado interno de los mensajes (se reutiliza al reciclar) y separar tipos de mensaje; solo si algún chat largo va lento.

#### Mapas

Decisión de librería y planteamiento en D8. Se trabaja en bloques, revisando cada uno antes de seguir.

| # | Bloque | Estado |
|---|---|---|
| 1 | Datos: tipos `Mapa`/`CapaMapa`, evento `mapa` del stream y `maps` de `get_chat`; tarjeta en el chat (`TarjetaMapa`) con título, número de puntos o zonas y leyenda | Hecho |
| 2 | Pantalla completa (`MapaScreen`): teselas de OSM, encuadre inicial, atribución propia y User-Agent. Se abre al pulsar la tarjeta | Hecho |
| 3 | Capas: zonas, líneas y puntos con el color de su capa; leyenda bajo el mapa | Hecho |
| 4 | Marcadores: iconos (depósito, entrega, recogida, entrega y recogida, incidencia, agrupado, PUDO, alerta), paradas numeradas según su estado y pantalla de carga | Hecho |
| 5 | Rutas reales: las líneas pasan por `/directionsForMap2-todas-las-rutas` del back (OSRM), con caché en memoria; si una ruta falla no se dibuja | Hecho |
| 6 | Vista previa en la tarjeta (ver D8): captura de un mapa oculto | Aparcado hasta nuevo aviso |

**Detalles:**
- **Datos (`chat/mapas.ts`):**
  - `aMapa()` lee lo que manda el back (`_payload_mapa`: `titulo`, `centro`, `bounds`, `num_puntos`, `num_poligonos`, `truncado`, `capas`). Descarta las capas sin elementos y el mapa si no queda ninguna, como la web.
  - Une al leerlo las capas con nombre equivalente ("VALÈNCIA"/"VALENCIA"), con el color de la primera.
  - Ojo: `centro` y `bounds` llegan en `[lat, lon]` y el GeoJSON en `[lon, lat]`, que es lo que usa MapLibre.
  - El nombre de las capas lo pone el back. Las de puntos sin ruta ni categoría se llaman como su marcador (`depot`, `pudo`…); traducirlas a "Depósito", etc. queda pendiente de decidir (en el back o en la app).
- **Tarjeta (`TarjetaMapa`):** icono, título, "N puntos · N zonas" ("(recortado)" si el back truncó) y leyenda (`LeyendaMapa`): cuadrado translúcido para zonas y, para puntos, el icono real de su marcador a 16 (`getLayerMarker` + `getMarkerIcon`; las capas de paradas, un círculo de su color). Sin los recorridos y solo con dos capas o más, como la web. Va tras las gráficas en la respuesta.
  - Abajo, un botón "Ver mapa" centrado, que solo es visual: el toque sigue siendo de toda la tarjeta. Al pulsarla sale un `ActivityIndicator` en el botón y la tarjeta se desactiva. La navegación espera al siguiente fotograma (`requestAnimationFrame`) para que el indicador se pinte antes del render pesado del mapa. Vuelve a su estado normal cuando el chat pierde el foco (`useIsFocused`).
- **Pantalla completa (`MapaScreen`, pantalla `Mapa` del stack raíz):**
  - Cabecera con título y cerrar; sin giro ni inclinación (siempre con el norte arriba, sin brújula).
  - Encuadre (`vistaInicial`): `bounds` con 40 px de margen; si son un solo punto, su centro con zoom 15; sin `bounds`, `centro` con zoom 13; sin nada, Madrid con zoom 12, como la web.
  - Atribución propia abajo a la derecha, con colores fijos (el mapa es siempre claro): "© OpenStreetMap contributors", con "OpenStreetMap" como enlace. Logo y botón (i) de MapLibre desactivados.
  - User-Agent con `TransformRequestManager.addHeader`, registrado al cargar el módulo para que esté antes de la primera petición. Solo afecta a las peticiones de MapLibre (su propio cliente OkHttp en Android).
- **Capas:** `elementosPorTipo()` junta los elementos de todas las capas en tres fuentes, tipadas por geometría (zonas `Polygon | MultiPolygon`, líneas `LineString`, puntos `Point`), cada elemento con el color de su capa, para que se pinten siempre en ese orden. Quita las posiciones en (0, 0) o sin coordenadas en todas las geometrías, como la web; las `MultiLineString` se separan en líneas sueltas. El estilo está en `CAPAS_ELEMENTOS` (estilo estándar de MapLibre, reutilizable en la vista previa): zonas al 25 % con borde de 2, líneas de 2 y una sola capa `symbol` para todos los puntos.
- **Marcadores (bloque 4):**
  - Todos los puntos son iconos en la capa `puntos`: `icon-image` = propiedad `icono` del punto, `icon-size` 0,8, todos visibles aunque se solapen y los posteriores encima (`symbol-z-order: 'source'`). Así una parada tapa entera a la de debajo.
  - Qué icono lleva cada punto (`getPointIcon` / `getMarkerIcon`): `marker` → círculo con el número de orden (relleno: color de la ruta si está completada, rojo si tiene incidencia, blanco si no); `number` → solo el número; `depot` y pines (`entrega`, `recogida`, `entregaRecogida`, `incidencia`, `agrupado`) → PNG copiados de la web en `assets/mapa/` (pines `@1.5x`, se ven de 17×28; depósito reducido a 90 px `@3x`, se ve de 30); `alert`, `pudo` y el resto → iconos generados (alerta, paquete, círculo del color de la capa). `entregaRecogida` sale con su pin, no como en la web, que por un fallo lo pinta como círculo.
  - Números como icono, no como texto: el texto en MapLibre necesita *glyphs* (fuentes) que el estilo de OSM no trae, y además se pintaría por encima de todos los iconos de la capa.
  - **Generación (`IconosMapa.tsx`, `GeneradorIconos`):** se dibujan con `react-native-svg` (`SvgIcono`, SVG de 1×1 px montados debajo del mapa) y se pasan a PNG con `toDataURL` a la densidad de la pantalla (`PixelRatio.get()`), en tandas de 100. Las imágenes de cada tanda se pasan al mapa al terminarla. Caché en RAM de los PNG (data URI) con un tope de 3000, borrando los menos usados. El id de cada icono son sus datos en JSON, así que los iguales se generan una vez. Los PNG fijos y los generados se registran con `<Images>`.
  - La captura ocupa el hilo de UI, por eso la animación de carga es el `ActivityIndicator` nativo (lo anima el sistema en otro hilo). Descartado de momento: módulo nativo para generar en segundo plano y caché en disco.
  - `agrupado` no se puede probar: el back lo acepta pero nunca lo genera ni se lo explica al modelo.
- **Pantalla de carga (`Spinners/CargaMapa`):** tapa el mapa desde el primer fotograma con el spinner y textos que van pasando cada 3,5 s (se queda en el último). El mapa y el generador se montan al acabar la animación de entrada (`transitionEnd`), porque crearlos durante ella daba tirones. Con iconos y rutas listos (o pasados los 5 s de espera de las rutas), se quita en el segundo aviso de pintado del mapa (`onDidFinishRenderingMapFully`), a los 1,5 s del primero o a los 3 s si no avisa. El primer aviso llega antes de tiempo: MapLibre registra las imágenes al momento con un hueco y las decodifica después, sin avisar al terminar. Tope general de 10 s desde el primer pintado completo del mapa, que se reinicia con cada tanda de iconos; lo que falte se pinta al llegar. Si aun así los iconos salen tarde, la siguiente opción es parchear MapLibre para que avise al cargar las imágenes.
- **Leyenda:** en pantalla completa va en un `ScrollView` de 144 px de alto como máximo (con `style`: la clase `max-h-36` de NativeWind no se aplicaba); en la tarjeta del chat, 8 capas como mucho y "+N más".
- **PUDO:** icono de 24×24, dibujado directamente en esas coordenadas.
- **Rutas (bloque 5, `chat/rutas.ts`):** `getLinesByStreets` manda todas las líneas en un POST a `/directionsForMap2-todas-las-rutas` (sin token, como la web) y cambia la geometría de cada una por el trazado de OSRM. Si una ruta falla no se dibuja (no la recta). Caché en memoria por coordenadas de la línea, solo de las trazadas. La petición sale al abrir la pantalla; si tarda más de 5 s, el mapa se abre sin líneas y se pintan al llegar.
- **Pendientes de mapas:** revisar la licencia de `leaflet-color-markers` (los pines) para la pantalla de licencias; los pines se ven algo borrosos en pantallas densas (se podrían generar como SVG); el texto "Colocando las paradas…" sale también en mapas sin paradas.
- **Vista previa (bloque 6), caso grande (20 mapas de 2000 puntos):** cola de una captura a la vez, priorizando las tarjetas visibles (la lista invertida monta primero las recientes); cancelar al desmontar la tarjeta; pausar la cola mientras se arrastra la lista (crear la vista nativa puede costar uno o dos fotogramas); capturar a densidad 2; caché en disco con clave `runId` + posición del mapa (el back no manda id); tiempo máximo, y si salta, la tarjeta queda sin imagen pero se puede abrir.

### Progreso de la fase 4

Todo lo que en el chat pide algo al usuario o le enseña un formulario. Se hace parecido a la web (Chat Chelu a pantalla completa, `src/routes/ChatChelu.tsx`).

**Fuera de alcance:** las tarjetas del chat lateral de la pantalla de simulación (`ChatCheluPanel`): `acciones_editor`, `carga_simulacion` y `orden_optimizacion` actúan sobre la simulación abierta ("Aplicar"/"Descartar"). La página del chat completo de la web también las ignora. Nada se abre en SmartZone (ver la regla general de la sección 1).

| Bloque | Contenido | Estado |
|---|---|---|
| 1 | Datos: tipos, los cinco eventos del stream (`correo_borrador`, `formulario_sectores`, `sectores`, `comparativa`, `progreso`), lectura en `get_chat` y aviso de progreso | Hecho |
| 2 | Tarjetas de resultado (`SectorsResultCard`) y comparativa (`ComparisonCard`), solo lectura, con nota "desde la web" | Hecho, falta probar en el móvil |
| 3 | Borrador de correo, en sub-bloques: 3a envío y registro de "ya enviado"; 3b tarjeta (Para, Asunto, adjuntos, avisos, botón y bloqueo) con el cuerpo en un `TextInput`; 3c editor del cuerpo con `react-native-enriched-html` | Hecho (3a, 3b y 3c), falta probar en el móvil |
| 4 | Formulario de sectores, en sub-bloques: 4a solo lectura y lanzar sin cambios; 4b mapa, zona y fechas; 4c demanda, carga mínima y modo; 4d editor de flota y escenarios; 4e cuadro "¿Algo que afinar?" (revisión con texto) | 4a, 4b-1 (elegir mapa) y 4b-2 (pantalla de edición y zona por CP) y 4b-3 (zona por proveedor) hechos, falta probar en el móvil. Siguiente: 4b-4, rango de estudio |

**Decisiones**
- **Formulario de sectores:** en el chat, una tarjeta con el resumen y los botones "Optimizar" y "Editar"; "Editar" abre el formulario en una pantalla completa (como los mapas). En la web va entero dentro de la burbuja, pero en el móvil serían varias pantallas de scroll dentro del chat.
- **Cuerpo del correo:** editor nativo de texto enriquecido con `react-native-enriched-html` (negrita, cursiva y subrayado, botones activos según el cursor), para verse como la web. Se descartó un `TextInput` con símbolos markdown (el usuario vería los `**`), `@expensify/react-native-live-markdown` (0.1.x, pide `expensify-common`, sin subrayado) y los editores con WebView (pesados, problemas de teclado y scroll en la lista del chat).
- **Correo ya enviado:** se recuerda en el móvil con AsyncStorage, como la web con `localStorage` (el back no lo guarda).
- **Resultado y comparativa sin botón "Abrir":** ni desactivado ni con aviso al pulsar; una nota pequeña "Puedes abrirla en SmartZone desde la web" (en la comparativa, una sola al pie).
- **Comparativa en tarjetas, no en tabla:** seis columnas no caben en el móvil; un bloque por escenario.

**Hecho en los bloques 1 y 2**
- `types/SectorsForm.ts`: el formulario con los nombres de campo del back (`mapas_disponibles`, `cps_seleccionados`…), porque se edita y se devuelve tal cual en el campo `formulario` del stream. `readOnly` en los que vienen de `get_chat`.
- `types/Chat.ts`: `BorradorCorreo` (los adjuntos son `Documento`), `SectorsSummary` (solo lo que se pinta), `SectorsResult`, `ScenarioComparison` (cada escenario es "con resumen" o "con error", lo decide la conversión). En `Mensaje`: `borradoresCorreo`, `sectorsForms`, `sectorsResults`, `comparisons` y `progress`. ("Borrador" en español: "draft" se descartó por raro.)
- `chatApi.ts`: conversiones `toBorradorCorreo`, `toSectorsResult`, `toComparison`, `toSectorsForm` (descartan lo que no trae nada, como la web) y un único `toEvent` con `switch` para todos los eventos del stream. `obtenerChat` lee `correos`, `formularios`, `sectores` y `comparativas`; una respuesta solo con tarjetas también se muestra. El filtro de "Optimizar sectores —" ya existía.
- `useChat.ts`: acumula las tarjetas; `progress` se pone con `progreso` y se quita con `sectores`, `comparativa`, al acabar, con error o al detener.
- Aviso de progreso en `BurbujaMensaje` tras las herramientas: spinner y mensaje del back sobre `primario-suave`.
- Tiempo y distancia de la comparativa: `tiempo_total_min` y `distancia_total_km` del back (misma suma de rutas que hace la web, redondeada a un decimal); "—" si faltan. Números con `utils/numbers.ts` (`Intl.NumberFormat` creado una vez). En es-ES los números de cuatro cifras no llevan punto de miles.

**Hecho en el bloque 3a**
- `chatApi.sendEmail(sessionId, borrador, editado)`: `POST /chat-cex/correo/enviar` con lo editado y los `fileId` de los adjuntos del borrador. Si falla, lanza el `detail` del back (o un texto para 429, 502 y el resto). Si va bien, apunta el envío y devuelve el `message_id` ("enviado" si no llega).
- `chat/correosEnviados.ts`: registro en AsyncStorage (`chelu_correos_enviados`, la misma clave y huella que la web: sesión + djb2 del asunto y cuerpo originales), con los 200 más recientes. `getSentMessageId` para saber al pintar la tarjeta si ya se envió.
- `react-native-enriched-html` instalada (1.1.1). Los avisos de `ERESOLVE` y las ~20 vulnerabilidades nuevas de `npm audit` son de sus dependencias de web (`@tiptap/*`, `dompurify`), que no entran en la app.

**Hecho en el bloque 3b**
- Al recargar, la tarjeta enviada muestra el borrador original de Chelu (lo único que devuelve `get_chat`) y no lo editado, igual que la web. Se probó guardar lo enviado en el registro local y se descartó: queda para la propuesta del back.
- "Ya enviado" va en el propio borrador (`sentMessageId`): `obtenerChat` lo rellena con el registro y `useChat.sendEmail` lo pone al enviar. Así no se pierde si la lista desmonta la tarjeta. Lo editado sin enviar sí se pierde en ese caso (estado de la tarjeta).
- `TarjetaBorradorCorreo`, tras los documentos y antes de los resultados de sectores: cabecera (borrador / enviado con su ID), "Para" (rojo y "obligatorio" si está vacío, teclado de correo), "Asunto" con contador /200, "Mensaje" en un `TextInput` multilínea (provisional hasta el 3c), adjuntos de solo lectura con tamaño, avisos con los topes del back, error del back y botón Enviar / Enviando… / Enviado. Enviando o enviado, los campos no se editan.
- Sin foco automático en "Para" al llegar el borrador (en el móvil abriría el teclado).
- `formatBytes` pasa a `utils/numbers.ts` (lo usan esta tarjeta y `TarjetaDocumento`). `EditedEmail` en `types/Chat.ts`.
- Por probar: que el teclado no tape los campos de la tarjeta dentro de la lista invertida.
- Varios borradores en una misma respuesta (p. ej. el modelo corrige uno tras las `advertencias`): se pinta una tarjeta por borrador, como la web, aunque la descripción de `preparar_correo` le dice al modelo que cada uno reemplaza al anterior.

**Hecho en el bloque 3c**
- `EditorCuerpoCorreo`: `EnrichedTextInput` con barra debajo del texto (el menú de copiar y pegar la tapaba arriba): negrita, cursiva, subrayado y lista con viñetas, cada botón marcado según el cursor (`onChangeState`). Sin barra cuando no se puede editar. Crece con el texto (`scrollEnabled={false}`). "- " al principio de línea empieza una lista; sin enlaces (`linkRegex={null}`).
- **Ojo, también en la web:** el back (`cuerpo_a_html`, `correo.py:93`) solo convierte negrita, viñetas y párrafos. La cursiva llega con los asteriscos y el subrayado con las etiquetas `<u>` visibles (escapa el texto antes). Se dejan los botones como en la web; queda para el equipo que el back los convierta.
- Se probó añadir los formatos al menú que sale al seleccionar texto (`contextMenuItems`) y se quitó: al pulsar "Negrita" desde ahí la app se cerraba en Android (sin investigar la causa).
- El editor no es controlado: la tarjeta guarda solo el texto plano (para "Falta el mensaje") y al enviar pide el HTML (`getHTML`) y lo pasa a markdown.
- `chat/cuerpoCorreo.ts`: `markdownToEditorHtml` (un `<p>` por línea, líneas vacías como `<br>`, líneas seguidas con `- ` o `* ` como `<ul>`, `**`→`<b>`, `*`→`<i>`, `<u>` se mantiene; se escapa antes) y `editorHtmlToMarkdown` (al revés; listas y títulos pegados salen como texto, el resto de etiquetas se quitan y se decodifican las entidades, también `&#225;`). Probado de ida y vuelta con el HTML que genera Android. El de iOS no se ha visto.

**Cómo funciona en la web y el back (revisado el 2026-10-08)**

Rutas cortas: **F** = `Front-Govoy/src/routes/components/ChatChelu/`, **B** = `Back-Govoy/agentes/chat_CEX/`.

- **Comunes:** el back usa la misma tabla (`_ARTEFACTOS`, B `endpoint_chat.py:1172-1186`) para el stream y para `get_chat`, así que el formato es el mismo en los dos. En la web: eventos en `useChatChelu.ts:898-1041`, tarjetas en `AsstBubble.tsx:146-176` (orden: correos, formularios, sectores, comparativas), recarga en `chatHistoryApi.ts:65-142`.
- **Correo (`correo_borrador`)**
  - Lo genera la herramienta `preparar_correo` (B `tools_chat/correo.py`); no envía nada. Límites: asunto 200 caracteres, 10 destinatarios, 3 adjuntos, 8 MB en total.
  - Datos: `asunto`, `cuerpo_markdown`, `destinatarios` (casi siempre vacío: el modelo no inventa direcciones), `adjuntos` (`file_id`, `nombre`, `tamano_bytes`, `formato`), `advertencias` (para el modelo, se ignoran). En `get_chat`: `correos`.
  - Tarjeta web (F `CorreoCard.tsx` + `CuerpoCorreoEditor.tsx`): "Para" (separado por `,` `;` o salto de línea, validado con `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, rojo si está vacío y con foco al llegar sin destinatarios), "Asunto" con contador /200, "Mensaje" con negrita, cursiva y subrayado (el subrayado viaja como `<u>…</u>` dentro del markdown; pegar es solo texto), adjuntos de solo lectura. Avisos de validación con los mismos límites (`constants.ts:29-32`).
  - Botón: "Enviar" / "Enviando…" / "Enviado" (verde, con "ID del envío"). Desactivado si falta algo o hay avisos. Si falla, se ve el `detail` del back y se puede reintentar sin perder lo editado.
  - Envío: `POST /chat-cex/correo/enviar` con `{asunto, cuerpo_markdown, destinatarios[], adjuntos: [file_id…], session_id}` → `{success, message_id, destinatarios}`. El back revalida, baja los adjuntos de S3 (400 si caducó), limita a 10 por hora y usuario (429) y envía por SES desde `chelu@govoy.es` con Reply-To del usuario (502 si SES falla).
  - Tras enviar, el back guarda un turno "Correo enviado a X con el asunto «Y»." que solo aparece al recargar. El bloqueo de "ya enviado" es de la web (`localStorage['chelu_correos_enviados']`, clave sesión + hash djb2 del asunto y cuerpo originales, F `helpers.ts:189-228`).
  - La web añade cada borrador como tarjeta nueva (no sustituye el anterior).
- **Formulario de sectores (`formulario_sectores`)**
  - Lo generan `preparar_optimizacion_sectores` y, al revisar con texto, `ajustar_formulario_sectores` (B `tools_chat/preparar_opti.py`). Solo perfiles con SmartZone (clientes 92 y 101).
  - Datos: `mapa`, `mapas_disponibles`, `zona`, `rango_estudio`, `demanda`, `flota`, `carga_minima`, `modo`, `limites`, `avisos` (tipos en `types/SectorsForm.ts`). Sin mapa elegido, `mapa` es null. En `get_chat`: `formularios`; al lanzar, el back guarda además el formulario enviado (con `lanzado: true` y listas vaciadas), así que al recargar sale una tarjeta más que en directo. La web marca todos los recargados como solo lectura, con "Volver a cargar" (pide `op=formulario` y lo vuelve editable).
  - Consultas sin gastar turno: `GET /chat-cex/formulario-sectores?op=…` con `id_cell_group`, `nombre_mapa`, `cps` (B `endpoint_chat.py:2097-2158`, F `formularioSectoresApi.ts`). `op`: `formulario` (todo), `mapas`, `zona`, `flota` (sin `tipo`), `proveedores` (lento). Errores 400/404 con `detail`.
  - Formulario web (F `FormularioSectoresCard.tsx` ~770 líneas + `FlotaEditor.tsx` ~245): no tiene mapa, solo selectores, chips, fechas, horas, números y casillas.
    - Mapa: selector (los "PRUEBAS GOVOY" solo para master) y fechas del mapa. Al cambiarlo, `op=formulario`, conservando el modo si se puede.
    - Zona: "Mapa entero / Por CP / Por proveedor". Por CP: filtro y chips (24 y "+N"); cada cambio espera 400 ms y pide `op=zona` y luego `op=flota`, conservando el tipo de flota elegido y cancelando lo anterior. Por proveedor: se cargan al pedirlos y al elegir uno se marcan sus CP. Los CP no encontrados se avisan.
    - Rango (plegable): dos fechas dentro de las del mapa y días L–D (los 7 = `null`, 0 = lunes).
    - Demanda: chips de nivel y número 1–99 (al escribirlo pasa a `personalizado`).
    - Flota: "Recomendada" y "Múltiples escenarios" ("Personalizada" solo si ya venía). Vehículos (plegable): incluir, ruta, unidades, desde/hasta, paradas, borrar y "Añadir un tipo de vehículo" (08:00–18:00); aviso de descartados y total. En escenarios, pestañas Ajustado (uno menos) / Recomendada / Holgado (uno más), F `helpers.ts:274-344`; tocar una pestaña la guarda en `flota.escenarios_editados` ("Volver a calcularlo" lo deshace).
    - Carga mínima (plegable): 1–100 %, 75 por defecto. Modo: chips de `modo.opciones` y "Asignación múltiple" solo en fragmentado.
    - Línea resumen y cuadro "¿Algo que afinar?" (obligatorio con flota personalizada). Botón "Optimizar" si está vacío, "Revisar optimización" si tiene texto.
    - Bloqueos: sin mapa; por CP o proveedor sin ninguno; sin vehículos marcados; personalizada sin texto (los dos últimos no bloquean si hay texto). Los `avisos` del back se ven hasta que se edita.
    - Estados: lanzado ("Optimización lanzada con estos valores"), en revisión ("Mandado a revisar…") y solo lectura: resumen sin edición.
    - Las ediciones se guardan fuera del componente para que no se pierdan al pasar de "respuesta en curso" a "guardada" (en la app el mensaje es el mismo objeto, no debería hacer falta).
  - Lanzar: el formulario va en `formulario` del `POST /chat-cex/stream`.
    - Sin texto (ruta rápida): `pregunta: ""`, no se pinta mensaje del usuario y el título es el resumen (F `helpers.ts:373-402` `resumenFormulario`, que debe coincidir con `describir_formulario` del back). El back valida, manda `progreso`, optimiza sin el modelo, manda `sectores` o `comparativa` (escenarios → `comparar_escenarios_sectores`, si no `optimizar_sectores`; personalizada se rechaza) y luego el modelo comenta el resultado.
    - Con texto: `pregunta` es el texto y sale como mensaje normal; el modelo llama a `ajustar_formulario_sectores` y llega otra tarjeta de formulario, sin lanzar nada.
    - Si el chat está ocupado no se lanza y la tarjeta sigue editable.
- **Progreso (`progreso`):** `{tool, mensaje}` ("Optimización en proceso. Esto puede tardar algunos minutos..."). No se guarda.
- **Resultado (`sectores`):** `{optimizacion_id, resumen}`; resumen con `grupo`, `celdas_pedidas/asignadas/sin_asignar`, `vehiculos_aportados/usados`, `vehiculos_sin_usar`, `percentil_final`, tiempos y distancias totales y medias, `rutas[]`, `diagnostico_sin_asignar` y `fragmentacion` (B `opti.py:514-609`). La web solo pinta grupo, vehículos y celdas.
- **Comparativa (`comparativa`):** `{escenarios: [{nombre, optimizacion_id, resumen} | {nombre, error}]}`; los escenarios se calculan en paralelo, 4 como mucho (`limites.max_escenarios`).

**Hecho en el bloque 4a**
- `chat/sectorsForm.ts`: cálculos de la flota (vehículos incluidos, unidades, capacidad, los tres escenarios con "uno menos" / "uno más" y los editados a mano), etiquetas (flota, modo, rango, fechas) y `getLaunchBlocker` (sin mapa, por CP sin ninguno, flota personalizada, sin vehículos).
- `SectorsFormCard`, tras los correos y antes de los resultados: cabecera, avisos del back, filas de resumen (mapa y fechas, zona y celdas, rango, demanda, flota con vehículos y capacidad o los tres escenarios, aprovechamiento mínimo, modo) y botón "Optimizar". Si no se puede lanzar, el motivo junto al botón desactivado; mientras Chelu responde, también desactivado.
- Lanzar (`useChat.launchSectorsForm`): marca el formulario como `launched` en su mensaje (pie "Optimización lanzada con estos valores") y llama a `enviar('', formulario)`, que manda `formulario` en `/stream` con la pregunta vacía y no pinta mensaje del usuario.
- Los del historial (`readOnly`) salen con "De una conversación anterior" y sin botón; "Volver a cargar" llega con la edición (4b).
- Sin la lista de vehículos (chips) en la tarjeta: solo recuentos. La lista irá en la pantalla de edición.

**Hecho en el bloque 4b-1 (elegir mapa)**
- Al probar el 4a, Chelu mandó el formulario sin mapa (`mapa: null`, zona con 0 celdas) y no había forma de elegirlo: por eso el 4b empieza por aquí.
- En la tarjeta, la fila "Mapa" es un `Selector` con `mapas_disponibles` (más el actual si no viene en ellos), "nombre · depósito". Los "PRUEBAS GOVOY" solo en sesiones master (`esSesionMaster`). Lanzada, solo el nombre.
- Al elegir uno, `chatApi.fetchSectorsForm` (`GET /chat-cex/formulario-sectores?op=formulario&id_cell_group=…`) y `useChat.changeSectorsFormMap` sustituye el formulario en su mensaje (ya editable). Se conserva el tipo de optimización si el mapa nuevo lo admite. Mientras carga, "Cargando el mapa…" y "Optimizar" desactivado; si falla, el `detail` del back bajo el mapa.
- Los del historial tienen "Volver a cargar": pide el formulario del mismo mapa con los datos de hoy y lo deja editable. Si se generó sin mapa, pide `op=formulario` sin `id_cell_group`: el back lo devuelve sin elegir y con todos los mapas (en la web ese caso se queda bloqueado: `recargar` sale si no hay mapa). Mientras carga, el spinner y "Cargando…" van en el propio botón, y el error encima de él.
- Hasta pulsarlo, la tarjeta se ve desactivada: avisos y resumen al 50 % de opacidad (en `style`, porque NativeWind puede no repintar al cambiar la clase), el mapa como texto en vez de selector y el subtítulo "De una conversación anterior. Vuelve a cargarlo para editarlo". La cabecera y el botón quedan con su color. "Cargando el mapa…" y el error van en la fila del mapa, así que también salen atenuados.
- `mapas_disponibles` siempre llega como lista: en los del historial, el back la vacía (`_formulario_para_historial`, `endpoint_chat.py:1384`), no la quita. Por eso se añade el mapa actual a la lista.

**Hecho en el bloque 4b-2 (pantalla de edición y zona)**
- **Pantalla de edición (`SectorsFormEditor`):** capa a pantalla completa dentro de `ChatScreen` (como "Archivos generados"), no pantalla del stack: así el formulario va y vuelve sin pasar por la navegación. Sube desde abajo; cabecera con cerrar, "Editar optimización", mapa y depósito, y "Guardar".
  - Trabaja sobre una copia; "Guardar" la pasa al mensaje (`useChat.saveSectorsForm`). Cerrar (o el botón atrás) con cambios pide confirmar que se descartan.
  - "Guardar" desactivado mientras se recalcula.
- **Tarjeta:** botón "Editar" junto a "Optimizar" (solo con mapa elegido y sin estar cargando el mapa); el motivo de bloqueo pasa a una línea encima de los botones. El selector de mapa sigue en la tarjeta.
- **Zona (`SectorsZoneSection`):** chips "Mapa entero" / "Por CP" (`ui/Chip`). Por CP: filtro numérico, 24 CP y "+N", y aviso de CP ignorados. Abajo, "N de M celdas · N vehículos" o "Recalculando la zona/flota…".
  - Cada toque de CP cancela la petición en curso al momento (si no, su respuesta quitaría los CP tocados después) y recalcula a los 400 ms: `op=zona` y luego `op=flota` (`chatApi.fetchSectorsZone` / `fetchSectorsFleet`, con `AbortController`). La flota se mezcla para no perder el tipo elegido, como la web. Pasar a "Mapa entero" quita los CP y recalcula.
  - El modo elegido se guarda en `zona.modo` (tipo `ZoneMode`): el back lo deduce de los CP y al lanzar solo lee `cps_seleccionados`. Así la tarjeta bloquea "Por CP" sin ninguno marcado.
  - Al recalcular se vacían los `avisos` del back (eran del formulario tal como llegó), en lugar del indicador "tocado" de la web.
- `fetchSectorsForm` comparte la llamada con las nuevas; su error genérico pasa a "No se pudo cargar el formulario".

**Hecho en el bloque 4b-3 (zona por proveedor)**
- Tercer chip "Por proveedor". Los proveedores (`op=proveedores`, la consulta lenta; `chatApi.fetchSectorsProviders`) se piden la primera vez que se elige ese modo y se guardan mientras el editor está abierto. Mientras tanto, "Cargando proveedores…"; si el mapa no tiene, "Este mapa no tiene proveedores."; si fallan, el error de la sección y se vuelven a pedir al volver a elegir el modo.
- Un chip por proveedor, "Nombre (N)", con **selección múltiple** (la web solo deja uno: cada toque sustituye los CP por los suyos).
  - Marcado si todos sus CP están elegidos (`isProviderSelected`), se hayan elegido por proveedor o por CP. Puede haber varios marcados a la vez (p. ej. uno pequeño cuyos CP están dentro de uno grande). No se guarda aparte qué proveedores se tocaron.
  - Buscador por nombre (sin distinguir mayúsculas ni tildes) y lista con scroll propio de media pantalla como máximo (`ScrollView` con `nestedScrollEnabled`, dentro del de la pantalla).
  - Tocar uno sin marcar añade sus CP a los elegidos; tocar uno marcado quita todos los suyos (y desmarca a los que compartan CP con él). Se recalcula con la misma espera de 400 ms que los CP sueltos.
- En la tarjeta, la zona sigue saliendo como "Por CP: …" (no se guarda qué proveedor se eligió).

**Pendiente de hablar con el equipo: optimizaciones en segundo plano y aviso al terminar**
- **Problema hoy (web y app):** cambiar de chat, salir de la pantalla o dejar la app en segundo plano corta el stream. En la ruta rápida del formulario, el solver sigue en su hilo (`asyncio.to_thread`, `endpoint_chat.py:1654`) pero el resultado se descarta y no se guarda nada en el historial: ese corte queda fuera del `except CancelledError` (`:1835`). Si la lanza el modelo, el turno se guarda como interrumpido pero sin el resultado. Se decide no poner un parche en la app (confirmar antes de cambiar de chat) a la espera de esto.
- **Propuesta:**
  1. **Back, trabajo propio:** la optimización se registra como trabajo (en curso / terminada / error) y se ejecuta aunque se corte la conexión. Al terminar, guarda en el historial la tarjeta (`sectores` o `comparativa`) y el comentario de Chelu. Para sobrevivir a un reinicio o despliegue, el trabajo va en una tabla (o una cola) y se retoma o se marca como fallido.
  2. **Push:** la app pide permiso con `expo-notifications` y manda su token al back (tabla de tokens por usuario y endpoint nuevos; se puede partir de `utilsNotifications.tsx` de AppGovoy). Al terminar, el back envía la notificación con la API de Expo. Configuración: FCM (Android) y APNs (iOS) con EAS, build nueva. La notificación lleva el `chatId` y al tocarla se abre esa conversación.
  3. **App:** con la app abierta en otro chat, aviso dentro de la app ("La optimización de X ha terminado · Ver"). Al volver a un chat con una optimización en curso, "Optimización en proceso…" hasta que termine (consultando el estado o con el aviso).
  4. **Lista de conversaciones:** el chat cuya optimización ha terminado y aún no se ha abierto sale resaltado con un "!" hasta abrirlo. Hace falta saberlo al cargar la lista: un campo en `get_chats` (p. ej. resultado sin ver) o, solo en el móvil, apuntarlo al recibir la notificación.
- No sirve que la app se avise sola al acabar el stream: en segundo plano Android e iOS cortan la conexión o la app en pocos minutos.

**Pendiente de hablar con el equipo: "ya enviado" entre dispositivos**
- **Problema:** el registro de enviados es de cada dispositivo (AsyncStorage en el móvil, `localStorage` en la web). Un correo enviado desde el móvil sigue saliendo como enviable en la web, y al revés. Pasa también en la web entre navegadores.
- **Por qué:** el back ya guarda un turno de confirmación al enviar (`_persistir_correo_enviado`, `endpoint_chat.py:1439`), pero no dice qué borrador fue.
- **Propuesta (back, luego web y app):**
  1. `/correo/enviar` recibe también el borrador original (asunto y cuerpo sin editar). Con eso calcula una huella y la guarda en los metadatos del turno de confirmación, con el `message_id` y lo enviado (destinatarios, asunto y cuerpo editados).
  2. `get_chat` calcula la huella de cada borrador y, si hay un turno de confirmación con ella, le añade `enviado_message_id` y lo enviado, para que la tarjeta muestre lo que salió y no el borrador original.
  3. Si llega un envío de un borrador ya confirmado, 409 "Este correo ya se envió" (evita reenviar desde otra pestaña o dispositivo con la tarjeta abierta).
  4. Web y app mandan el borrador original, leen `enviado_message_id` y lo enviado de `get_chat` y quitan el registro local. (Hoy web y app, al recargar, enseñan el borrador original como enviado.)
- Por huella y no por `run_id` + posición: el borrador llega antes de que acabe la respuesta, cuando aún no hay `run_id`. No hace falta tabla nueva.

**Licencias para la pantalla de licencias (pendiente antes de publicar)**
- Ya en la app: `@shopify/flash-list` (MIT); MapLibre y compañía (ver D8); falta revisar `leaflet-color-markers`.
- Con el bloque 3, lo que entra en la app de `react-native-enriched-html`: la propia librería (MIT, Software Mansion), **Gumbo** (analizador de HTML de Google, Apache-2.0, en Android e iOS) y **TagSoup** 1.2.1 (Apache-2.0, solo Android). Comprobado en el paquete: `index.native.js` solo importa la parte nativa.
- Sus dependencias de web (TipTap, ProseMirror, `linkifyjs`, `fast-equals`, `use-sync-external-store`: MIT; `dompurify`: MPL-2.0 o Apache-2.0 a elegir) se instalan en `node_modules` pero no entran en la app; no van en la pantalla. No se pueden quitar de forma limpia (son `dependencies` del paquete) y no hace falta.

### Fase 0 en detalle (Back-Govoy)

Cambios en dos ficheros: `routes/login.py` (autenticación) y `agentes/chat_CEX/endpoint_chat.py` (seguridad del chat).

**Bloque 1 — Autenticación móvil (`routes/login.py`, junto a los demás logins)**

| Endpoint | Basado en | Qué hace |
|---|---|---|
| `POST /login-chat-movil` | `/login2-secure` (l.330) | Misma consulta (sin conductores), `verify_password`, `is_master = is_govoy_staff`, empresa desactivada → 403. **Además:** si no es staff y `tiene_perfil(empresa_id)` es falso → 403. Mismos claims y el mismo `body` que la web, más `refreshToken` en el cuerpo, sin cookie. |
| `POST /refresh-token-chat-movil` | `/refresh-token2-secure` (l.617) | Token de renovación como Bearer. `_bloquear_si_empresa_desactivada`. Sesión normal: nuevo token de acceso y nuevo de renovación (10 × `ACCESS_TOKEN_EXPIRE_MINUTES`). Suplantación: nuevo token de acceso que no pasa del `exp` del de renovación, y el de renovación no se sustituye (tope de 6 h). |
| `POST /impersonate-chat-movil` | `/impersonate` (l.244) | Token del staff → `is_govoy_staff` o 403. El usuario a suplantar se busca por nombre y no puede ser conductor. Claims de suplantación (`is_impersonation`, `impersonated_by`, `is_master` según `iniciar_sin_maestro`, " <GOVOY>"). Tokens de acceso y renovación de 6 h en el cuerpo. |

- **Propuesta:** añadir el claim `typ: "refresh"` al token de renovación y exigirlo en `/refresh-token-chat-movil`. Hoy el token de acceso y el de renovación son iguales salvo en el `exp`, así que uno de acceso robado serviría para renovar indefinidamente. Al reemitir el token de acceso hay que quitar ese claim (`reissue_token_from_decoded` copia todos). `validar_token` ignora los claims extra, así que no afecta al resto.
- El body se monta con `_login_body_from_decoded_jwt` (l.89) más `refreshToken` y `zoom`.

**Bloque 2 — Seguridad del chat (`endpoint_chat.py`)**

| # | Dónde | Cambio |
|---|---|---|
| 2.1 | `get_chats` | **HECHO por el equipo** (`c67f863`, 2026-10-05): cada usuario solo ve sus chats (opción 3 de la nota). Afecta también a master: ya no ve los chats de desarrollo de otros. Mejora posible: el filtro está en la segunda consulta; ponerlo también en la primera evita cargar todos los `session_id` de la empresa. |
| 2.2 | `get_chat` | **Pendiente:** sigue sin comprobar el dueño; cualquier usuario de la empresa puede abrir un chat ajeno si conoce su `session_id`. Para ser coherente con 2.1: 404 si el chat no es suyo. También sigue el `print(chat)`. |

> **Nota sobre 2.1 y 2.2:** según el historial de git, hoy los chats **se consultan por empresa a propósito**.
>
> | Commit | Lista (no master) | Abrir un chat (no master) |
> |---|---|---|
> | `44656f6` (primera versión) | solo los suyos | solo los suyos |
> | `5357d0b` (31 ago) | chats de staff (parece un error) | solo los suyos |
> | `d8484ef` (4 sep) | todos los de la empresa | solo los suyos |
> | `87e1767` (9 sep) | todos los de la empresa | todos los de la empresa |
>
> Modificar sigue siendo por usuario: continuar un chat ajeno da 403 (`/stream`), borrarlo da 404 y solo el dueño puede valorar. La web no muestra los chats ajenos como de solo lectura.
>
> **Opciones:**
> 1. Compartido por empresa en solo lectura (sin cambios en el back; el candado en la web y la app).
> 2. Compartido por empresa del todo (cambiar `/stream` y `delete_chat`).
> 3. Solo los propios (la propuesta inicial).
| 2.3 | `/stream` (l.1761) y `get_chat` (`incluir_sql`) | `incluir_sql` solo se cumple si `is_master` (o la empresa de "UsuarioPrueba1", como en el front, `ConfigModal.tsx:57`). |
| 2.4 | `/stream` (l.1492) | `modelo` fuera de `MODELOS_DISPONIBLES` → modelo por defecto. (La restricción a solo master queda para más adelante, D10.) |
| 2.5 | `_perfil_de_token` (l.240) | Rechazar claves de API `api_…` en `/chat-cex/*` (401). Hoy crean chats sin dueño (l.1477-1483). |

**Bloque 3 — Limpieza**

- `print(chat)` (`endpoint_chat.py:2746`).
- `print` del token de renovación y de la respuesta (`routes/login.py:386` y `:399`).

**Impacto en la web**

- 2.1 y 2.2: según la opción elegida (ver nota). Con la 3, un usuario normal deja de ver los chats de sus compañeros.
- 2.3 coincide con lo que ya muestra el front.
- 2.4 y 2.5 no afectan a la web.
- Los endpoints del bloque 1 son nuevos y no tocan los existentes.

**Pruebas:** no hay batería de tests en el back (solo `tests/test_main.py`). Se prueba a mano con Swagger o curl:
- Login de cliente con chat, de cliente sin chat, de conductor y de staff.
- Renovación normal, renovación en suplantación y renovación usando un token de acceso (debe fallar).
- Suplantación con y sin maestro.
- `get_chats` y `get_chat` como usuario normal y como master.
- `incluir_sql` sin ser master.
- Modelo inventado.
- Clave de API.

---

## 5. Preguntas abiertas

### A. Bloquean la fase 0 (backend)

1. ~~**Usuarios**~~ → **Decidido (D9):** los mismos que en la web y con las mismas credenciales. Que el back compruebe el rol queda aplazado (apartado C).
2. ~~**ID de empresa e ID de cliente**~~ → **Resuelto, ver D4.**
3. ~~**Funciones por empresa**~~ → **Decidido:** constantes en el código de la app y solo el sufijo `-master` (ver D3).
4. ~~**Tokens (D1)**~~ → **Decidido:** duración igual que en la web; suplantación desde la app escribiendo el nombre de usuario; cerrar sesión solo borra en el móvil.
5. ~~**Modelos**~~ → **Decidido (D10):** como la web, con `deepseek-v4-flash` por defecto y selector solo para master.

### B. Bloquean la fase 1 (crear el proyecto)

6. ~~**Versiones**~~ → **Decidido (D5):** mismo stack que AppGovoy, en versiones actuales.
7. ~~**Repositorio**~~ → **Decidido:** repo nuevo `Mario-GOVOY/Chelu-Govoy`. El código común de AppGovoy (tokens, `authManager`, conectividad) se copia y adapta, no se comparte en un paquete.
8. **Identidad de la app (provisional, 2026-10-02):** nombre visible **"Chelu Govoy"**, slug y nombre del paquete npm `chelu-govoy`, identificador de Android e iOS **`com.govoy.chelu`**. Pendiente:
   - Icono y pantalla de arranque.
   - Cuenta EAS: ¿la misma que AppGovoy (`sanchez_andres`) o una de organización?
9. ~~**Entornos**~~ → **Decidido (D6):** el mismo backend que el resto de repositorios. Pendiente: ¿se mantiene el selector de backend en una pantalla de depuración como en AppGovoy?
10. ~~**Diseño**~~ → **Decidido (D7):** parecido al chat web, con modo oscuro desde el inicio.
10b. ~~**Mapas (D8)**~~ → **Decidido:** MapLibre con teselas de OSM, como en el chat web.

### C. Se pueden decidir más adelante

11. **Plataformas:** se estudia hacer también iOS (ver 3b). Falta decidir:
    - Si se hace.
    - Quién tramita la cuenta de Apple (D-U-N-S). **Si se hace, conviene empezar el trámite pronto.**
    - Qué iPhone se usa para probar.
    - Cómo se distribuye: TestFlight, App Store oculta o App Store pública.
12. **Distribución en Android:** ¿APK directo a los clientes, Google Play (pública o privada para empresas con Managed Google Play) o ambas?
13. **Privacidad y aviso de IA:** política de privacidad publicada (la exigen las dos tiendas) y aviso o consentimiento por enviar datos a OpenAI/DeepSeek. Revisar también que DeepSeek procese datos en China (D10).
14. **Monitorización de errores:** ¿Sentry u otro servicio? Recomendado desde la fase 1, sobre todo si hay iOS.
15. **Sin conexión:** ¿solo un aviso de "sin conexión" o también ver el historial guardado en el móvil?
16. **Extras:** ¿desbloqueo con huella o Face ID al abrir la app? ¿Idiomas además del español?
17. **Origen del chat:** ¿se marca en el back si una conversación se creó desde el móvil o desde la web? (Útil para métricas y feedback.)
18. **Rol en el back (aplazado, ver D9):** que `/chat-cex/*` compruebe que el rol es `administrador` o `jefeDeOperaciones`.
19. **Correos ya enviados entre dispositivos:** que el back marque qué borrador se envió, para que web y app lo vean igual y no se pueda reenviar. Propuesta en el progreso de la fase 4.
20. **Formato del cuerpo del correo:** que `cuerpo_a_html` del back convierta cursiva y subrayado, que hoy llegan con los símbolos visibles (web y app los ofrecen).
21. **Optimizaciones en segundo plano y notificación al terminar:** que la optimización siga y se guarde aunque se cambie de chat o se salga de la app, con push al terminar y el chat marcado con "!" en la lista. Propuesta en el progreso de la fase 4.

---

## Registro de decisiones

| Fecha | Decisión |
|---|---|
| 2026-10-02 | D1: login propio para móvil, con token y respuesta como la web más `refreshToken` en el cuerpo |
| 2026-10-02 | D2: arreglar la seguridad de los endpoints del chat en el backend |
| 2026-10-02 | D3: permisos por ID de empresa y, dentro de eso, por rol; el backend los calcula y los da en `/chat-cex/config` |
| 2026-10-02 | D3 (corregido): funciones por empresa como constantes en el código de la app, sin `/chat-cex/config`; en el back solo condiciones por ID, como hasta ahora. Solo el sufijo `-master`, que se cumple con `is_impersonation` y `is_master` |
| 2026-10-02 | D4: comprobado que `UsuarioID` (JWT y front) y `ClienteID` (back) son el mismo valor, `users.empresa_id` |
| 2026-10-02 | D5: mismo stack que AppGovoy en versiones actuales (último SDK de Expo, NativeWind actual) |
| 2026-10-02 | D6: mismo backend que el resto de repositorios, creando o adaptando endpoints según haga falta |
| 2026-10-02 | D7: diseño parecido al Chat Chelu web, con modo oscuro desde el inicio (paleta con nombres según su uso, claro y oscuro) |
| 2026-10-02 | D1: duración de tokens igual que la web; suplantación desde la app con `/impersonate-chat-movil` (6 h), con acceso del staff y vuelta a su sesión |
| 2026-10-02 | D1: suplantación escribiendo el nombre de usuario; cerrar sesión solo borra en el móvil (como AppGovoy y la web) |
| 2026-10-02 | D10: modelos como en la web, con `deepseek-v4-flash` por defecto y selector solo en sesiones master |
| 2026-10-02 | D9: mismos usuarios y credenciales que la web; misma regla de acceso que el menú web (empresa + rol administrador/jefeDeOperaciones) |
| 2026-10-02 | D8 (parcial): teselas de OSM como el chat web, con la URL en una sola constante; el mapa queda fuera del modo oscuro (solo el marco sigue el tema); `react-native-maps` descartado |
| 2026-10-05 | D7: la app arranca en modo claro por defecto (no sigue al sistema); paleta en `src/theme/palette.ts` |
| 2026-10-05 | D7: paleta clara revisada contra la web (colores propios del chat y, si no hay, el gris de Tailwind más usado); añadidos `exito-suave` y `aviso-suave` |
| 2026-10-05 | D5: `babel-preset-expo` declarado aparte (no queda en la raíz con el SDK 57), `expo-system-ui` instalado, `tailwindcss` en `dependencies` |
| 2026-10-05 | Repo `Mario-GOVOY/Chelu-Govoy`; código común de AppGovoy copiado y adaptado. Fase 1, pasos 1 y 2 hechos |
| 2026-10-05 | D6: URL del back en `src/auth/Constants.ts` (`API_URL`, `API_URL_DEV`, `API_URL_LOCAL`) en lugar de variables de entorno |
| 2026-10-05 | D1: endpoints de login móvil hechos en una rama local del back, con `typ: "refresh"`; la app los usa desde ya (con `API_URL_LOCAL` hasta que se suban) |
| 2026-10-05 | Login: se guardan usuario y contraseña en SecureStore (como AppGovoy); se conservan al cerrar sesión |
| 2026-10-05 | Login rediseñado para móvil (Chelu de la web arriba, hoja inferior, campos grandes con iconos y ojo); iconos con `lucide-react-native` |
| 2026-10-05 | `expo-dev-client` se mantiene; en móvil físico, Metro va por Wi-Fi (o `adb reverse tcp:8081`) |
| 2026-10-05 | D2 2.1: el equipo ha hecho que `get_chats` devuelva solo los chats propios (`c67f863`); `get_chat` (2.2) sigue pendiente |
| 2026-10-05 | Fase 1 cerrada en la app; EAS, icono, firma y Sentry se dejan para antes de la primera versión para clientes |
| 2026-10-05 | Fase 2: menú lateral con una sola pantalla `Chat` (parámetro `chatId`); lista de conversaciones con botón de recargar (sin deslizar) |
| 2026-10-05 | Fase 2: markdown con `react-native-marked` (hook `useMarkdown`); mensajes con cabecera de emisor como la web |
| 2026-10-05 | Fase 2: teclado con `KeyboardAvoidingView` (`padding`); `react-native-keyboard-controller` solo si hace falta en iOS |
| 2026-10-05 | Todas las llamadas usan `API_URL`, que apunta de momento al back local |
| 2026-10-06 | Fase 2: streaming con `expo/fetch`; tarjetas de herramientas y puntos de "escribiendo" como la web (lógica de etiquetas copiada de la web) |
| 2026-10-06 | Fase 2: tablas del markdown con renderer propio como la web; texto justificado descartado |
| 2026-10-06 | D7: modo oscuro más hacia negros y grises, azul solo en acentos, texto sin blanco puro |
| 2026-10-06 | Fase 2: duplicar conversación (menú y "desde aquí"), con confirmación; botón de actualizar en la cabecera del chat |
| 2026-10-06 | Fase 2: preguntas sugeridas (píldoras en la última respuesta) y ejemplos con icono en la bienvenida |
| 2026-10-06 | Fase 4: formulario de optimización de sectores en el chat (lanzar y ver el resultado), pero sin abrir la optimización en SmartZone |
| 2026-10-06 | Documentos: descarga con el navegador (`Linking.openURL` al enlace de `/archivo/{id}`), a la carpeta de descargas de cada sistema |
| 2026-10-06 | Documentos: siempre por `fileId` (sin el enlace del stream); en Android con `react-native-blob-util` y el `DownloadManager`, en iOS se mantiene el navegador (menú de compartir descartado) |
| 2026-10-06 | Fase 2: borrar conversación; "Archivos generados" solo de la conversación abierta y sin borrar (como capa, no `Modal`); tipos del chat en `src/types/Chat.ts` |
| 2026-10-06 | Fase 2 cerrada en la app (probada en Android); falta probar en iOS |
| 2026-10-06 | Fase 3: valoración de respuestas como la web (pulgares y hoja con motivo y nota) |
| 2026-10-07 | Fase 3: gráficas en nativo con `react-native-gifted-charts` (no ApexCharts en WebView), barras en filas en el chat y ampliada en horizontal |
| 2026-10-07 | Reanimated: `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` desactivada (el menú lateral se quedaba abierto) |
| 2026-10-07 | Chat sin sangría bajo las cabeceras; tablas con sombra en el lado que se desplaza y barra nativa siempre visible |
| 2026-10-07 | D8: MapLibre 11.5.0. En el chat solo tarjeta (y vista previa en imagen); el mapa interactivo a pantalla completa al pulsarla, uno a la vez |
| 2026-10-07 | D8: teselas de `tile.openstreetmap.org` sin subdominios, URL en `TILE_URL` (`Constants.ts`); User-Agent `CheluGovoy (com.govoy.chelu)`; atribución propia visible con enlace |
| 2026-10-07 | D8: vista previa por captura de un mapa oculto (idéntica a la pantalla completa), al final del plan de mapas |
| 2026-10-07 | Fase 3, mapas: bloques 1 a 3 hechos (datos y tarjeta, pantalla completa, capas y leyenda) |
| 2026-10-07 | Mapas, bloque 4: todos los puntos como iconos en una capa `symbol`; números y formas generados con `react-native-svg` a PNG (densidad de pantalla, caché en RAM de 3000), PNG de la web para depósito y pines; `icon-size` 0,8 |
| 2026-10-07 | Mapas: pantalla de carga con `ActivityIndicator` (el pin animado con Reanimated se paraba al generar iconos en el hilo de UI); mapa montado tras la animación de entrada; topes de 3 s y 10 s |
| 2026-10-07 | Mapas, bloque 5: rutas por calles con `/directionsForMap2-todas-las-rutas`, grosor 2; si una ruta falla no se dibuja; espera máxima de 5 s |
| 2026-10-07 | Descartados de momento: módulo nativo para generar iconos fuera del hilo de UI y caché de iconos en disco |
| 2026-10-08 | Mapas: tandas de iconos de 100, pasadas al mapa al terminar cada una; la carga se quita en el segundo aviso de pintado; tope de 10 s desde el primer pintado completo, reiniciado por tanda |
| 2026-10-08 | Mapas: leyenda con scroll (máx. 144 px) en pantalla completa y 8 capas como mucho en la tarjeta |
| 2026-10-08 | Menú lateral: la lista ya no se recarga al abrirlo (solo si falta el chat abierto); filas memorizadas; `@shopify/flash-list` 2.0.2 (MIT) en la lista de conversaciones; un único `Intl.DateTimeFormat` para las fechas |
| 2026-10-08 | Vista previa de mapas (bloque 6) aparcada hasta nuevo aviso |
| 2026-10-08 | Tarjeta de mapa: botón "Ver mapa" centrado en lugar del icono de expandir, con indicador de carga al abrir (navegación en el siguiente fotograma) |
| 2026-10-08 | Fase 4: todo lo interactivo del chat completo (correo, formulario de sectores, resultado, comparativa); fuera el chat lateral de simulación. Notas de voz aparcadas |
| 2026-10-08 | Fase 4: formulario de sectores con tarjeta en el chat y edición en pantalla completa; correo con `react-native-enriched-html` 1.1.1 (MIT); "ya enviado" en AsyncStorage; resultado y comparativa sin botón de abrir, con nota "desde la web"; comparativa en tarjetas |
| 2026-10-08 | Fase 4: bloques 1 (datos y eventos) y 2 (tarjetas de resultado y comparativa) hechos |
| 2026-10-08 | Fase 4: `EmailDraft` renombrado a `BorradorCorreo`; bloque 3 dividido en 3a/3b/3c; 3a (envío y registro de enviados) hecho; `react-native-enriched-html` 1.1.1 instalada |
| 2026-10-08 | Fase 4: bloque 3 hecho (tarjeta del borrador y editor con formato); una tarjeta por borrador, como la web; "ya enviado" entre dispositivos queda como propuesta para el equipo (back) |
| 2026-10-08 | Chelu: el SVG se sustituye por el PNG de referencia (`assets/chelu.png`); flotar del login con `withRepeat` en sentido inverso (daba un salto al repetir) |
| 2026-10-09 | Fase 4, bloque 4b-1: formularios del historial atenuados y sin selector de mapa hasta "Volver a cargar" |
| 2026-10-09 | Fase 4, bloque 4b-2: edición del formulario como capa a pantalla completa en `ChatScreen` (no pantalla del stack); el selector de mapa se queda en la tarjeta; zona "Mapa entero" / "Por CP" con recálculo de zona y flota |
| 2026-10-09 | Fase 4: "Volver a cargar" también sin mapa (formulario sin elegir); su carga va en el botón. Bloque 4b-3: zona por proveedor |
| 2026-10-09 | Estilo: legibilidad primero; `async`/`await` con `try`/`catch` en lugar de `.then().catch()`, cambiando las cadenas existentes al tocar cada archivo |
