import { platform } from '@/shared/lib/projectConfig';
import { AzureFileStore } from '@/data/adapters/azure/AzureFileStore';
import { AzureInstructionRepository } from '@/data/adapters/azure/AzureInstructionRepository';
import { AzureMasterDataRepository } from '@/data/adapters/azure/AzureMasterDataRepository';
import { AzurePeopleRepository } from '@/data/adapters/azure/AzurePeopleRepository';
import { AzureProcessRepository } from '@/data/adapters/azure/AzureProcessRepository';
import { AzureSessionRepository } from '@/data/adapters/azure/AzureSessionRepository';
import { ensureSignedIn } from '@/data/adapters/azure/auth';
import type { FileStore } from './ports/FileStore';
import type { InstructionRepository } from './ports/InstructionRepository';
import type { MasterDataRepository } from './ports/MasterDataRepository';
import type { PeopleRepository } from './ports/PeopleRepository';
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

export const fileStore: FileStore = platform === 'azure' ? new AzureFileStore() : unsupported();

export const instructionRepository: InstructionRepository =
    platform === 'azure' ? new AzureInstructionRepository() : unsupported();

export const peopleRepository: PeopleRepository =
    platform === 'azure' ? new AzurePeopleRepository() : unsupported();
