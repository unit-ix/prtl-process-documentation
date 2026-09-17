// §7.9 — Canvas prüft gar nichts. Whitelist statt Blacklist: eine Liste verbotener Endungen ist
// immer unvollständig.
export const ALLOWED_CONTENT_TYPES: Readonly<Record<string, string>> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
};

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

// Inline anzeigen nur für Bilder, und NIE image/svg+xml — das rendert Skript.
const INLINE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export const isAllowedType = (contentType: string): boolean => contentType in ALLOWED_CONTENT_TYPES;

export const isInlineType = (contentType: string): boolean => INLINE_TYPES.has(contentType);
