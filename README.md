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

   Para repartirlos se pueden copiar con otro nombre (p. ej. `Chelu-Govoy-1.0.0.apk`): la firma va dentro, no en el nombre. Mejor copiarlos fuera que renombrarlos ahí, porque cada build vuelve a generar `app-release.*`.

Instalar el APK en el móvil conectado:

```powershell
adb install -r android\app\build\outputs\apk\release\app-release.apk
```

Si un build falla por restos de uno anterior: `cd android; .\gradlew.bat clean; cd ..` y volver a compilar.

### Firma de release

El plugin `plugins/withReleaseSigning.js` (registrado en `app.json`) hace que, en cada `prebuild`, el release se firme con la clave de Chelu: `chelu-release.jks`, alias `chelu-key`, con `CN=Govoy, OU=Govoy, O=Govoy, L=Lorca, ST=Murcia, C=ES`.

**Para desarrollar y probar no hace falta la clave.** Sin ella, el release se firma con la clave de debug de cada PC (`android/app/debug.keystore`) y Gradle avisa con "Chelu: sin CHELU_UPLOAD_STORE_FILE…". Vale para instalar el APK a mano, pero **Google Play no admite un AAB firmado así**, y un APK firmado en un PC no se instala encima de otro firmado en otro PC.

**Para sacar una versión que se reparta hace falta la clave**, y tiene que ser **ese mismo `.jks`**: Android solo instala una actualización firmada con la misma clave que la instalada. **No la vuelvas a crear con `keytool`**: saldría otra distinta aunque se pongan los mismos datos. El `.jks` y su contraseña están en el gestor de contraseñas del equipo; se pasan por ahí, nunca por el repo ni por chat. `.gitignore` ya excluye `*.keystore`, `*.jks` y `credentials.json`.

Configurarla en un PC (una vez):

1. Guarda el `.jks` fuera del repo, por ejemplo en `C:\Users\<usuario>\keys\chelu-release.jks`.

2. Crea `C:\Users\<usuario>\.gradle\gradle.properties` (la carpeta `.gradle`, con el punto, puede existir ya; el fichero sin `.txt` al final) con:

   ```properties
   CHELU_UPLOAD_STORE_FILE=C:/Users/<usuario>/keys/chelu-release.jks
   CHELU_UPLOAD_KEY_ALIAS=chelu-key
   CHELU_UPLOAD_STORE_PASSWORD=<contraseña>
   CHELU_UPLOAD_KEY_PASSWORD=<contraseña>
   ```

   - La ruta, con barras `/`: con `\` Gradle la lee mal.
   - Las dos contraseñas son la misma (el formato PKCS12 solo admite una).
   - Ese fichero es común a todos los proyectos de Gradle del PC; el prefijo `CHELU_` evita chocar con otros (AppGovoy usa `MYAPP_UPLOAD_*`).

3. Regenera y compila como arriba (`npx expo prebuild --platform android` y `.\gradlew.bat assembleRelease`). No debe salir el aviso de la clave de debug.

4. Comprueba con qué clave salió el APK (solo lee el APK, no cambia nada; la versión de `build-tools` puede ser otra):

   ```powershell
   & "$env:LOCALAPPDATA\Android\Sdk\build-tools\36.1.0\apksigner.bat" verify --verbose --print-certs android\app\build\outputs\apk\release\app-release.apk
   ```

   Tiene que salir `Verifies` y `Signer #1 certificate DN: CN=Govoy, ... L=Lorca ...`, con `Signer #1 certificate SHA-256 digest: 6cf8c506ffee84f0edfa94bb43d5b5871c1d9de7361e206838c4b7a2ee189c80`. Que solo salga `v2 scheme ... true` es lo normal (v1 solo hace falta para Android anterior al 7). Si sale `CN=Android Debug`, Gradle no está leyendo `gradle.properties`: revisa el nombre del fichero y la ruta. `keytool -printcert -jarfile` no sirve aquí: solo entiende la firma antigua (v1) y con esta app dice "No es un archivo jar firmado" aunque esté firmado.

5. Si el móvil tiene una versión firmada con otra clave (la de debug), Android no deja instalar encima: `adb uninstall com.govoy.chelu` y luego `adb install`. Se pierde la sesión guardada. Pasa solo al cambiar de clave.

### Versión nueva

Pasos para cada APK o AAB que se reparta:

1. **Back subido.** Si la versión usa endpoints o campos nuevos del back, tienen que estar en producción antes de repartirla.

2. **La app apunta a producción.**
   - En `src/auth/Constants.ts`, `API_URL = 'https://api.govoy.es/'`.
   - Ninguna llamada a `API_URL_LOCAL` en `src` (`git grep API_URL_LOCAL src` solo debe encontrar su definición en `Constants.ts`). En release ya va a `API_URL`, pero así se prueba lo mismo que se reparte.

3. **Número de versión en `app.json`:**
   - `version`: la que ve el usuario (`1.0.0` → `1.0.1` para arreglos, `1.1.0` para funciones nuevas).
   - `android.versionCode`: entero que sube en 1 en cada APK o AAB que se reparta. Google Play y los MDM (Managed Google Play) solo aceptan la actualización si es mayor que el anterior. Con un APK a mano no es obligatorio (Android deja instalar encima uno con el mismo número; solo rechaza uno menor), pero subiéndolo siempre un APK antiguo abierto por error no se instala encima del nuevo.

   No se cambian en `android/app/build.gradle`: el prebuild los pisa.

4. **Regenerar y compilar** con la clave de Chelu (ver "Firma de release"):

   ```powershell
   npx expo prebuild --platform android
   cd android
   .\gradlew.bat assembleRelease
   cd ..
   ```

   Comprueba con `apksigner` que salió firmado con `CN=Govoy` y no con la clave de debug.

5. **Probar encima de la versión anterior** (`adb install -r …`, sin desinstalar), contra producción: que se conserve la sesión, enviar una pregunta, pararla y que llegue la notificación con la app en segundo plano.

6. **Repartir** una copia con la versión en el nombre (p. ej. `Chelu-Govoy-1.0.1.apk`).

7. **Commitear** el `app.json` con la versión nueva.

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
