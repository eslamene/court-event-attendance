import { Node, mergeAttributes } from "@tiptap/core";

export function createTemplateVariableExtension(
  getLabel: (key: string) => string
) {
  return Node.create({
    name: "templateVariable",
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,

    addAttributes() {
      return {
        key: {
          default: null,
          parseHTML: (element) => element.getAttribute("data-template-var"),
          renderHTML: (attributes) => ({
            "data-template-var": attributes.key,
          }),
        },
      };
    },

    parseHTML() {
      return [{ tag: "span[data-template-var]" }];
    },

    renderHTML({ node }) {
      const key = node.attrs.key as string;
      return [
        "span",
        mergeAttributes({
          "data-template-var": key,
          class: "email-template-var",
          contenteditable: "false",
        }),
        getLabel(key) || key,
      ];
    },

    renderText({ node }) {
      return `{{${node.attrs.key}}}`;
    },
  });
}
