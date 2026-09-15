// → libProcessDocument / process_documents

import type { StoredDocument } from './StoredDocument.js';

export interface ProcessDocument extends StoredDocument {
    process: { id: string };
}
