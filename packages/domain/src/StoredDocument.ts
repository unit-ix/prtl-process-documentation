export interface StoredDocument {
    id: string;
    fileName: string;
    readonly blobPath: string;
    readonly contentType: string;
    readonly sizeBytes: number;
    readonly uploadedAt: string;
    readonly uploadedBy: { id: string };
    isActive: boolean;
}
