import type { Editor } from "@tiptap/react";
import { Button } from '@/shared/components/ui/button';
import { Separator } from '@/shared/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Table as TableIcon,
  ImagePlus,
  Info,
  Link2,
  Undo2,
  Redo2,
  Columns3,
  Rows3,
  Trash2,
} from "lucide-react";

interface EditorToolbarProps {
  editor: Editor;
  onPickImage?: () => void;
}

export function EditorToolbar({ editor, onPickImage }: EditorToolbarProps) {
  const toggle = (active: boolean) => (active ? "bg-accent/10 text-accent" : "");

  const setLink = () => {
    const previous = String(editor.getAttributes("link").href ?? "");
    const url = window.prompt("Link-Adresse", previous || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 rounded-xl border border-border/40 bg-white/95 p-1.5 shadow-soft backdrop-blur-xl">
      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => editor.chain().focus().undo().run()} aria-label="Rückgängig">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => editor.chain().focus().redo().run()} aria-label="Wiederholen">
        <Redo2 className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("heading", { level: 1 }))}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-label="Überschrift 1">
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("heading", { level: 2 }))}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Überschrift 2">
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("heading", { level: 3 }))}`} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Überschrift 3">
        <Heading3 className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("bold"))}`} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Fett">
        <Bold className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("italic"))}`} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Kursiv">
        <Italic className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("underline"))}`} onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Unterstrichen">
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("strike"))}`} onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="Durchgestrichen">
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("code"))}`} onClick={() => editor.chain().focus().toggleCode().run()} aria-label="Code">
        <Code className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("link"))}`} onClick={setLink} aria-label="Link">
        <Link2 className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("bulletList"))}`} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Aufzählung">
        <List className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("orderedList"))}`} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Nummerierung">
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className={`h-9 w-9 ${toggle(editor.isActive("blockquote"))}`} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Zitat">
        <Quote className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => editor.chain().focus().setHorizontalRule().run()} aria-label="Trennlinie">
        <Minus className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="mx-1 h-6" />

      {onPickImage ? (
        <Button size="sm" variant="ghost" className="h-9 gap-2" onClick={onPickImage}>
          <ImagePlus className="h-4 w-4" /> Bild
        </Button>
      ) : null}

      <Button
        size="sm"
        variant="ghost"
        className="h-9 gap-2"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <TableIcon className="h-4 w-4" /> Tabelle
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-9 gap-2" aria-label="Tabellen-Aktionen">
            <TableIcon className="h-4 w-4" /> Zeile/Spalte
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Tabelle</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            <TableIcon className="mr-2 h-4 w-4" /> Einfügen (3 × 3)
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              editor.chain().focus().addColumnAfter().run();
            }}
          >
            <Columns3 className="mr-2 h-4 w-4" /> Spalte einfügen
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              editor.chain().focus().addRowAfter().run();
            }}
          >
            <Rows3 className="mr-2 h-4 w-4" /> Zeile einfügen
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              editor.chain().focus().deleteColumn().run();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Spalte löschen
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              editor.chain().focus().deleteRow().run();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Zeile löschen
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              editor.chain().focus().mergeOrSplit().run();
            }}
          >
            <TableIcon className="mr-2 h-4 w-4" /> Zellen verbinden / teilen
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              editor.chain().focus().deleteTable().run();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Tabelle löschen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-9 gap-2">
            <Info className="h-4 w-4" /> Panel
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Hinweisblock</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              editor.chain().focus().togglePanel("info").run();
            }}
          >Info</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              editor.chain().focus().togglePanel("success").run();
            }}
          >Erfolg</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              editor.chain().focus().togglePanel("warning").run();
            }}
          >Warnung</DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              editor.chain().focus().togglePanel("danger").run();
            }}
          >Achtung</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
