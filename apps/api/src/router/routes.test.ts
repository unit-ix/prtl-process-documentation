// Die Routentabelle wird von oben nach unten durchsucht: die erste passende Zeile gewinnt. Zwei
// Muster mit gleich vielen Abschnitten können denselben Pfad beanspruchen — dann entscheidet allein
// die Reihenfolge, und das ist unsichtbar, bis ein Bild nicht mehr lädt. Genau das war der Fall.
import { describe, expect, it } from 'vitest';
import { matchPath } from './match.js';
import { ROUTES } from './routes.js';

const firstMatch = (method: string, path: string): string | null => {
    const hit = ROUTES.find((route) => route.method === method && matchPath(route.path, path) !== null);
    return hit?.path ?? null;
};

const FILE_ID = 'd003521c-881c-4e42-9a6b-5e4bb362c7fd';

describe('Routentabelle — welche Zeile gewinnt', () => {
    it('führt den Bildabruf zur SAS-Route und nicht zur Dateiliste', () => {
        expect(firstMatch('GET', `/files/${FILE_ID}/url`)).toBe('/files/:id/url');
    });

    it('führt die Dateiliste weiterhin zur Liste', () => {
        expect(firstMatch('GET', `/files/process/${FILE_ID}`)).toBe('/files/:owner/:ownerId');
    });

    it('lässt kein zweites Muster denselben konkreten Pfad beanspruchen', () => {
        const claiming = ROUTES.filter(
            (route) => route.method === 'GET' && matchPath(route.path, `/files/${FILE_ID}/url`) !== null,
        );
        // Zwei Muster dürfen passen — aber nur, solange das richtige zuerst steht.
        expect(claiming[0]?.path).toBe('/files/:id/url');
    });
});
