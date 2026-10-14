# Chat Chelu Móvil

App móvil (Android e iOS) del Chat Chelu de Govoy. Expo SDK 57, React Native 0.86, TypeScript, NativeWind y React Navigation. Usa el mismo back que la web (`Back-Govoy`).

El plan del proyecto, las decisiones y lo que queda pendiente están en [`PLAN_APP_CHAT_CHELU.md`](PLAN_APP_CHAT_CHELU.md).

## Requisitos

- **Node.js** 20 o posterior (se desarrolla con la 24) y npm.
- **JDK 17** (`java -version`).
- **Android Studio** con el SDK de Android, y las variables `ANDROID_HOME` (normalmente `%LOCALAPPDATA%\Android\Sdk`) y `platform-tools` en el `PATH` (para `adb`).
- Un móvil Android con la depuración USB activada, o un emulador.
- iOS: hace falta un Mac con Xcode o compilar en la nube con EAS (ver el plan, sección 3b).

## Clonar en una ruta corta (Windows)

Clona el proyecto en una ruta corta, por ejemplo `C:\Chelu-Govoy`, **no** en el escritorio ni en carpetas con rutas largas:

```powershell
cd C:\
git clone https://github.com/Mario-GOVOY/Chelu-Govoy.git
cd C:\Chelu-Govoy
```

Al compilar para `armeabi-v7a`, el código nativo de `react-native-enriched-html` genera rutas de más de 260 caracteres y ninja falla con *"Filename longer than 260 characters"*. Activar las rutas largas de Windows no lo arregla (ninja no las admite); la solución es la ruta corta.

Si Windows no deja mover o borrar la carpeta porque "la está usando otro proceso", para Gradle y adb antes:

```powershell
cd C:\Chelu-Govoy\android; .\gradlew.bat --stop; cd ..
adb kill-server
```

## Instalar dependencias

```powershell
npm install
```

Salen avisos `ERESOLVE` y vulnerabilidades de `npm audit` de las dependencias de web de `react-native-enriched-html` (`@tiptap/*`, `dompurify`). No entran en la app y se pueden ignorar.

Para añadir una librería, usa `npx expo install <paquete>` (elige la versión compatible con el SDK). Si tiene código nativo, hay que volver a compilar la app.

## Generar la carpeta `android/`

`android/` (e `ios/`) no se suben al repo: se generan a partir de `app.json` y sus plugins.

```powershell
npx expo prebuild --platform android
```

Hay que repetirlo después de cambiar `app.json`, añadir un plugin o una librería nativa. Si algo se queda raro, `npx expo prebuild --platform android --clean` borra la carpeta y la vuelve a crear.

## Desarrollar

La app se desarrolla con un build de desarrollo (`expo-dev-client`), no con Expo Go.

**Compilar e instalar el build de desarrollo** (la primera vez y cada vez que cambie algo nativo):

```powershell
# En el móvil conectado por USB (pregunta cuál si hay varios)
npx expo run:android --device

# En el emulador o el único dispositivo conectado
npx expo run:android
```

**Arrancar Metro** (cuando la app ya está instalada y solo cambias JavaScript):

```powershell
npx expo start
```

En un móvil físico, la app descarga el JavaScript de Metro por la Wi-Fi (`http://<IP del PC>:8081`): el móvil y el PC tienen que estar en la misma red y el firewall tiene que dejar pasar a Node. Si Expo coge la IP de un adaptador virtual, fuérzala:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = '192.168.1.50'   # la IP del PC en la Wi-Fi
npx expo start
```

O por cable, sin Wi-Fi:

```powershell
adb reverse tcp:8081 tcp:8081
```

**Comprobar los tipos:**

```powershell
npx tsc --noEmit
```

### Back

Las URL están en [`src/auth/Constants.ts`](src/auth/Constants.ts):

| Constante | URL |
|---|---|
| `API_URL` | `https://api.govoy.es/` (producción) |
| `API_URL_DEV` | `https://developer.govoy.es/` |
| `API_URL_LOCAL` | `http://127.0.0.1:8000/` en desarrollo; en release vale lo mismo que `API_URL`, para que un build no salga apuntando a local por error |

Para probar contra el back en local (`Back-Govoy` arrancado en el puerto 8000), usa `API_URL_LOCAL` en las llamadas que quieras probar y redirige el puerto del móvil al PC, para que `127.0.0.1:8000` en el móvil llegue al back del PC (atajo `connectback`, ver abajo):

```powershell
adb reverse tcp:8000 tcp:8000
```

`adb reverse` se pierde al desconectar el cable o reiniciar adb: hay que repetirlo.

## Generar el APK y el AAB (Android, release)

Los builds de release llevan el JavaScript dentro: no necesitan Metro ni el PC.

1. Regenera `android/` para que recoja los últimos cambios de `app.json`:

   ```powershell
   npx expo prebuild --platform android
   ```

2. Compila:

   ```powershell
   cd android

   # APK (para instalar directamente en un móvil)
   .\gradlew.bat assembleRelease

   # AAB (para subir a Google Play)
   .\gradlew.bat bundleRelease

   cd ..
   ```

   Para un APK de prueba más rápido, solo para móviles de 64 bits: `.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a`.

3. Los archivos quedan en:

   - APK: `android\app\build\outputs\apk\release\app-release.apk`
   - AAB: `android\app\build\outputs\bundle\release\app-release.aab`

Instalar el APK en el móvil conectado:

```powershell
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

Si un build falla por restos de uno anterior: `cd android; .\gradlew.bat clean; cd ..` y volver a compilar.

**Firma:** de momento `prebuild` firma el release con la clave de debug (`android/app/debug.keystore`). Vale para instalar el APK a mano, pero **Google Play no admite un AAB firmado así**. Antes de la primera distribución hay que configurar la clave de release (plugin de configuración o EAS Build; ver el plan, D5). No subas keystores ni contraseñas al repo: `.gitignore` ya excluye `*.keystore`, `*.jks` y `credentials.json`.

**Versión:** antes de publicar una versión nueva, sube `expo.version` en `app.json` (y el `versionCode` de Android cuando se configure).

## Atajos (opcional)

Funciones de PowerShell que se pueden añadir al perfil (`notepad $PROFILE`) para no escribir los comandos enteros. Se ejecutan desde la raíz del proyecto:

```powershell
function runapp       { npx expo run:android }
function runappdevice { npx expo run:android --device }
function connectback  { adb reverse tcp:8000 tcp:8000 }
function generateapk  { Push-Location .\android; .\gradlew.bat assembleRelease; Pop-Location }
function generateaab  { Push-Location .\android; .\gradlew.bat bundleRelease; Pop-Location }
```

`generateapk` y `generateaab` no ejecutan `prebuild`: hazlo antes si ha cambiado `app.json` o alguna librería nativa.
