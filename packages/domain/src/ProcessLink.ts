// → tblProcessLink / process_links

import type { LinkType } from './enums.js';

export interface ProcessLink {
    id: string;
    processVersion: { id: string };
    linkType: LinkType;
    linkedProcess: { id: string } | null;
    title: string | null;
    url: string | null;
    isActive: boolean;
}
