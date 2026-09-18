import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import {
  Bold,
  Code,
  Download,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Scissors,
  Strikethrough,
  Superscript,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getRepos } from "@/data/db";
import type { Document as DocRow } from "@/data/types";
import { reportError } from "@/lib/logger";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { pickImageAsDataUrl } from "@/platform/images";
import { PromptDialog } from "@/components/PromptDialog";
import { Footnote, PageBreak } from "./extensions";
import { parseDoc, wordCount, type PmNode } from "./docModel";
import { exportTextDocument } from "./exportText";
import { DocumentAiButton } from "@/ai/DocumentAiButton";

function ToolButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={active ? "secondary" : "ghost"} size="icon-sm" aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Rich-text editor (TipTap) with autosave into `documents.content_json`. */
export function TextEditor({ row }: { row: DocRow }) {
  const { t } = useTranslation();
  const [savedAt, setSavedAt] = useState(row.updated_at);
  const [dirty, setDirty] = useState(false);
  const [words, setWords] = useState(0);
  const [footnotePrompt, setFootnotePrompt] = useState<{ open: boolean; initial: string }>({ open: false, initial: "" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<PmNode | null>(null);
  const [, forceRender] = useState(0);

  const persist = useCallback(async () => {
    if (!latest.current) return;
    try {
      const updated = await getRepos().documents.update(row.id, { content_json: JSON.stringify(latest.current) });
      setSavedAt(updated.updated_at);
      setDirty(false);
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("documents", "autosave failed", e) });
    }
  }, [row.id, t]);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), Image.configure({ allowBase64: true, inline: false }), TableKit.configure({ table: { resizable: false } }), Footnote, PageBreak],
    content: parseDoc(row.content_json) as never,
    editorProps: { attributes: { class: "ProseMirror-editor markdown-body min-h-[60vh] outline-none", "aria-label": t("documents.editorLabel") } },
    onUpdate: ({ editor: ed }) => {
      latest.current = ed.getJSON() as PmNode;
      setWords(wordCount(latest.current));
      setDirty(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void persist(), 800);
    },
    onSelectionUpdate: () => forceRender((n) => n + 1),
    onTransaction: () => forceRender((n) => n + 1),
  });

  useEffect(() => {
    setWords(wordCount(parseDoc(row.content_json)));
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void persist();
      }
    };
  }, [row.content_json, persist]);

  const insertImage = async () => {
    try {
      const src = await pickImageAsDataUrl();
      if (src && editor) editor.chain().focus().setImage({ src }).run();
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("documents", "image failed", e) });
    }
  };

  const openFootnote = () => {
    if (!editor) return;
    const sel = editor.state.selection as { node?: { type: { name: string }; attrs: { text?: string } } };
    setFootnotePrompt({ open: true, initial: sel.node?.type.name === "footnote" ? (sel.node.attrs.text ?? "") : "" });
  };

  const doExport = async (format: "pdf" | "docx" | "md") => {
    try {
      await persist();
      const fresh = (await getRepos().documents.getById(row.id)) ?? row;
      const path = await exportTextDocument(fresh, format);
      if (path) toast.success(t("notes.exported", { path }));
    } catch (e) {
      toast.error(t("common.errorGeneric"), { description: reportError("documents", "export failed", e) });
    }
  };

  if (!editor) return null;
  const inTable = editor.isActive("table");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1" role="toolbar" aria-label={t("documents.toolbar")}>
        <ToolButton label={t("documents.undo")} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 /></ToolButton>
        <ToolButton label={t("documents.redo")} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 /></ToolButton>
        <span className="mx-1 h-5 w-px bg-border" />
        {([1, 2, 3] as const).map((level) => (
          <ToolButton key={level} label={t("documents.heading", { level })} active={editor.isActive("heading", { level })} onClick={() => editor.chain().focus().toggleHeading({ level }).run()}>
            {level === 1 ? <Heading1 /> : level === 2 ? <Heading2 /> : <Heading3 />}
          </ToolButton>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolButton label={t("documents.bold")} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold /></ToolButton>
        <ToolButton label={t("documents.italic")} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic /></ToolButton>
        <ToolButton label={t("documents.underline")} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon /></ToolButton>
        <ToolButton label={t("documents.strike")} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough /></ToolButton>
        <ToolButton label={t("documents.code")} active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><Code /></ToolButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolButton label={t("documents.bulletList")} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List /></ToolButton>
        <ToolButton label={t("documents.orderedList")} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered /></ToolButton>
        <ToolButton label={t("documents.quote")} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote /></ToolButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={inTable ? "secondary" : "ghost"} size="icon-sm" aria-label={t("documents.table")} onMouseDown={(e) => e.preventDefault()}>
              <TableIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>{t("documents.tableInsert")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!inTable} onSelect={() => editor.chain().focus().addRowAfter().run()}>{t("documents.tableAddRow")}</DropdownMenuItem>
            <DropdownMenuItem disabled={!inTable} onSelect={() => editor.chain().focus().addColumnAfter().run()}>{t("documents.tableAddCol")}</DropdownMenuItem>
            <DropdownMenuItem disabled={!inTable} onSelect={() => editor.chain().focus().deleteRow().run()}>{t("documents.tableDeleteRow")}</DropdownMenuItem>
            <DropdownMenuItem disabled={!inTable} onSelect={() => editor.chain().focus().deleteColumn().run()}>{t("documents.tableDeleteCol")}</DropdownMenuItem>
            <DropdownMenuItem disabled={!inTable} onSelect={() => editor.chain().focus().deleteTable().run()}>{t("documents.tableDelete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ToolButton label={t("documents.image")} onClick={() => void insertImage()}><ImagePlus /></ToolButton>
        <ToolButton label={t("documents.footnote")} active={editor.isActive("footnote")} onClick={openFootnote}><Superscript /></ToolButton>
        <ToolButton label={t("documents.pageBreak")} onClick={() => editor.chain().focus().insertPageBreak().run()}><Scissors /></ToolButton>
        <div className="flex-1" />
        <DocumentAiButton getContext={() => editor.getText()} onInsertHtml={(html) => editor.chain().focus("end").insertContent(html).run()} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="doc-export">
              <Download /> {t("notes.export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void doExport("pdf")}>PDF</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void doExport("docx")}>Word (.docx)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void doExport("md")}>Markdown (.md)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 md:p-8">
        <div className={cn("mx-auto max-w-3xl rounded-lg border bg-background p-8 shadow-xs md:p-12")} data-testid="doc-page" onClick={() => editor.commands.focus()}>
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="flex items-center gap-3 border-t px-3 py-1 text-xs text-muted-foreground" aria-live="polite">
        <span>{t("documents.words", { count: words })}</span>
        <span className="ml-auto">{dirty ? t("notes.saving") : t("notes.savedAt", { time: formatDateTime(savedAt) })}</span>
      </div>
      <PromptDialog
        open={footnotePrompt.open}
        onOpenChange={(o) => setFootnotePrompt((s) => ({ ...s, open: o }))}
        title={t("documents.footnote")}
        label={t("documents.footnoteText")}
        initialValue={footnotePrompt.initial}
        onSubmit={(text) => {
          editor.chain().focus().setFootnote(text).run();
          setFootnotePrompt({ open: false, initial: "" });
        }}
      />
    </div>
  );
}
