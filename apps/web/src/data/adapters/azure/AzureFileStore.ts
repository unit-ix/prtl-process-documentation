import type { FileOwner, FileStore, StoredFile } from '@/data/ports/FileStore';
import { apiDelete, apiGet, apiSend } from './client';

// Schritt 2 geht am API-Client vorbei: der PUT läuft direkt gegen den Blob-Endpunkt und trägt
// keinen Entra-Token, sondern die SAS in der URL.
async function putToBlob(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'x-ms-blob-type': 'BlockBlob', 'content-type': file.type },
        body: file,
    });
    if (!response.ok) throw new Error(`Der Upload wurde abgewiesen (${response.status}).`);
}

export class AzureFileStore implements FileStore {
    async list(owner: FileOwner, ownerId: string): Promise<StoredFile[]> {
        const { items } = await apiGet<{ items: StoredFile[] }>(`/files/${owner}/${ownerId}`);
        return items;
    }

    async upload(owner: FileOwner, ownerId: string, file: File): Promise<StoredFile> {
        const { fileId, uploadUrl } = await apiSend<{ fileId: string; uploadUrl: string }>(
            'POST',
            '/files/upload-url',
            { owner, ownerId, contentType: file.type },
        );

        await putToBlob(uploadUrl, file);

        return apiSend<StoredFile>('POST', '/files', {
            fileId,
            owner,
            ownerId,
            fileName: file.name,
            contentType: file.type,
        });
    }

    async url(id: string): Promise<string> {
        const { url } = await apiGet<{ url: string }>(`/files/${id}/url`);
        return url;
    }

    remove(id: string): Promise<void> {
        return apiDelete(`/files/${id}`);
    }
}
