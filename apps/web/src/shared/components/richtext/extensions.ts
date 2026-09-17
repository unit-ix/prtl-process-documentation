import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { SizedImage } from './SizedImage';
import { PanelExtension } from './PanelExtension';
import { SlashCommand } from './SlashCommand';

export function buildExtensions(options: { editable: boolean }) {
  const base = [
    StarterKit.configure({ link: false, underline: false }),
    Underline,
    Link.configure({ openOnClick: !options.editable, autolink: true }),
    Table.configure({ resizable: options.editable }),
    TableRow,
    TableHeader,
    TableCell,
    SizedImage,
    PanelExtension,
  ];

  if (!options.editable) return base;

  return [
    ...base,
    Placeholder.configure({
      placeholder: 'Beschreibung erfassen … "/" öffnet die Befehlsliste.',
    }),
    SlashCommand,
  ];
}
