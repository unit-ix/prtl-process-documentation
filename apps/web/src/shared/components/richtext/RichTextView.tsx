import type { RichDocument } from '@app/domain';
import { useRichTextHtml } from '@/shared/hooks/useRichTextHtml';

// Derselbe Renderer wie im eingefrorenen Snapshot und im Druck (§8.4) — die drei können deshalb
// nicht auseinanderlaufen. Er escaped jeden Nutzertext und lässt in Links und Bildern nur
// http(s) und relative Pfade durch; das ist die Bedingung für dangerouslySetInnerHTML hier.
export function RichTextView({ doc }: { doc: RichDocument | null }) {
    const html = useRichTextHtml(doc);

    if (html.trim() === '') {
        return <p className="text-muted-foreground text-sm italic">Noch nicht erfasst</p>;
    }

    return <div className="rich-text" dangerouslySetInnerHTML={{ __html: html }} />;
}
