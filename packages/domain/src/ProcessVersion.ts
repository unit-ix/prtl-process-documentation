// → tblProcessVersion / process_versions

import type { ProcessStatus } from './enums.js';
import type { ProcessContent } from './ProcessContent.js';

export interface ProcessVersion extends ProcessContent {
    id: string;
    process: { id: string };
    readonly edition: number | null;
    status: ProcessStatus;
    author: { id: string } | null;
    processOwner: { id: string } | null;
    approvedByQm: { id: string } | null;
    changeReason: string | null;
    submittedAt: string | null;
    contentReviewedAt: string | null;
    approvedAt: string | null;
    readonly snapshotHtml: string | null;
    createdAt: string;
    updatedAt: string;
    readonly rowVersion: number;
    isActive: boolean;
}
