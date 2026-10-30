import { useLocation } from 'react-router-dom';

export interface BackTo {
    readonly to: string;
    readonly label: string;
}

/**
 * Wer aus einer Unterweisung oder einem anderen Prozess kommt, will dorthin zurück und nicht in die
 * allgemeine Liste (Termin 30.10.). Der Weg reist im Navigationszustand mit, nicht in der Adresse —
 * ein Link aus einer Mail landet so weiterhin bei der Liste.
 */
export const backState = (to: string, label: string): { backTo: BackTo } => ({ backTo: { to, label } });

export function useBackTo(fallback: BackTo): BackTo {
    const state = useLocation().state as { backTo?: BackTo } | null;
    return state?.backTo ?? fallback;
}
