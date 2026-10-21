// Publica una actualización OTA de la app en el servidor propio (Back-Govoy + S3 + CloudFront).
// Por cada plataforma exporta el bundle, monta el manifest del protocolo de Expo Updates y lo firma con keys/private-key.pem.
// Uso: npm run publish-update
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const EXPORT_ROOT = path.join(PROJECT_ROOT, 'dist');
const PRIVATE_KEY_FILE = path.join(PROJECT_ROOT, 'keys/private-key.pem');
// Al sacar la app en iOS, se añade 'ios'.
const PLATFORMS = ['android'];
// URL de CloudFront que sirve la carpeta chelu-updates del bucket, sin barra final.
const ASSETS_BASE_URL = '';
const CONTENT_TYPE_BY_EXTENSION = {
    bundle: 'application/javascript',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ttf: 'font/ttf',
    otf: 'font/otf',
    json: 'application/json',
};

const runJsonCommand = (command) => JSON.parse(execSync(command, { cwd: PROJECT_ROOT, encoding: 'utf8' }));

const describeFile = (exportDirectory, filePath, extension, fileUrlPrefix) => {
    const content = fs.readFileSync(path.join(exportDirectory, filePath));
    return {
        hash: crypto.createHash('sha256').update(content).digest('base64url'),
        key: crypto.createHash('md5').update(content).digest('hex'),
        fileExtension: `.${extension}`,
        contentType: CONTENT_TYPE_BY_EXTENSION[extension] ?? 'application/octet-stream',
        url: `${fileUrlPrefix}/${filePath}`,
    };
};

// Deja en dist/<plataforma> el bundle, los assets, manifest.json y signature.
const prepareUpdate = (platform, expoConfig, privateKey) => {
    const exportDirectory = path.join(EXPORT_ROOT, platform);
    const { runtimeVersion } = runJsonCommand(`npx expo-updates runtimeversion:resolve --platform ${platform}`);
    execSync(`npx expo export --platform ${platform} --output-dir "${exportDirectory}"`, { cwd: PROJECT_ROOT, stdio: 'inherit' });

    const updateId = crypto.randomUUID();
    const fileUrlPrefix = `${ASSETS_BASE_URL}/${platform}/${runtimeVersion}/${updateId}`;
    const { fileMetadata } = JSON.parse(fs.readFileSync(path.join(exportDirectory, 'metadata.json'), 'utf8'));
    const platformFiles = fileMetadata[platform];

    const manifest = {
        id: updateId,
        createdAt: new Date().toISOString(),
        runtimeVersion,
        launchAsset: describeFile(exportDirectory, platformFiles.bundle, 'bundle', fileUrlPrefix),
        assets: platformFiles.assets.map((asset) => describeFile(exportDirectory, asset.path, asset.ext, fileUrlPrefix)),
        metadata: {},
        extra: { expoClient: expoConfig },
    };
    const manifestText = JSON.stringify(manifest);
    const signature = crypto.sign('sha256', Buffer.from(manifestText), privateKey).toString('base64');

    fs.writeFileSync(path.join(exportDirectory, 'manifest.json'), manifestText);
    // Valor de la cabecera expo-signature que el back devuelve junto al manifest.
    fs.writeFileSync(path.join(exportDirectory, 'signature'), `sig="${signature}", keyid="main"`);

    console.log(`\n${platform}: actualización ${updateId} (runtime ${runtimeVersion}) lista en ${path.relative(PROJECT_ROOT, exportDirectory)}`);
    return { platform, runtimeVersion, updateId, exportDirectory };
};

if (!ASSETS_BASE_URL) throw new Error('Falta ASSETS_BASE_URL (la URL de CloudFront)');

const expoConfig = runJsonCommand('npx expo config --type public --json');
const privateKey = fs.readFileSync(PRIVATE_KEY_FILE, 'utf8');
for (const platform of PLATFORMS) prepareUpdate(platform, expoConfig, privateKey);
