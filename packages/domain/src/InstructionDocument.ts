// → libInstructionDocument / instruction_documents

import type { StoredDocument } from './StoredDocument.js';

export interface InstructionDocument extends StoredDocument {
    instruction: { id: string };
}
