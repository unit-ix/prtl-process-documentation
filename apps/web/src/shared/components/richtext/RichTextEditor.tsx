import type { RichDocument } from '@app/domain';
import { EditorContent, useEditor } from '@tiptap/react';
import { Plus } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import { fileStore } from '@/data';
import type { FileOwner } from '@/data/ports/FileStore';
import { Button } from '@/shared/components/ui/button';
import { fileReference } from '@/shared/hooks/useFileUrl';
import { EditorToolbar } from './EditorToolbar';
import { buildExtensions } from './extensions';
import { TableContextMenu } from './TableContextMenu';

interface RichTextEditorProps {
    value: RichDocument | null;
    onChange: (doc: RichDocument) => void;
    /** Ziel der Bild-Uploads — ohne Besitzer gibt es keinen Bild-Knopf. */
    owner?: { kind: FileOwner; id: string };
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

const imageFrom = (transfer: DataTransfer | null): File | null => {
    const file = [...(transfer?.files ?? [])].find((candidate) => candidate.type.startsWith('image/'));
    return file ?? null;
};

export function RichTextEditor({ value, onChange, owner }: RichTextEditorProps) {
    const fileInput = useRef<HTMLInputElement>(null);
    const insertRef = useRef<(file: File) => void>(() => undefined);

    const interceptImage = (transfer: DataTransfer | null): boolean => {
        const file = imageFrom(transfer);
        if (file === null) return false;
        insertRef.current(file);
        return true;
    };
    const editor = useEditor({
        extensions: buildExtensions({ editable: true }),
        shouldRerenderOnTransaction: true,
        content: value ?? EMPTY_DOC,
        editorProps: {
            attributes: { class: 'rich-text min-h-[60vh] focus:outline-none' },
            handlePaste: (_view, event) => interceptImage(event.clipboardData),
            handleDrop: (_view, event) => interceptImage((event as DragEvent).dataTransfer),
        },
        onUpdate: ({ editor: instance }) => onChange(instance.getJSON() as RichDocument),
    });

    if (!editor) return null;

    const insertImage = async (file: File) => {
        if (!owner) {
            toast.error('Bilder lassen sich erst einfügen, wenn der Prozess gespeichert ist.');
            return;
        }
        try {
            const stored = await fileStore.upload(owner.kind, owner.id, file);
            editor.chain().focus().setImage({ src: fileReference(stored.id), alt: file.name }).run();
        } catch (error) {
            toast.error('Bild konnte nicht eingefügt werden', {
                description: error instanceof Error ? error.message : undefined,
            });
        }
    };

    insertRef.current = (file: File) => void insertImage(file);

    return (
        <div className="space-y-3">
            <EditorToolbar editor={editor} onPickImage={owner ? () => fileInput.current?.click() : undefined} />
            <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void insertImage(file);
                    event.target.value = '';
                }}
            />
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
