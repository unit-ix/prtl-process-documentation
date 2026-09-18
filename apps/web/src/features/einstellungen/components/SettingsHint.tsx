import { ArrowRight } from 'lucide-react';

/**
 * Die beiden Reiter beantworten zwei verschiedene Fragen und sehen dabei fast gleich aus. Statt
 * eines Erklärtextes sagt jeder Reiter in einer Zeile, was er festlegt — und verweist für die
 * Gegenfrage auf den anderen. Wer sich vertut, ist mit einem Klick dort, wo er hinwollte.
 */
export function SettingsHint({
    subject,
    object,
    otherQuestion,
    otherTab,
    onSwitch,
}: {
    subject: string;
    object: string;
    otherQuestion: string;
    otherTab: string;
    onSwitch: () => void;
}) {
    return (
        <div className="border-border/40 bg-muted/30 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-4 py-2.5 text-sm">
            <span className="font-medium">{subject}</span>
            <ArrowRight className="text-muted-foreground size-3.5" />
            <span className="font-medium">{object}</span>
            <span className="text-muted-foreground">· {otherQuestion}</span>
            <button type="button" onClick={onSwitch} className="text-primary font-medium hover:underline">
                {otherTab}
            </button>
        </div>
    );
}
