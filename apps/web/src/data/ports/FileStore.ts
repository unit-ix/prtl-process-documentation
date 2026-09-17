export type FileOwner = 'process' | 'instruction' | 'qualification';

export interface StoredFile {
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    uploadedAt: string;
    uploadedBy: { id: string } | null;
    isInline: boolean;
}

// Kein Pfad kommt vom Client, und `upload` liefert eine Id statt einer Adresse: eine dauerhafte
// URL wäre genau die Pfad-Spalte, die der Entwurf ausschliesst. `url()` ist eine Erlaubnis auf
// Zeit — nicht speichern, nicht cachen.
export interface FileStore {
    list(owner: FileOwner, ownerId: string): Promise<StoredFile[]>;
    upload(owner: FileOwner, ownerId: string, file: File): Promise<StoredFile>;
    url(id: string): Promise<string>;
    remove(id: string): Promise<void>;
}
