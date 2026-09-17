import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { Button } from '@/shared/components/ui/button';
import { useFileUrl } from '@/shared/hooks/useFileUrl';

export type ImageSize = 'sm' | 'md' | 'full';

export const IMAGE_SIZE_LABELS: Record<ImageSize, string> = {
    sm: 'Klein',
    md: 'Mittel',
    full: 'Volle Breite',
};

const SIZE_CLASS: Record<ImageSize, string> = {
    sm: 'max-w-[320px]',
    md: 'max-w-[640px]',
    full: 'w-full',
};

function ImageView({ node, updateAttributes, selected, editor }: ReactNodeViewProps) {
    const size = (node.attrs.size as ImageSize | undefined) ?? 'md';
    const src = useFileUrl(String(node.attrs.src ?? ''));
    const alt = node.attrs.alt ? String(node.attrs.alt) : 'Prozessbild';

    return (
        <NodeViewWrapper className="my-3" data-image-size={size}>
            <figure className="relative inline-block max-w-full">
                <img
                    src={src ?? ""}
                    alt={alt}
                    className={`border-border/40 h-auto rounded-lg border ${SIZE_CLASS[size]} ${selected ? 'ring-ring/40 ring-2' : ''}`}
                />
                {editor.isEditable && selected ? (
                    <div className="border-border/30 bg-background/95 absolute top-2 left-2 flex gap-1 rounded-lg border p-1 backdrop-blur-xl">
                        {(Object.keys(IMAGE_SIZE_LABELS) as ImageSize[]).map((key) => (
                            <Button
                                key={key}
                                type="button"
                                size="sm"
                                variant={size === key ? 'default' : 'ghost'}
                                className="h-7 px-2 text-[11px]"
                                onClick={() => updateAttributes({ size: key })}
                            >
                                {IMAGE_SIZE_LABELS[key]}
                            </Button>
                        ))}
                    </div>
                ) : null}
            </figure>
        </NodeViewWrapper>
    );
}

// allowBase64 ist bewusst AUS: §8.2 — Bilder gehen in den Blob Storage, im Dokument steht die URL.
// Ein eingebettetes Base64-Bild bläht jede Lesezugriff auf die Zeile und jeden Snapshot auf.
export const SizedImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            size: {
                default: 'md' as ImageSize,
                parseHTML: (element) => element.getAttribute('data-size') ?? 'md',
                renderHTML: (attributes) => ({ 'data-size': attributes.size }),
            },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(ImageView);
    },
}).configure({ inline: false, allowBase64: false });
