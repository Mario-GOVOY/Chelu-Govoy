// Genera src/licenses/androidLicenses.json con las librerías nativas que entran en la APK de release.
// La lista y sus licencias salen de AboutLibraries, aplicado solo en esta ejecución (aboutlibraries.init.gradle).
// AboutLibraries trae MIT y BSD como plantilla, sin el copyright: esas librerías usan el LICENSE de su proyecto (texts/).
// Añade lo de manualLibraries.json que va en Android.
// Uso: npm run licenses:android, con android/ generado (prebuild).
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const ANDROID_DIRECTORY = path.join(PROJECT_ROOT, 'android');
const TEXTS_DIRECTORY = path.join(__dirname, 'texts');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'src/licenses/androidLicenses.json');

// Texto de cada librería por id ("grupo:artefacto") o por grupo. Al añadir una librería que no sea Apache-2.0, va aquí.
const TEXT_FILE_BY_LIBRARY = {
    'androidx.datastore:datastore-preferences-external-protobuf': 'protobuf',
    'com.facebook.fresco': 'fresco',
    'com.facebook.hermes': 'hermes',
    'com.facebook.infer.annotation': 'infer-annotation',
    'com.facebook.react': 'react-native',
    'com.facebook.yoga': 'yoga',
    'com.parse.bolts': 'bolts-android',
    'expo.modules.asset': 'expo',
    'expo.modules.audio': 'expo',
    'expo.modules.webview': 'expo',
    'host.exp.exponent': 'expo',
    'io.github.lukmccall.pika': 'pika',
    'org.brotli': 'brotli',
    'org.maplibre.gl:android-plugin-annotation-v9': 'maplibre-plugins-android',
    'org.maplibre.gl:android-plugin-scalebar-v9': 'maplibre-plugins-android',
    'org.maplibre.gl:android-sdk-opengl': 'maplibre-native',
    'org.maplibre.gl:maplibre-android-gestures': 'maplibre-gestures-android',
};
// Licencias cuyo texto vale igual para todas sus librerías.
const TEXT_FILE_BY_LICENSE = { 'Apache-2.0': 'Apache-2.0', ASDKL: 'ASDKL' };
// NOTICE que traen dentro del .jar (Apache-2.0 obliga a mostrarlo). Al añadir una librería que lo traiga, va aquí.
const NOTICE_FILE_BY_LIBRARY = {
    'com.squareup.okhttp3:okhttp': 'okhttp-notice',
    'commons-codec:commons-codec': 'commons-codec-notice',
    'commons-io:commons-io': 'commons-io-notice',
    'org.apache.commons:commons-lang3': 'commons-lang3-notice',
};

const exportAboutLibraries = (outputFile) => {
    const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';
    const initScript = path.join(__dirname, 'aboutlibraries.init.gradle');
    execSync(
        `${gradlew} --init-script "${initScript}" :app:exportLibraryDefinitions -PaboutLibraries.exportVariant=release "-PaboutLibraries.outputFile=${outputFile}" -q`,
        { cwd: ANDROID_DIRECTORY, stdio: ['ignore', 'ignore', 'inherit'] },
    );
    return JSON.parse(fs.readFileSync(outputFile, 'utf8'));
};

const texts = {};
const loadText = (fileName) => {
    texts[fileName] ??= fs.readFileSync(path.join(TEXTS_DIRECTORY, `${fileName}.txt`), 'utf8').trim();
    return fileName;
};

// Id del texto en `texts`, o null si no hay.
const getTextId = (uniqueId, licenseKeys) => {
    const group = uniqueId.split(':')[0];
    const fileName =
        TEXT_FILE_BY_LIBRARY[uniqueId] ??
        TEXT_FILE_BY_LIBRARY[group] ??
        (licenseKeys.length === 1 ? TEXT_FILE_BY_LICENSE[licenseKeys[0]] : undefined);
    return fileName ? loadText(fileName) : null;
};

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'chelu-licenses-'));
try {
    const aboutLibraries = exportAboutLibraries(path.join(temporaryDirectory, 'aboutlibraries.json'));

    const libraries = [];
    for (const library of aboutLibraries.libraries) {
        const licenseNames = library.licenses.map((key) => aboutLibraries.licenses[key]?.spdxId ?? aboutLibraries.licenses[key]?.name ?? key);
        libraries.push({
            id: library.uniqueId,
            name: library.name,
            version: library.artifactVersion,
            license: licenseNames.join(' OR '),
            url: library.website ?? library.scm?.url ?? null,
            textId: getTextId(library.uniqueId, library.licenses),
            noticeId: NOTICE_FILE_BY_LIBRARY[library.uniqueId] ? loadText(NOTICE_FILE_BY_LIBRARY[library.uniqueId]) : null,
        });
    }
    // Lo que no sale en Gradle: código de terceros dentro de las .so, módulos nativos de Expo, pines y OpenStreetMap.
    const manualLibraries = JSON.parse(fs.readFileSync(path.join(__dirname, 'manualLibraries.json'), 'utf8'));
    for (const { platforms, textFile, ...library } of manualLibraries) {
        if (!platforms.includes('android')) continue;
        libraries.push({ ...library, version: null, textId: loadText(textFile), noticeId: null });
    }
    libraries.sort((first, second) => first.id.localeCompare(second.id));

    fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify({ texts, libraries }, null, 2)}\n`);
    console.log(`${libraries.length} librerías y ${Object.keys(texts).length} textos en ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);

    const withoutText = libraries.filter((library) => !library.textId);
    if (withoutText.length > 0) {
        console.log('Sin texto (añadir su LICENSE a scripts/licenses/texts y a TEXT_FILE_BY_LIBRARY):');
        for (const library of withoutText) console.log(`  ${library.id}@${library.version} (${library.license})`);
    }
} finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
