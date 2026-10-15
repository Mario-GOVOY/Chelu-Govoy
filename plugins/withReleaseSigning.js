const { withAppBuildGradle } = require('expo/config-plugins');

// Firma de release con la clave de Chelu. Los datos van en ~/.gradle/gradle.properties (fuera del repo):
// CHELU_UPLOAD_STORE_FILE, CHELU_UPLOAD_KEY_ALIAS, CHELU_UPLOAD_STORE_PASSWORD y CHELU_UPLOAD_KEY_PASSWORD.
// Sin ellos, el release se firma con la clave de debug y Gradle lo avisa.
const RELEASE_SIGNING_CONFIG = `
        release {
            if (project.hasProperty('CHELU_UPLOAD_STORE_FILE')) {
                storeFile file(CHELU_UPLOAD_STORE_FILE)
                storePassword CHELU_UPLOAD_STORE_PASSWORD
                keyAlias CHELU_UPLOAD_KEY_ALIAS
                keyPassword CHELU_UPLOAD_KEY_PASSWORD
            }
        }`;

const RELEASE_SIGNING = `if (project.hasProperty('CHELU_UPLOAD_STORE_FILE')) {
                signingConfig signingConfigs.release
            } else {
                logger.warn('Chelu: sin CHELU_UPLOAD_STORE_FILE, el release se firma con la clave de debug')
                signingConfig signingConfigs.debug
            }`;

module.exports = function withReleaseSigning(config) {
    return withAppBuildGradle(config, (config) => {
        let gradle = config.modResults.contents;
        // Un prebuild sin --clean vuelve a pasar por el mismo build.gradle.
        if (gradle.includes('CHELU_UPLOAD_STORE_FILE')) return config;

        // El bloque debug de signingConfigs acaba en keyPassword 'android'; la de release va detrás.
        gradle = gradle.replace(/(signingConfigs \{\s*debug \{[^}]*\})/, `$1${RELEASE_SIGNING_CONFIG}`);
        // En buildTypes.release, la línea de signingConfig va tras los comentarios de la plantilla.
        gradle = gradle.replace(/(release \{\s*(?:\/\/[^\n]*\s*)*)signingConfig signingConfigs\.debug/, `$1${RELEASE_SIGNING}`);

        if (!gradle.includes('signingConfig signingConfigs.release')) {
            throw new Error('withReleaseSigning: build.gradle no tiene la forma esperada; revisa el plugin');
        }
        config.modResults.contents = gradle;
        return config;
    });
};
