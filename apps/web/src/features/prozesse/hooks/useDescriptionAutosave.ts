import type { RichDocument } from '@app/domain';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { processRepository } from '@/data';
import { processDetailKey } from './useProcessDetail';

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'conflict' | 'error';

const AUTOSAVE_DELAY_MS = 2000;

export interface Autosave {
    readonly state: SaveState;
    readonly message: string | null;
    readonly onChange: (doc: RichDocument) => void;
    readonly saveNow: () => void;
    readonly isDirty: boolean;
}

// §8.3: speichern nach zwei Sekunden Ruhe, sichtbarer Zustand, und bei einem Konflikt eine klare
// Meldung statt eines stillen Überschreibens. Der nicht gespeicherte Stand bleibt im Speicher —
// ein fehlgeschlagener Schreibversuch darf den Text nie verlieren.
export function useDescriptionAutosave(processId: string, initialRowVersion: number): Autosave {
    const queryClient = useQueryClient();
    const pending = useRef<RichDocument | null>(null);
    const rowVersion = useRef(initialRowVersion);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [state, setState] = useState<SaveState>('saved');
    const [message, setMessage] = useState<string | null>(null);

    const flush = useCallback(async () => {
        const doc = pending.current;
        if (doc === null) return;

        setState('saving');
        try {
            const result = await processRepository.save(processId, { rowVersion: rowVersion.current, descriptionDoc: doc });
            rowVersion.current = result.rowVersion;
            pending.current = null;
            setState('saved');
            setMessage(null);
            await queryClient.invalidateQueries({ queryKey: processDetailKey(processId) });
        } catch (error) {
            const failure = error as { status?: number; message?: string };
            setState(failure.status === 409 ? 'conflict' : 'error');
            setMessage(failure.message ?? 'Speichern fehlgeschlagen.');
        }
    }, [processId, queryClient]);

    const onChange = useCallback(
        (doc: RichDocument) => {
            pending.current = doc;
            setState('unsaved');
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
        },
        [flush],
    );

    const saveNow = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        void flush();
    }, [flush]);

    useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (pending.current === null) return;
            event.preventDefault();
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, []);

    return { state, message, onChange, saveNow, isDirty: pending.current !== null };
}
