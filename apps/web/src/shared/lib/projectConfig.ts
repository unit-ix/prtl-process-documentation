import { platform as platformValue, entra as entraValue } from '@unitix/project.json';

export type Platform = 'mock' | 'azure' | 'powerapps';

export interface EntraConfig {
    readonly tenantId: string;
    readonly clientId: string;
    readonly apiAudience: string;
    readonly subdomain?: string;
}

export const platform: Platform = platformValue as Platform;

export const entra: EntraConfig = entraValue as EntraConfig;
