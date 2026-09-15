import { describe, expect, it } from 'vitest';
import { matchPath } from './match.js';

describe('matchPath — muss treffen', () => {
    it('bei einem festen Pfad', () => {
        expect(matchPath('/processes', '/processes')).toEqual({});
    });

    it('und den Parameter herausgeben', () => {
        expect(matchPath('/processes/:id', '/processes/abc-123')).toEqual({ id: 'abc-123' });
    });

    it('bei mehreren Parametern', () => {
        expect(matchPath('/processes/:id/versions/:versionId', '/processes/a/versions/b')).toEqual({
            id: 'a',
            versionId: 'b',
        });
    });

    it('unabhängig von führenden und doppelten Schrägstrichen', () => {
        expect(matchPath('/processes', 'processes')).toEqual({});
        expect(matchPath('/processes/:id', '/processes/a/')).toEqual({ id: 'a' });
    });

    it('und dekodiert den Parameter', () => {
        expect(matchPath('/users/:mail', '/users/a%40b.de')).toEqual({ mail: 'a@b.de' });
    });
});

describe('matchPath — muss schweigen', () => {
    it('bei zu vielen Segmenten', () => {
        expect(matchPath('/processes/:id', '/processes/a/b')).toBeNull();
    });

    it('bei zu wenigen Segmenten', () => {
        expect(matchPath('/processes/:id', '/processes')).toBeNull();
    });

    it('bei einem anderen festen Segment', () => {
        expect(matchPath('/processes/:id', '/areas/a')).toBeNull();
        expect(matchPath('/processes/:id/submit', '/processes/a/reopen')).toBeNull();
    });

    it('bei einem leeren Parameter', () => {
        expect(matchPath('/processes/:id', '/processes//')).toBeNull();
    });
});
