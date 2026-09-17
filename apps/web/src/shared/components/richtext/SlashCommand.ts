import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import "@tiptap/starter-kit";
import "@tiptap/extension-table";
import './PanelExtension';

export interface SlashItem {
  title: string;
  hint: string;
  run: (editor: Editor, range: Range) => void;
}

const ITEMS: SlashItem[] = [
  {
    title: "Überschrift 1",
    hint: "Großer Abschnittstitel",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Überschrift 2",
    hint: "Unterabschnitt",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Überschrift 3",
    hint: "Kleiner Abschnitt",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Aufzählung",
    hint: "Punkteliste",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Nummerierung",
    hint: "Nummerierte Liste",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Tabelle",
    hint: "3 Spalten mit Kopfzeile",
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Info-Panel",
    hint: "Blauer Hinweis",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setPanel("info").run(),
  },
  {
    title: "Erfolg-Panel",
    hint: "Grüner Hinweis",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setPanel("success").run(),
  },
  {
    title: "Warn-Panel",
    hint: "Gelber Hinweis",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setPanel("warning").run(),
  },
  {
    title: "Achtung-Panel",
    hint: "Roter Hinweis",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setPanel("danger").run(),
  },
  {
    title: "Zitat",
    hint: "Eingerückter Textblock",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Codeblock",
    hint: "Monospace-Block",
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Trennlinie",
    hint: "Horizontale Linie",
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

function createMenu() {
  const el = document.createElement("div");
  el.className =
    "z-50 w-64 overflow-hidden rounded-xl border border-border/30 bg-popover p-1.5 shadow-lg backdrop-blur-xl";
  el.style.position = "absolute";
  el.style.display = "none";
  document.body.appendChild(el);
  return el;
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    let menu: HTMLDivElement | null = null;
    let active: SlashItem[] = [];
    let index = 0;
    let onSelect: (item: SlashItem) => void = () => undefined;

    const render = () => {
      if (!menu) return;
      menu.innerHTML = "";
      active.forEach((item, i) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = `flex w-full flex-col items-start gap-0 rounded-md px-2.5 py-1.5 text-left ${
          i === index ? "bg-muted" : ""
        }`;
        row.innerHTML = `<span class="text-sm font-medium">${item.title}</span><span class="text-xs text-muted-foreground">${item.hint}</span>`;
        row.addEventListener("mousedown", (event) => {
          event.preventDefault();
          onSelect(item);
        });
        menu?.appendChild(row);
      });
    };

    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        items: ({ query }) =>
          ITEMS.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
        command: ({ editor, range, props }) => {
          (props as SlashItem).run(editor, range);
        },
        render: () => ({
          onStart: (props) => {
            menu = menu ?? createMenu();
            active = props.items as SlashItem[];
            index = 0;
            onSelect = (item) => props.command(item);
            render();
            const rect = props.clientRect?.();
            if (rect && menu) {
              menu.style.display = active.length ? "block" : "none";
              menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
              menu.style.left = `${rect.left + window.scrollX}px`;
            }
          },
          onUpdate: (props) => {
            active = props.items as SlashItem[];
            index = 0;
            onSelect = (item) => props.command(item);
            render();
            const rect = props.clientRect?.();
            if (rect && menu) {
              menu.style.display = active.length ? "block" : "none";
              menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
              menu.style.left = `${rect.left + window.scrollX}px`;
            }
          },
          onKeyDown: (props) => {
            if (!active.length) return false;
            if (props.event.key === "ArrowDown") {
              index = (index + 1) % active.length;
              render();
              return true;
            }
            if (props.event.key === "ArrowUp") {
              index = (index - 1 + active.length) % active.length;
              render();
              return true;
            }
            if (props.event.key === "Enter") {
              onSelect(active[index]);
              return true;
            }
            if (props.event.key === "Escape") {
              if (menu) menu.style.display = "none";
              return true;
            }
            return false;
          },
          onExit: () => {
            if (menu) menu.style.display = "none";
          },
        }),
      }),
    ];
  },
});
