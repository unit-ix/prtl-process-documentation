import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Columns,
  Merge,
  Rows,
  Table as TableIcon,
  Trash2,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/shared/components/ui/context-menu';

interface TableContextMenuProps {
  editor: Editor;
  children: ReactNode;
}

export function TableContextMenu({ editor, children }: TableContextMenuProps) {
  const inTable = editor.isActive("table");

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        disabled={!inTable}
        onContextMenu={(event) => {
          if (!editor.isActive("table")) event.stopPropagation();
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60 rounded-xl border-border/50 bg-white/95 backdrop-blur-xl">
        <ContextMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
          <ArrowUp className="mr-2 h-4 w-4" /> Zeile oberhalb einfügen
        </ContextMenuItem>
        <ContextMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
          <ArrowDown className="mr-2 h-4 w-4" /> Zeile unterhalb einfügen
        </ContextMenuItem>
        <ContextMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Spalte links einfügen
        </ContextMenuItem>
        <ContextMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
          <ArrowRight className="mr-2 h-4 w-4" /> Spalte rechts einfügen
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
          <Rows className="mr-2 h-4 w-4" /> Zeile löschen
        </ContextMenuItem>
        <ContextMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
          <Columns className="mr-2 h-4 w-4" /> Spalte löschen
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
          <TableIcon className="mr-2 h-4 w-4" /> Kopfzeile umschalten
        </ContextMenuItem>
        <ContextMenuItem onClick={() => editor.chain().focus().mergeOrSplit().run()}>
          <Merge className="mr-2 h-4 w-4" /> Zellen verbinden / teilen
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Tabelle löschen
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
