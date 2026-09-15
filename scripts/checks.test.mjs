import { describe, expect, it } from 'vitest';
import { cspProblems, secretLines } from './lib/checks.mjs';

const CSP_OK =
    "default-src 'self'; connect-src 'self' https://login.microsoftonline.com https://stprocessdocumentation.blob.core.windows.net; frame-src 'self'";

describe('cspProblems — muss anschlagen', () => {
    it('wenn der Blob-Host in connect-src fehlt', () => {
        const csp = "default-src 'self'; connect-src 'self' https://login.microsoftonline.com";
        expect(cspProblems({ accounts: ['stprocessdocumentation'], csp })).toHaveLength(1);
    });

    it('bei einem Wildcard-Blob-Host', () => {
        const csp = "connect-src 'self' https://*.blob.core.windows.net";
        expect(cspProblems({ accounts: ['stprocessdocumentation'], csp })[0]).toContain('jedes Azure-Konto');
    });

    it('wenn der Header ganz fehlt', () => {
        expect(cspProblems({ accounts: ['st1'], csp: undefined })).toHaveLength(1);
    });

    it('wenn es keine connect-src-Direktive gibt', () => {
        expect(cspProblems({ accounts: ['st1'], csp: "default-src 'self'" })[0]).toContain('connect-src');
    });

    it('für jedes fehlende Konto einzeln', () => {
        expect(cspProblems({ accounts: ['st1', 'st2'], csp: CSP_OK })).toHaveLength(2);
    });
});

describe('cspProblems — muss schweigen', () => {
    it('wenn der exakte Host erlaubt ist', () => {
        expect(cspProblems({ accounts: ['stprocessdocumentation'], csp: CSP_OK })).toEqual([]);
    });

    it('wenn das Projekt gar keinen Blob Storage nutzt', () => {
        expect(cspProblems({ accounts: [], csp: undefined })).toEqual([]);
    });
});

describe('secretLines — muss anschlagen', () => {
    it.each([
        'VITE_API_TOKEN=abc',
        'VITE_SUPABASE_SECRET=abc',
        '  VITE_DB_PASSWORD=abc',
        'VITE_PG_CONNECTION_STRING=postgres://…',
    ])('bei %s', (line) => {
        expect(secretLines(line)).toHaveLength(1);
    });

    it('meldet die Zeilennummer', () => {
        expect(secretLines('A=1\nB=2\nVITE_API_TOKEN=x')[0].line).toBe(3);
    });
});

describe('secretLines — muss schweigen', () => {
    it.each([
        'VITE_ENTRA_CLIENT_ID=guid',
        'PGPASSWORD=abc',
        'API_IDENTITY_NAME=app-x',
        '# VITE_API_TOKEN=abc',
        'SWA_DEPLOYMENT_TOKEN_DEV=abc',
    ])('bei %s', (line) => {
        expect(secretLines(line)).toEqual([]);
    });
});
