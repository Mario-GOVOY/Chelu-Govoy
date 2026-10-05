# App móvil Chat Chelu — Definición del proyecto

> Documento vivo: se actualiza a medida que se toman decisiones.
> Última actualización: 2026-10-05

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
| PUT | `/chat-cex/feedback` | Sí (fase 3) |
| POST | `/chat-cex/transcribir` | Sí, notas de voz (fase 3) |
| GET | `/chat-cex/archivo/{file_id}` | Sí, descarga de documentos generados |
| POST | `/chat-cex/correo/enviar` | Fase 4 |
| GET | `/chat-cex/optimizacion/{id}`, POST `/resumen-optimizacion`, GET `/formulario-sectores` | Fase 4 / probablemente no |
| GET | `/chat-cex/syncronize_data` | No (migración puntual de la web) |

Eventos del stream: `session, delta, tool, progreso, sugerencias, done, error, documento, grafica, mapa, sql, sectores, comparativa, correo_borrador, formulario_sectores, acciones_editor, carga_simulacion, orden_optimizacion`.

- **Fases 2–3:** `session`, `delta`, `tool`/`progreso`, `sugerencias`, `done`, `error`, `documento`, `grafica`, `mapa`.
- **Fase 4:** `correo_borrador`, `sectores`, `comparativa`.
- **No aplican:** los eventos del panel de simulación (`acciones_editor`, `carga_simulacion`, `orden_optimizacion`, `formulario_sectores`) y `contexto_pantalla`.

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
| `@maplibre/maplibre-react-native` (fase 3, si se elige) | 11.4.1 | OK | Pide expo ≥54, RN ≥0.80 y React ≥19.1. Necesita build de desarrollo |
| **`react-native-markdown-display`** | 7.0.2 (dic. 2023) | **DESCARTADA** | Sin mantenimiento desde 2023. Alternativas para la fase 2: `react-native-marked` (8.3.2, JS, tablas, mantenida), `react-native-enriched-markdown` (1.1.0, de Software Mansion, nativa, necesita build de desarrollo) o el fork `@ronradtke/react-native-markdown-display` (9.0.3) |
| `jwt-decode` | 4.0.0 | No hace falta por ahora | La respuesta del login ya trae todos los datos de la sesión |
| `lucide-react-native` | 1.52 | OK | Admite React 19 y `react-native-svg` 12–15 (el SDK fija la 15.15) |

### D6. Mismo backend que el resto de repositorios

- La app usa el mismo backend (`Back-Govoy`) y los mismos entornos que la web y AppGovoy. Se crean o adaptan endpoints según haga falta.
- **Las URL van en `src/auth/Constants.ts`, como en AppGovoy** (decidido el 2026-10-05, en lugar de `EXPO_PUBLIC_API_URL`): `API_URL` (la que usa la app, por defecto `https://api.govoy.es/`), `API_URL_DEV` (`https://developer.govoy.es/`) y `API_URL_LOCAL` (`http://127.0.0.1:8000/`, con `connectback`). Para cambiar de back se edita la línea de `API_URL`.

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
  - La paleta está en `src/theme/palette.ts` (claro y oscuro, en hexadecimal). `ThemeProvider` la convierte en variables con `vars()`, y `useColores()` la da en hexadecimal para lo que no admite clases: navegación, barra de estado, iconos, ApexCharts y mapas. Los nombres se repiten en `tailwind.config.js` y tienen que coincidir.
  - **Por defecto la app arranca en claro**, aunque el sistema esté en oscuro (`colorScheme.set('light')`). Más adelante, opción en ajustes para elegir claro u oscuro (guardado en AsyncStorage). `userInterfaceStyle: "automatic"` en `app.json`, necesario para poder cambiarlo desde la app.
  - **Norma:** no se escriben colores a mano en los componentes.
- **Requieren atención especial:**
  - Los estilos del markdown.
  - ApexCharts en el WebView (`theme.mode`).
  - Los mapas: **quedan fuera del modo oscuro**, solo el marco sigue el tema (ver D8).
  - La pantalla de arranque oscura.

### D8. Librería de mapas (pendiente de decidir)

En la web, el mapa del chat usa OpenStreetMap estándar (`ChatMapCard.tsx:42`) y otras pantallas usan Carto `light_all` (`DispatchManagement.tsx:1067`).

| Opción | Pros | Contras |
|---|---|---|
| **A. MapLibre** (`@maplibre/maplibre-react-native`) con teselas abiertas | Igual en Android e iOS. No depende de Google ni de Apple y no necesita clave. Dibuja bien los polígonos GeoJSON. Modo oscuro cambiando la fuente de teselas | Librería nueva para el equipo. Necesita build de desarrollo (no Expo Go) |
| B. Leaflet en un WebView | Reutiliza `ChatMapCard` de la web, con el mismo aspecto | Rendimiento y gestos peores. Varios WebView en una conversación larga pesan |
| C. `react-native-maps` (Google/Apple) | Ya lo conoce el equipo | En Android necesita clave y **estilo JSON propio para el modo oscuro** (Apple Maps se adapta solo). Se ve distinto en cada plataforma |

