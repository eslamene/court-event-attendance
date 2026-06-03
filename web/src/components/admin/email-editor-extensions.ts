import { Node, mergeAttributes } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Image from "@tiptap/extension-image";
import Paragraph from "@tiptap/extension-paragraph";
import { createTemplateVariableExtension } from "./template-variable-extension";

const styleAttribute = {
  style: {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute("style"),
    renderHTML: (attributes: { style?: string | null }) =>
      attributes.style ? { style: attributes.style } : {},
  },
};

export const EmailDocument = Document.extend({
  content: "(emailDiv | block)+",
});

export const EmailDiv = Node.create({
  name: "emailDiv",
  group: "block",
  content: "block+",
  addAttributes() {
    return {
      dir: {
        default: null,
        parseHTML: (element) => element.getAttribute("dir"),
        renderHTML: (attributes) =>
          attributes.dir ? { dir: attributes.dir } : {},
      },
      ...styleAttribute,
    };
  },
  parseHTML() {
    return [{ tag: "div" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});

export const StyledParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...styleAttribute,
    };
  },
});

export const StyledHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...styleAttribute,
    };
  },
});

export const EmailTemplateImage = Image.extend({
  name: "image",
  inline: false,
  group: "block",
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) =>
          attributes.width ? { width: attributes.width } : {},
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) =>
          attributes.height ? { height: attributes.height } : {},
      },
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) =>
          attributes.style ? { style: attributes.style } : {},
      },
      templateSrc: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-template-src") ??
          (() => {
            const src = element.getAttribute("src") ?? "";
            const m = src.match(/^\{\{(\w+)\}\}$/);
            return m ? src : null;
          })(),
        renderHTML: (attributes) => {
          const out: Record<string, string> = {};
          if (attributes.templateSrc) {
            out["data-template-src"] = attributes.templateSrc as string;
          }
          return out;
        },
      },
    };
  },
});

export function buildEmailEditorExtensions(getLabel: (key: string) => string) {
  return [
    EmailDocument,
    EmailDiv,
    StyledParagraph,
    StyledHeading.configure({ levels: [2, 3] }),
    EmailTemplateImage.configure({
      allowBase64: true,
      HTMLAttributes: {
        class: "email-editor-image",
      },
    }),
    createTemplateVariableExtension(getLabel),
  ];
}
