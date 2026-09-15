import type { RichDocument } from '@app/domain';
import { EditorContent, useEditor } from '@tiptap/react';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { EditorToolbar } from './EditorToolbar';
import { buildExtensions } from './extensions';
import { TableContextMenu } from './TableContextMenu';

interface RichTextEditorProps {
    value: RichDocument | null;
    onChange: (doc: RichDocument) => void;
}

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

function TableQuickActions({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
    if (!editor.isActive('table')) return null;

    return (
        <div className="border-border/50 bg-background/95 absolute top-3 right-3 flex items-center gap-1 rounded-xl border p-1 backdrop-blur-xl">
            <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg px-2 text-xs"
                onClick={(event) => {
                    event.stopPropagation();
                    editor.chain().focus().addRowAfter().run();
                }}
            >
                <Plus className="mr-1 size-3.5" /> Zeile
            </Button>
            <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg px-2 text-xs"
                onClick={(event) => {
                    event.stopPropagation();
                    editor.chain().focus().addColumnAfter().run();
                }}
            >
                <Plus className="mr-1 size-3.5" /> Spalte
            </Button>
        </div>
    );
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: buildExtensions({ editable: true }),
        shouldRerenderOnTransaction: true,
        content: value ?? EMPTY_DOC,
        editorProps: {
            attributes: { class: 'rich-text min-h-[60vh] focus:outline-none' },
        },
        onUpdate: ({ editor: instance }) => onChange(instance.getJSON() as RichDocument),
    });

    if (!editor) return null;

    return (
        <div className="space-y-3">
            <EditorToolbar editor={editor} />
            <TableContextMenu editor={editor}>
                <div
                    className="border-border/40 bg-card relative rounded-lg border p-6"
                    onClick={() => editor.chain().focus().run()}
                >
                    <EditorContent editor={editor} />
                    <TableQuickActions editor={editor} />
                </div>
            </TableContextMenu>
            <p className="text-muted-foreground text-xs">
                Tipp: „/" öffnet die Befehlsliste. Rechtsklick in einer Tabelle öffnet Zeilen- und Spaltenaktionen.
            </p>
        </div>
    );
}