- **Teselas (decidido):** **las mismas que el chat web**, OpenStreetMap estándar (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
  - El volumen previsto (mapas puntuales en el chat, pocos usuarios) entra en el uso ligero que permite OSM.
  - **Condiciones:**
    - User-Agent propio de la app (p. ej. `GovoyChelu/<versión>`).
    - En WebView, una URL base (`baseUrl`) para que las peticiones tengan origen.
    - Atribución "© OpenStreetMap contributors" visible.
    - Sin descargas masivas para uso sin conexión.
  - **Modo oscuro (decidido): el mapa queda fuera.** Las teselas se ven siempre claras, como en la web, y los colores de polígonos se eligen para fondo claro.
    - El marco del mapa sí sigue el tema: tarjeta, cabecera, leyenda, tooltips, botones y pantalla completa.
    - Opcional más adelante: atenuar el mapa al ~85–90 % de brillo en modo oscuro para que no deslumbre (CSS en B, `raster-brightness-max` en A).
    - (Descartado: oscurecer OSM con filtros.)
  - **C queda descartada** (las teselas abiertas se pintan por encima del mapa de Google o Apple y siguen necesitando el SDK de Google).
  - **La URL de teselas va en una sola constante o variable de entorno** (`EXPO_PUBLIC_TILE_URL`), para cambiar de proveedor en una línea si hace falta. En la web ahora está repetida en `ChatMapCard.tsx`, `MapLayers.tsx` y `DispatchManagement.tsx`.
- **En espera:** elegir entre A (MapLibre) y B (Leaflet en WebView). Se decidirá antes de la fase 3.
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
- **Markdown:** `react-native-marked` o `react-native-enriched-markdown` (se decide en la fase 2; `react-native-markdown-display` está sin mantenimiento, ver D5), con las tablas dentro de un scroll horizontal.
- **Gráficas:** el back envía configuraciones de ApexCharts. Se muestran con ApexCharts dentro de un WebView, sin cambios en el back.
- **Mapas:** pintando la geometría GeoJSON; la librería está pendiente (ver D8).
- **Voz:** grabación en m4a con `expo-audio` y envío a `/transcribir`, que ya acepta m4a y mp4.
- **Documentos:** `/archivo/{id}` devuelve un enlace temporal de S3; se abre con `expo-sharing` o el navegador.

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
| **2. Versión mínima** | Chat con streaming, markdown, sugerencias, botón de parar, lista de conversaciones (nueva y borrar) y descarga de documentos |
| **3. Contenido enriquecido** | Gráficas, mapas, valoración y notas de voz |
| **4. Más adelante** | Borradores de correo, optimización de sectores y push |

**Fuera de alcance:** el panel de simulación.

### Progreso de la fase 1

La fase 0 (back) está **parada** hasta hablarla con el equipo. La fase 1 avanza en paralelo.

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

**Pendiente en el login (propuesto, sin decidir):**
- Guardar las credenciales solo cuando se entra de verdad: ahora se guardan en cuanto el back acepta el login, antes de comprobar `puedeUsarChat`, así que se guardan aunque la app no le deje entrar (empresa 100 o rol sin acceso).
- Unificar el mensaje de "sin acceso": el back dice "La empresa no tiene Chat Chelu" y la app "Tu usuario no tiene acceso a Chat Chelu.".
- Cerrar la sesión al momento si una petición da 403 con `detail: "EMPRESA_INACTIVA"` (ahora se cierra en la siguiente renovación, hasta 1 h después). El resto de 403 no deben cerrarla.
- Empresa desactivada: se muestra "Usuario o contraseña incorrectos." (decidido así para no dar pistas).
- Quitar el bloque `"web"` de `app.json`, que apunta a `favicon.png`, ya borrado.

**Cómo funciona la sesión en la app:**
- Solo se guardan en SecureStore los tokens de renovación, en dos ranuras: `usuario` (la sesión con chat, normal o suplantada) y `staff` (la propia del staff, para volver al salir de suplantación). El de acceso vive en memoria.
- Al abrir la app se renuevan las sesiones guardadas. Sin conexión se muestra "No se pudo conectar" con botón de reintentar.
- Login: staff sin suplantar → pantalla de suplantar; usuario que no cumple la regla de acceso (D9) → error, no se guarda nada; resto → inicio.
- Suplantar: se renueva antes el token del staff (puede llevar más de una hora parado) y se comprueba la regla de acceso del usuario suplantado.
- `authFetch`: si una petición da 401, renueva el token y reintenta una vez. Si la renovación da 401/403, la sesión caduca: en suplantación se vuelve a la pantalla de suplantar; si no, al login. **A diferencia de AppGovoy, un 403 en una petición normal no cierra la sesión**, porque en el chat también significa "no puedes tocar este chat".
- Se guardan el usuario y la contraseña del último login (en SecureStore, como AppGovoy) para rellenar los campos. Se conservan al cerrar sesión.

**Diferencias con lo previsto en la fase 0:**
- El token de renovación lleva `typ: "refresh"` (la propuesta pendiente); los de acceso no. `/refresh-token-chat-movil` solo acepta los de renovación e `/impersonate-chat-movil` los rechaza.
- En suplantación, el token de acceso dura lo normal (1 h) y el de renovación 6 h, en lugar de los dos 6 h: la sesión de soporte sigue teniendo el tope de 6 h.
- Los tres endpoints devuelven el mismo body (el de la web más `refreshToken`, `is_impersonation` e `impersonated_by`).
- El body incluye `zoom` (y `CorreoElectronico`) por ser igual que el de la web, pero **no hay planes de usar `zoom` en la app**: `sesionDesdeBody` no lo lee.
- Ojo: un token de renovación sigue valiendo como token de acceso en el resto de endpoints (`validar_token` ignora `typ`). Cerrarlo exigiría tocar `auth.py`, que usan todos; queda para hablarlo con el equipo.

Estructura de carpetas: como AppGovoy, código en `src/` (`auth/`, `components/`, `constants/`, `context/`, `hooks/`, `navigation/`, `screens/`, `theme/`, `types/`, `utils/`). En la raíz solo `App.tsx`, `index.ts` y los archivos de configuración.

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
10b. **Mapas (D8):** teselas de OSM, como en el chat web (decidido). **En espera:** la elección entre MapLibre y Leaflet en WebView. No bloquea, porque los mapas van en la fase 3.

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
