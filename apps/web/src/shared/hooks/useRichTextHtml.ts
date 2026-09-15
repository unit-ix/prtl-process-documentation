import { richTextToHtml, type RichDocument } from '@app/domain';
import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fileStore } from '@/data';
import { FILE_PREFIX, isFileReference } from './useFileUrl';

function collectFileIds(node: unknown, found: Set<string>): void {
    if (Array.isArray(node)) {
        for (const child of node) collectFileIds(child, found);
        return;
    }
    if (typeof node !== 'object' || node === null) return;

    const record = node as { attrs?: { src?: unknown }; content?: unknown };
    const src = record.attrs?.src;
    if (typeof src === 'string' && isFileReference(src)) found.add(src.slice(FILE_PREFIX.length));
    collectFileIds(record.content, found);
}

/** HTML für die Lese-Ansicht: Bildverweise werden beim Anzeigen in kurzlebige Adressen aufgelöst. */
export function useRichTextHtml(doc: RichDocument | null): string {
    const ids = useMemo(() => {
        const found = new Set<string>();
        collectFileIds(doc, found);
        return [...found];
    }, [doc]);

    const urls = useQueries({
        queries: ids.map((id) => ({
            queryKey: ['file-url', id],
            queryFn: () => fileStore.url(id),
            staleTime: 5 * 60_000,
        })),
    });

    return useMemo(() => {
        const html = richTextToHtml(doc);
        return ids.reduce((current, id, index) => {
            const url = urls[index]?.data;
            return url === undefined ? current : current.replaceAll(`src="${FILE_PREFIX}${id}"`, `src="${url}"`);
        }, html);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doc, ids, urls.map((query) => query.data).join('|')]);
}
