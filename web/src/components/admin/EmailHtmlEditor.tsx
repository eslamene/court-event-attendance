"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { buildEmailEditorExtensions } from "@/components/admin/email-editor-extensions";
import { useI18n } from "@/components/I18nProvider";
import { toEditorHtml, toStorageHtml } from "@/lib/email-template-placeholders";
import { cn } from "@/lib/utils";

export type EmailHtmlEditorHandle = {
  insertText: (text: string) => void;
  focus: () => void;
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  resolvePlaceholderLabel: (key: string) => string;
  className?: string;
};

export const EmailHtmlEditor = forwardRef<EmailHtmlEditorHandle, Props>(
  function EmailHtmlEditor(
    {
      value,
      onChange,
      onFocus,
      placeholder,
      resolvePlaceholderLabel,
      className,
    },
    ref
  ) {
    const { t, direction } = useI18n();
    const [mode, setMode] = useState<"visual" | "code">("visual");
    const [codeValue, setCodeValue] = useState(value);

    const getLabel = useCallback(
      (key: string) => resolvePlaceholderLabel(key),
      [resolvePlaceholderLabel]
    );

    const extensions = useMemo(
      () => [
        ...buildEmailEditorExtensions(getLabel),
        StarterKit.configure({
          document: false,
          paragraph: false,
          heading: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer" },
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
      ],
      [getLabel]
    );

    function insertQrImageBlock() {
      if (!editor || mode === "code") return;
      editor
        .chain()
        .focus()
        .insertContent(
          `<p style="text-align: center; margin: 24px 0;"><img src="/api/qr/test/image" data-template-src="{{qrImageUrl}}" alt="رمز QR" width="280" height="280" style="border:4px solid #5c3d1e;border-radius:8px;display:block;margin:0 auto;" /></p>`
        )
        .run();
    }

    const editor = useEditor({
      immediatelyRender: false,
      extensions,
      content: toEditorHtml(value, getLabel),
      editorProps: {
        attributes: {
          dir: direction,
          "data-placeholder": placeholder ?? "",
          class:
            "prose prose-sm max-w-none min-h-[280px] px-4 py-3 focus:outline-none text-foreground",
        },
      },
      onUpdate: ({ editor: ed }) => {
        onChange(toStorageHtml(ed.getHTML()));
      },
      onFocus: () => onFocus?.(),
    });

    useEffect(() => {
      if (!editor) return;
      const stored = toStorageHtml(editor.getHTML());
      if (value !== stored && value !== normalizeEmpty(stored)) {
        editor.commands.setContent(toEditorHtml(value, getLabel), {
          emitUpdate: false,
        });
      }
    }, [value, editor, getLabel]);

    useEffect(() => {
      if (mode === "code") setCodeValue(value);
    }, [value, mode]);

    useImperativeHandle(ref, () => ({
      insertText(text: string) {
        const match = text.match(/^\{\{(\w+)\}\}$/);
        if (mode === "code") {
          setCodeValue((prev) => {
            const next = prev + text;
            onChange(next);
            return next;
          });
          return;
        }
        if (match && editor) {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "templateVariable",
              attrs: { key: match[1] },
            })
            .run();
          return;
        }
        editor?.chain().focus().insertContent(text).run();
      },
      focus() {
        if (mode === "code") {
          document.getElementById("email-html-code")?.focus();
        } else {
          editor?.chain().focus().run();
        }
      },
    }));

    function switchToCode() {
      if (editor) {
        const html = toStorageHtml(editor.getHTML());
        setCodeValue(html);
        onChange(html);
      }
      setMode("code");
    }

    function switchToVisual() {
      const html = codeValue.trim() || "<p></p>";
      onChange(html);
      editor?.commands.setContent(toEditorHtml(html, getLabel), {
        emitUpdate: false,
      });
      setMode("visual");
    }

    function setLink() {
      if (!editor) return;
      const prev = editor.getAttributes("link").href as string | undefined;
      const url = window.prompt(
        t("admin.emailTemplate.editor.linkPrompt"),
        prev ?? "https://"
      );
      if (url === null) return;
      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }

    return (
      <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-[#f5f0e8] p-1.5">
          <div
            className={cn(
              "flex flex-wrap gap-0.5",
              mode === "code" && "pointer-events-none opacity-40"
            )}
          >
            <ToolbarButton
              label={t("admin.emailTemplate.editor.bold")}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
            >
              <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t("admin.emailTemplate.editor.italic")}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
            >
              <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t("admin.emailTemplate.editor.underline")}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              active={editor?.isActive("underline")}
            >
              <UnderlineIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t("admin.emailTemplate.editor.strike")}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              active={editor?.isActive("strike")}
            >
              <Strikethrough className="size-4" />
            </ToolbarButton>
            <span className="mx-0.5 w-px self-stretch bg-border" />
            <ToolbarButton
              label={t("admin.emailTemplate.editor.heading")}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor?.isActive("heading", { level: 2 })}
            >
              <Pilcrow className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t("admin.emailTemplate.editor.bulletList")}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
            >
              <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t("admin.emailTemplate.editor.orderedList")}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive("orderedList")}
            >
              <ListOrdered className="size-4" />
            </ToolbarButton>
            <span className="mx-0.5 w-px self-stretch bg-border" />
            <ToolbarButton
              label={t("admin.emailTemplate.editor.alignLeft")}
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
              active={editor?.isActive({ textAlign: "left" })}
            >
              <AlignLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t("admin.emailTemplate.editor.alignCenter")}
              onClick={() =>
                editor?.chain().focus().setTextAlign("center").run()
              }
              active={editor?.isActive({ textAlign: "center" })}
            >
              <AlignCenter className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t("admin.emailTemplate.editor.alignRight")}
              onClick={() => editor?.chain().focus().setTextAlign("right").run()}
              active={editor?.isActive({ textAlign: "right" })}
            >
              <AlignRight className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t("admin.emailTemplate.editor.link")}
              onClick={setLink}
              active={editor?.isActive("link")}
            >
              <Link2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t("admin.emailTemplate.editor.insertQrImage")}
              onClick={insertQrImageBlock}
            >
              <ImageIcon className="size-4" />
            </ToolbarButton>
            <span className="mx-0.5 w-px self-stretch bg-border" />
            <ToolbarButton
              label={t("admin.emailTemplate.editor.undo")}
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <Undo2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label={t("admin.emailTemplate.editor.redo")}
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <Redo2 className="size-4" />
            </ToolbarButton>
          </div>

          <div className="ms-auto flex gap-0.5">
            <button
              type="button"
              onClick={() => (mode === "visual" ? switchToCode() : switchToVisual())}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                mode === "code"
                  ? "bg-gold-dark text-white"
                  : "text-gold-dark hover:bg-card"
              )}
            >
              <Code className="size-3.5" />
              {mode === "code"
                ? t("admin.emailTemplate.editor.visualMode")
                : t("admin.emailTemplate.editor.codeMode")}
            </button>
          </div>
        </div>

        {mode === "visual" ? (
          <div className="email-tiptap relative bg-card" onFocus={() => onFocus?.()}>
            <EditorContent editor={editor} />
          </div>
        ) : (
          <textarea
            id="email-html-code"
            value={codeValue}
            onChange={(e) => {
              setCodeValue(e.target.value);
              onChange(e.target.value);
            }}
            onFocus={() => onFocus?.()}
            rows={14}
            dir="ltr"
            spellCheck={false}
            className="w-full resize-y bg-card px-4 py-3 font-mono text-xs leading-relaxed text-foreground focus:outline-none"
            placeholder={placeholder}
          />
        )}
      </div>
    );
  }
);

function ToolbarButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 text-gold-dark transition hover:bg-card",
        active && "bg-card ring-1 ring-gold/40"
      )}
    >
      {children}
    </button>
  );
}

function normalizeEmpty(html: string) {
  const trimmed = html.trim();
  if (trimmed === "" || trimmed === "<p></p>") return "";
  return trimmed;
}
