// Licencias de terceros para la pantalla de licencias. Los JSON se generan con npm run licenses:js y licenses:android.

export type License = {
    key: string;
    name: string;
    // Id Maven ("grupo:artefacto"), cuando el nombre no basta para saber qué librería es.
    mavenId?: string;
    version: string | null;
    license: string;
    url: string | null;
    text: string;
};

type JsLicense = {
    name: string;
    version: string;
    license: string;
    url: string | null;
    licenseText: string;
    noticeText: string | null;
};

type AndroidLicenses = {
    texts: Record<string, string>;
    libraries: {
        id: string;
        name: string;
        version: string | null;
        license: string;
        url: string | null;
        textId: string;
        noticeId: string | null;
    }[];
};

/** Todas las licencias, ordenadas por nombre. Lee los JSON al llamarla, no al arrancar la app. */
export function loadLicenses(): License[] {
    const jsLicenses: JsLicense[] = require('./jsLicenses.json');
    const androidLicenses: AndroidLicenses = require('./androidLicenses.json');

    const licenses: License[] = [];
    for (const item of jsLicenses) {
        licenses.push({
            key: `npm:${item.name}@${item.version}`,
            name: item.name,
            version: item.version,
            license: item.license,
            url: item.url,
            text: item.noticeText ? `${item.licenseText}\n\n${item.noticeText}` : item.licenseText,
        });
    }
    for (const library of androidLicenses.libraries) {
        licenses.push({
            key: `android:${library.id}`,
            name: library.name,
            mavenId: library.id.includes(':') ? library.id : undefined,
            version: library.version,
            license: library.license,
            url: library.url,
            text: library.noticeId
                ? `${androidLicenses.texts[library.textId]}\n\n${androidLicenses.texts[library.noticeId]}`
                : androidLicenses.texts[library.textId],
        });
    }
    return licenses.sort((first, second) => first.name.localeCompare(second.name, 'es', { sensitivity: 'base' }));
}
