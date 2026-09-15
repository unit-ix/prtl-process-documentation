import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';

export type PanelVariant = 'info' | 'success' | 'warning' | 'danger';

export const PANEL_VARIANTS: Record<PanelVariant, { label: string; className: string; icon: typeof Info }> = {
    info: { label: 'Info', className: 'bg-primary/5 border-primary/20', icon: Info },
    success: { label: 'Erfolg', className: 'bg-success/5 border-success/20', icon: CheckCircle2 },
    warning: { label: 'Warnung', className: 'bg-warning/5 border-warning/20', icon: AlertTriangle },
    danger: { label: 'Achtung', className: 'bg-destructive/5 border-destructive/20', icon: OctagonAlert },
};

const ICON_COLOR: Record<PanelVariant, string> = {
    info: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
};

function PanelView({ node }: ReactNodeViewProps) {
    const variant = (node.attrs.variant as PanelVariant | undefined) ?? 'info';
    const config = PANEL_VARIANTS[variant] ?? PANEL_VARIANTS.info;
    const Icon = config.icon;

    return (
        <NodeViewWrapper className={`my-3 flex gap-3 rounded-lg border p-3 ${config.className}`} data-panel={variant}>
            <Icon className={`mt-0.5 size-4 shrink-0 ${ICON_COLOR[variant]}`} />
            <NodeViewContent className="min-w-0 flex-1 text-sm [&>p]:my-0 [&>p+p]:mt-2" />
        </NodeViewWrapper>
    );
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        panel: {
            setPanel: (variant: PanelVariant) => ReturnType;
            togglePanel: (variant: PanelVariant) => ReturnType;
        };
    }
}

export const PanelExtension = Node.create({
    name: 'panel',
    group: 'block',
    content: 'block+',
    defining: true,

    addAttributes() {
        return {
            variant: {
                default: 'info' as PanelVariant,
                parseHTML: (element) => element.getAttribute('data-panel') ?? 'info',
                renderHTML: (attributes) => ({ 'data-panel': attributes.variant }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-panel]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { class: 'rich-panel' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(PanelView);
    },

    addCommands() {
        return {
            setPanel:
                (variant) =>
                ({ commands }) =>
                    commands.wrapIn(this.name, { variant }),
            togglePanel:
                (variant) =>
                ({ commands }) =>
                    commands.toggleWrap(this.name, { variant }),
        };
    },
});
