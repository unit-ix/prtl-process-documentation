import type { ProcessDetailView } from '@app/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { processRepository } from '@/data';
import { processDetailKey } from './useProcessDetail';

export interface ProcessFormState {
    title: string;
    shortDescription: string;
    purpose: string;
    scopeDetail: string;
    terms: string;
    responsibilities: string;
    workSequence: string;
    method: string;
    processParameters: string;
    documentationRef: string;
    deviationHandling: string;
    maintenanceRef: string;
    additionalFields: Record<string, string>;
}

const text = (value: string | null): string => value ?? '';
const orNull = (value: string): string | null => (value.trim() === '' ? null : value);

export const toFormState = (process: ProcessDetailView): ProcessFormState => ({
    title: process.title,
    shortDescription: text(process.shortDescription),
    purpose: text(process.version.purpose),
    scopeDetail: text(process.version.scopeDetail),
    terms: text(process.version.terms),
    responsibilities: text(process.version.responsibilities),
    workSequence: text(process.version.workSequence),
    method: text(process.version.method),
    processParameters: text(process.version.processParameters),
    documentationRef: text(process.version.documentationRef),
    deviationHandling: text(process.version.deviationHandling),
    maintenanceRef: text(process.version.maintenanceRef),
    additionalFields: Object.fromEntries(process.additionalFields.map((field) => [field.id, text(field.value)])),
});

export function useProcessForm(process: ProcessDetailView) {
    const [form, setForm] = useState<ProcessFormState>(() => toFormState(process));
    const [isDirty, setDirty] = useState(false);
    const queryClient = useQueryClient();

    const set = <TKey extends keyof ProcessFormState>(key: TKey, value: ProcessFormState[TKey]) => {
        setForm((current) => ({ ...current, [key]: value }));
        setDirty(true);
    };

    const setAdditionalField = (id: string, value: string) => {
        setForm((current) => ({ ...current, additionalFields: { ...current.additionalFields, [id]: value } }));
        setDirty(true);
    };

    const save = useMutation({
        mutationFn: () =>
            processRepository.save(process.id, {
                rowVersion: process.version.rowVersion,
                title: form.title.trim(),
                shortDescription: orNull(form.shortDescription),
                purpose: orNull(form.purpose),
                scopeDetail: orNull(form.scopeDetail),
                terms: orNull(form.terms),
                responsibilities: orNull(form.responsibilities),
                workSequence: orNull(form.workSequence),
                method: orNull(form.method),
                processParameters: orNull(form.processParameters),
                documentationRef: orNull(form.documentationRef),
                deviationHandling: orNull(form.deviationHandling),
                maintenanceRef: orNull(form.maintenanceRef),
                additionalFields: Object.entries(form.additionalFields).map(([id, value]) => ({
                    id,
                    value: orNull(value),
                })),
            }),
        onSuccess: async () => {
            setDirty(false);
            toast.success('Gespeichert.');
            await queryClient.invalidateQueries({ queryKey: processDetailKey(process.id) });
            await queryClient.invalidateQueries({ queryKey: ['processes'] });
        },
        onError: (error: Error) => toast.error(error.message),
    });

    return { form, set, setAdditionalField, save, isDirty };
}
