import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export const PERSONAS = ['admin', 'manager', 'employee'] as const;
export type Persona = (typeof PERSONAS)[number];

interface PersonaCapabilities {
    readonly see: readonly string[];
    readonly edit: readonly string[];
}

const CAPABILITIES: Record<Persona, PersonaCapabilities> = {
    admin: { see: ['*'], edit: ['*'] },
    manager: { see: ['*'], edit: ['company', 'contact'] },
    employee: { see: ['company', 'contact'], edit: ['contact'] },
};

const allows = (list: readonly string[], key: string): boolean =>
    list.includes('*') || list.includes(key);

export interface RoleContextValue {
    persona: Persona;
    /** PROTOTYPE-ONLY: switched from the UI, see RoleProvider. */
    setPersona: (persona: Persona) => void;
    canSee: (key: string) => boolean;
    canEdit: (key: string) => boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
    // PROTOTYPE-ONLY — production reads the persona from the host user.
    const [persona, setPersona] = useState<Persona>('admin');

    const value = useMemo<RoleContextValue>(() => {
        const caps = CAPABILITIES[persona];
        return {
            persona,
            setPersona,
            canSee: (key: string) => allows(caps.see, key),
            canEdit: (key: string) => allows(caps.edit, key),
        };
    }, [persona]);

    return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
    const context = useContext(RoleContext);
    if (!context) throw new Error('useRole must be used within a RoleProvider');
    return context;
}
