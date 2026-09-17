import type { ProcessDetailView } from '@app/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { processRepository } from '@/data';
import { processDetailKey } from './useProcessDetail';

export interface FormField {
    id?: string;
    title: string;
    value: string;
}

export interface FormLink {
    linkType: 'InternerProzess' | 'ExternesDokument';
    linkedProcessId: string | null;
    title: string;
    url: string;
}

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
    additionalFields: FormField[];
    links: FormLink[];
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
    additionalFields: process.additionalFields.map((field) => ({
        id: field.id,
        title: field.title,
        value: text(field.value),
    })),
    links: process.links.map((link) => ({
        linkType: link.linkType,
        linkedProcessId: link.linkedProcess?.id ?? null,
        title: text(link.title),
        url: text(link.url),
    })),
});

const toPayload = (form: ProcessFormState, rowVersion: number) => ({
    rowVersion,
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
    additionalFields: form.additionalFields
        .filter((field) => field.title.trim() !== '')
        .map((field) => ({ id: field.id, title: field.title.trim(), value: orNull(field.value) })),
    links: form.links
        .filter((link) => (link.linkType === 'InternerProzess' ? link.linkedProcessId !== null : link.url.trim() !== ''))
        .map((link) => ({
            linkType: link.linkType,
            linkedProcessId: link.linkType === 'InternerProzess' ? link.linkedProcessId : null,
            title: orNull(link.title),
            url: link.linkType === 'ExternesDokument' ? link.url.trim() : null,
        })),
});

export function useProcessForm(process: ProcessDetailView) {
    const [form, setForm] = useState<ProcessFormState>(() => toFormState(process));
    const [isDirty, setDirty] = useState(false);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const set = <TKey extends keyof ProcessFormState>(key: TKey, value: ProcessFormState[TKey]) => {
        setForm((current) => ({ ...current, [key]: value }));
        setDirty(true);
    };

    const setFields = (additionalFields: FormField[]) => {
        setForm((current) => ({ ...current, additionalFields }));
        setDirty(true);
    };

    const setLinks = (links: FormLink[]) => {
        setForm((current) => ({ ...current, links }));
        setDirty(true);
    };

    const save = useMutation({
        mutationFn: () => processRepository.save(process.id, toPayload(form, process.version.rowVersion)),
        onSuccess: async () => {
            setDirty(false);
            toast.success('Gespeichert.');
            await queryClient.invalidateQueries({ queryKey: processDetailKey(process.id) });
            await queryClient.invalidateQueries({ queryKey: ['processes'] });
            navigate(`/processes/${process.id}`);
        },
        onError: (error: Error) => toast.error(error.message),
    });

    return { form, set, setFields, setLinks, save, isDirty };
}
