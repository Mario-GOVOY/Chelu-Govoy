// Genera src/licenses/jsLicenses.json con los paquetes de node_modules que entran en la app.
// Saca la lista del source map del bundle de Android, así que no cuenta las herramientas de compilación.
// Uso: npm run licenses:js (antes de cada versión).
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'src/licenses/jsLicenses.json');
const TEXTS_DIRECTORY = path.join(__dirname, 'texts');
const LICENSE_FILE_PATTERN = /^(licen[cs]e|copying)/i;
// Paquetes que no traen LICENSE: el de su repositorio, en texts/. Al añadir uno, va aquí.
const TEXT_FILE_BY_PACKAGE = {
    '@jsamr/counter-style': 'react-native-li',
    '@jsamr/react-native-li': 'react-native-li',
    '@react-native/assets-registry': 'react-native',
    '@react-native/js-polyfills': 'react-native',
    '@react-native/normalize-colors': 'react-native',
    '@react-native/virtualized-lists': 'react-native',
    'gifted-charts-core': 'gifted-charts',
    'metro-runtime': 'react-native',
    'svg-parser': 'svg-parser',
};
const NOTICE_FILE_PATTERN = /^notice/i;

const findSourceMaps = (directory) => {
    const found = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) found.push(...findSourceMaps(fullPath));
        else if (entry.name.endsWith('.map')) found.push(fullPath);
    }
    return found;
};

// ".../node_modules/a/node_modules/@b/c/lib/x.js" -> "node_modules/a/node_modules/@b/c"
const getPackageDirectory = (source) => {
    const normalized = source.replace(/\\/g, '/');
    const marker = 'node_modules/';
    const lastIndex = normalized.lastIndexOf(marker);
    if (lastIndex < 0) return null;
    const firstIndex = normalized.indexOf(marker);
    const nameParts = normalized.slice(lastIndex + marker.length).split('/');
    const packageName = nameParts[0].startsWith('@') ? `${nameParts[0]}/${nameParts[1]}` : nameParts[0];
    return normalized.slice(firstIndex, lastIndex + marker.length) + packageName;
};

const getLicenseName = (manifest) => {
    if (typeof manifest.license === 'string') return manifest.license;
    if (manifest.license?.type) return manifest.license.type;
    if (Array.isArray(manifest.licenses)) return manifest.licenses.map((license) => license.type).join(' OR ');
    return null;
};

const getRepositoryUrl = (manifest) => {
    const repository = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
    if (!repository) return manifest.homepage ?? null;
    return repository
        .replace(/^git\+/, '')
        .replace(/\.git$/, '')
        .replace(/^git:\/\//, 'https://')
        .replace(/^ssh:\/\/git@/, 'https://')
        .replace(/^git@([^:]+):/, 'https://$1/')
        .replace(/^github:/, 'https://github.com/')
        .replace(/^([\w-]+\/[\w.-]+)$/, 'https://github.com/$1');
};

const readFirstFile = (directory, files, pattern) => {
    const fileName = files.find((name) => pattern.test(name));
    return fileName ? fs.readFileSync(path.join(directory, fileName), 'utf8').trim() : null;
};

const readTextFile = (fileName) => (fileName ? fs.readFileSync(path.join(TEXTS_DIRECTORY, `${fileName}.txt`), 'utf8').trim() : null);

const exportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'chelu-licenses-'));
try {
    execSync(`npx expo export --platform android --source-maps --output-dir "${exportDirectory}"`, {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
    });

    const packageDirectories = new Set();
    for (const sourceMapFile of findSourceMaps(exportDirectory)) {
        const sourceMap = JSON.parse(fs.readFileSync(sourceMapFile, 'utf8'));
        for (const source of sourceMap.sources) {
            const packageDirectory = getPackageDirectory(source);
            if (packageDirectory) packageDirectories.add(packageDirectory);
        }
    }

    const licenses = [];
    for (const packageDirectory of packageDirectories) {
        const absoluteDirectory = path.join(PROJECT_ROOT, packageDirectory);
        const manifest = JSON.parse(fs.readFileSync(path.join(absoluteDirectory, 'package.json'), 'utf8'));
        const files = fs.readdirSync(absoluteDirectory);
        licenses.push({
            name: manifest.name,
            version: manifest.version,
            license: getLicenseName(manifest),
            url: getRepositoryUrl(manifest),
            licenseText: readFirstFile(absoluteDirectory, files, LICENSE_FILE_PATTERN) ?? readTextFile(TEXT_FILE_BY_PACKAGE[manifest.name]),
            noticeText: readFirstFile(absoluteDirectory, files, NOTICE_FILE_PATTERN),
        });
    }
    licenses.sort((first, second) => first.name.localeCompare(second.name) || first.version.localeCompare(second.version));

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, `${JSON.stringify(licenses, null, 2)}\n`);

    console.log(`\n${licenses.length} paquetes en ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
    const withoutText = licenses.filter((item) => !item.licenseText);
    if (withoutText.length > 0) {
        console.log('Sin texto (añadir el LICENSE de su repositorio a scripts/licenses/texts y a TEXT_FILE_BY_PACKAGE):');
        for (const item of withoutText) console.log(`  ${item.name}@${item.version} (${item.license})`);
    }
} finally {
    fs.rmSync(exportDirectory, { recursive: true, force: true });
}
