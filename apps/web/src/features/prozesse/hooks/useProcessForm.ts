import {
    RESPONSIBILITIES_TEMPLATE,
    TERMS_TEMPLATE,
    richOrPlain,
    type ProcessDetailView,
    type RichDocument,
} from '@app/domain';
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
    termsDoc: RichDocument | null;
    responsibilitiesDoc: RichDocument | null;
    workSequence: string;
    method: string;
    processParameters: string;
    documentationRef: string;
    deviationHandling: string;
    maintenanceRef: string;
    additionalFields: FormField[];
    links: FormLink[];
    /** Nur gesetzt, wenn Felder aus einem anderen Prozess übernommen wurden — sonst pflegt der Editor sie. */
    descriptionDoc?: RichDocument | null;
}

const text = (value: string | null): string => value ?? '';
const orNull = (value: string): string | null => (value.trim() === '' ? null : value);

export const toFormState = (process: ProcessDetailView): ProcessFormState => ({
    title: process.title,
    shortDescription: text(process.shortDescription),
    purpose: text(process.version.purpose),
    scopeDetail: text(process.version.scopeDetail),
    termsDoc: richOrPlain(process.version.termsDoc, process.version.terms) ?? TERMS_TEMPLATE,
    responsibilitiesDoc:
        richOrPlain(process.version.responsibilitiesDoc, process.version.responsibilities) ?? RESPONSIBILITIES_TEMPLATE,
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

/**
 * Vorlage (Termin 30.10.): alle Inhaltsfelder eines anderen Prozesses übernehmen. Titel und
 * Kurzbeschreibung bleiben, sie benennen diesen Prozess. Felder, die die eigene Vorlage (IMS oder
 * nicht) gar nicht zeigt, bleiben ebenfalls — sonst würde Unsichtbares mitgespeichert.
 */
export const copyContent = (form: ProcessFormState, source: ProcessDetailView, isIms: boolean): ProcessFormState => {
    const copied = toFormState(source);
    const templateKeys = ['workSequence', 'method', 'processParameters', 'documentationRef', 'deviationHandling', 'maintenanceRef'] as const;
    const kept: Partial<ProcessFormState> = isIms
        ? Object.fromEntries(templateKeys.map((key) => [key, form[key]]))
        : { termsDoc: form.termsDoc };

    return {
        ...copied,
        ...kept,
        title: form.title,
        shortDescription: form.shortDescription,
        additionalFields: copied.additionalFields.map(({ title, value }) => ({ title, value })),
        descriptionDoc: source.version.descriptionDoc,
    };
};

const toPayload = (form: ProcessFormState, rowVersion: number) => ({
    rowVersion,
    ...(form.descriptionDoc === undefined ? {} : { descriptionDoc: form.descriptionDoc }),
    title: form.title.trim(),
    shortDescription: orNull(form.shortDescription),
    purpose: orNull(form.purpose),
    scopeDetail: orNull(form.scopeDetail),
    termsDoc: form.termsDoc,
    responsibilitiesDoc: form.responsibilitiesDoc,
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

    // Die Rich-Text-Editoren lesen ihren Wert nur beim Start; nach einer Übernahme starten sie neu.
    const [generation, setGeneration] = useState(0);
    const copyFrom = (source: ProcessDetailView) => {
        setForm((current) => copyContent(current, source, process.templateType === 'IMS'));
        setGeneration((current) => current + 1);
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

    return { form, set, setFields, setLinks, copyFrom, generation, save, isDirty };
}
