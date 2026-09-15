import { platform } from '@/shared/lib/projectConfig';
import { AzureMasterDataRepository } from '@/data/adapters/azure/AzureMasterDataRepository';
import { AzureProcessRepository } from '@/data/adapters/azure/AzureProcessRepository';
import { AzureSessionRepository } from '@/data/adapters/azure/AzureSessionRepository';
import { ensureSignedIn } from '@/data/adapters/azure/auth';
import type { MasterDataRepository } from './ports/MasterDataRepository';
import type { ProcessRepository } from './ports/ProcessRepository';
import type { SessionRepository } from './ports/SessionRepository';

function unsupported(): never {
    throw new Error(`Data-Adapter für Plattform "${platform}" nicht implementiert.`);
}

export async function initDataAccess(): Promise<void> {
    if (platform === 'azure') await ensureSignedIn();
}

export const sessionRepository: SessionRepository =
    platform === 'azure' ? new AzureSessionRepository() : unsupported();

export const processRepository: ProcessRepository =
    platform === 'azure' ? new AzureProcessRepository() : unsupported();

export const masterDataRepository: MasterDataRepository =
    platform === 'azure' ? new AzureMasterDataRepository() : unsupported();
