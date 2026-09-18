import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    footnote: {
      /** Insert a footnote at the cursor (or update the selected one). */
      setFootnote: (text: string) => ReturnType;
    };
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
  }
}

/**
 * Inline footnote: an atom node that carries its text as an attribute and is
 * rendered as a superscript number (numbering via CSS counter). Exports
 * collect all footnotes in document order.
 */
export const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { text: { default: "", parseHTML: (el) => el.getAttribute("data-footnote") ?? "", renderHTML: (attrs) => ({ "data-footnote": attrs.text }) } };
  },
  parseHTML() {
    return [{ tag: "sup[data-footnote]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes, { class: "footnote-ref", title: HTMLAttributes["data-footnote"] })];
  },
  addCommands() {
    return {
      setFootnote:
        (text) =>
        ({ chain, state }) => {
          const { selection } = state;
          const node = "node" in selection ? (selection as { node?: { type: { name: string } } }).node : undefined;
          if (node && node.type.name === this.name) {
            return chain().updateAttributes(this.name, { text }).run();
          }
          return chain().insertContent({ type: this.name, attrs: { text } }).run();
        },
    };
  },
});

/** Manual page break (exported as a real page break in PDF and DOCX). */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },
  renderHTML() {
    return ["div", { "data-page-break": "true", "data-label": "Seitenumbruch · Page break", class: "page-break", contenteditable: "false" }];
  },
  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ chain }) =>
          chain().insertContent({ type: this.name }).createParagraphNear().run(),
    };
  },
});
