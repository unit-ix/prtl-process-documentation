import { useQuery } from '@tanstack/react-query';
import { fileStore } from '@/data';

export const FILE_PREFIX = 'file:';

export const isFileReference = (src: string): boolean => src.startsWith(FILE_PREFIX);

export const fileReference = (id: string): string => `${FILE_PREFIX}${id}`;

// Bilder im Beschreibungsdokument stehen als `file:<id>` — eine SAS-Adresse wäre in einer
// gespeicherten JSON-Spalte ein Zugriffsrecht mit Verfallsdatum (§8.2). Aufgelöst wird beim
// Anzeigen, zehn Minuten gültig.
export function useFileUrl(src: string): string | undefined {
    const id = isFileReference(src) ? src.slice(FILE_PREFIX.length) : '';

    const { data } = useQuery({
        queryKey: ['file-url', id],
        queryFn: () => fileStore.url(id),
        enabled: id !== '',
        staleTime: 5 * 60_000,
    });

    return isFileReference(src) ? data : src;
}
