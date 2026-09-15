import { describe, expect, it } from 'vitest';
import { isAllowedType, isInlineType, MAX_FILE_BYTES } from './fileTypes.js';

describe('isAllowedType — muss durchlassen', () => {
    it.each([
        'image/png',
        'image/jpeg',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ])('%s', (type) => {
        expect(isAllowedType(type)).toBe(true);
    });
});

describe('isAllowedType — muss abweisen', () => {
    it.each([
        'application/x-msdownload',
        'application/x-sh',
        'text/html',
        'application/octet-stream',
        'image/svg+xml',
        '',
        'IMAGE/PNG',
    ])('%s', (type) => {
        expect(isAllowedType(type)).toBe(false);
    });
});

describe('isInlineType', () => {
    it('erlaubt Bilder inline', () => {
        expect(isInlineType('image/png')).toBe(true);
    });

    it('zeigt SVG niemals inline — es rendert Skript', () => {
        expect(isInlineType('image/svg+xml')).toBe(false);
    });

    it('zeigt PDF und Office-Dateien nicht inline', () => {
        expect(isInlineType('application/pdf')).toBe(false);
        expect(isInlineType('application/msword')).toBe(false);
    });
});

describe('Grössenbegrenzung', () => {
    it('liegt bei 20 MB', () => {
        expect(MAX_FILE_BYTES).toBe(20 * 1024 * 1024);
    });
});
