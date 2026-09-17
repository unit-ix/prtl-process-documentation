// → libQualificationDocument / qualification_documents

import type { StoredDocument } from './StoredDocument.js';

export interface QualificationDocument extends StoredDocument {
    qualification: { id: string };
}
