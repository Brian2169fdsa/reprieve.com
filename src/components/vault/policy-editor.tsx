'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import type { JSONContent } from '@tiptap/react';

interface PolicyEditorProps {
  content: JSONContent | null;
  onChange?: (json: JSONContent, html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      title={title}
      disabled={disabled}
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        border: 'none',
        background: active ? '#E8F6FA' : 'transparent',
        color: active ? '#2A8BA8' : disabled ? '#D4D4D4' : '#404040',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        lineHeight: 1,
        minWidth: '28px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        gap: '4px',
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: '1px',
        height: '20px',
        background: '#E8E8E8',
        margin: '0 4px',
        flexShrink: 0,
      }}
    />
  );
}

export default function PolicyEditor({
  content,
  onChange,
  readOnly = false,
  placeholder = 'Start writing your policy...',
}: PolicyEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight,
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: content ?? undefined,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON(), editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return (
      <div
        style={{
          border: '1px solid #D4D4D4',
          borderRadius: '6px',
          minHeight: '480px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#A3A3A3',
          fontSize: '14px',
        }}
      >
        Loading editor…
      </div>
    );
  }

  const inTable = editor.isActive('table');

  return (
    <div
      className="policy-editor-wrap"
      style={{
        border: '1px solid #D4D4D4',
        borderRadius: '6px',
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <style>{`
        .policy-editor-wrap .ProseMirror {
          outline: none;
          min-height: 480px;
          padding: 24px 28px;
          font-size: 14px;
          line-height: 1.75;
          color: #262626;
          font-family: 'Source Sans 3', system-ui, sans-serif;
        }
        .policy-editor-wrap .ProseMirror > * + * { margin-top: 0.75em; }
        .policy-editor-wrap .ProseMirror h1 {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 22px; font-weight: 700; color: #171717;
          margin: 24px 0 8px; line-height: 1.3;
        }
        .policy-editor-wrap .ProseMirror h2 {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 17px; font-weight: 600; color: #262626;
          margin: 20px 0 6px; line-height: 1.3;
        }
        .policy-editor-wrap .ProseMirror h3 {
          font-family: 'Source Serif 4', Georgia, serif;
          font-size: 14px; font-weight: 600; color: #404040;
          margin: 16px 0 4px; line-height: 1.3;
          text-transform: uppercase; letter-spacing: 0.03em;
        }
        .policy-editor-wrap .ProseMirror p { margin: 0 0 8px; }
        .policy-editor-wrap .ProseMirror ul,
        .policy-editor-wrap .ProseMirror ol { padding-left: 24px; margin: 0 0 10px; }
        .policy-editor-wrap .ProseMirror li { margin-bottom: 4px; }
        .policy-editor-wrap .ProseMirror strong { font-weight: 600; }
        .policy-editor-wrap .ProseMirror em { font-style: italic; }
        .policy-editor-wrap .ProseMirror u { text-decoration: underline; }
        .policy-editor-wrap .ProseMirror mark { background: #FEF9C3; padding: 1px 2px; border-radius: 2px; }
        .policy-editor-wrap .ProseMirror hr {
          border: none; border-top: 2px solid #E8E8E8; margin: 20px 0;
        }
        .policy-editor-wrap .ProseMirror table {
          border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px;
        }
        .policy-editor-wrap .ProseMirror th,
        .policy-editor-wrap .ProseMirror td {
          border: 1px solid #D4D4D4; padding: 8px 12px; vertical-align: top;
          position: relative;
        }
        .policy-editor-wrap .ProseMirror th {
          background: #F5F5F5; font-weight: 600;
        }
        .policy-editor-wrap .ProseMirror .selectedCell::after {
          content: ''; position: absolute; inset: 0;
          background: rgba(59, 167, 201, 0.1); pointer-events: none;
        }
        .policy-editor-wrap .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #A3A3A3; pointer-events: none; float: left; height: 0;
        }
      `}</style>

      {!readOnly && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '2px',
            padding: '8px 10px',
            borderBottom: '1px solid #E8E8E8',
            background: '#FAFAFA',
          }}
        >
          {/* Headings */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            H1
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            H2
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            H3
          </ToolbarBtn>

          <Divider />

          {/* Text formatting */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <strong>B</strong>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <em>I</em>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          >
            <span style={{ textDecoration: 'underline' }}>U</span>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive('highlight')}
            title="Highlight"
          >
            <span style={{ background: '#FEF9C3', padding: '0 2px', borderRadius: '2px' }}>
              HL
            </span>
          </ToolbarBtn>

          <Divider />

          {/* Lists */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            ≡ List
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Ordered List"
          >
            1. List
          </ToolbarBtn>

          <Divider />

          {/* Table */}
          <ToolbarBtn
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            title="Insert Table"
          >
            ⊞ Table
          </ToolbarBtn>

          {inTable && (
            <>
              <ToolbarBtn
                onClick={() => editor.chain().focus().addRowAfter().run()}
                title="Add Row Below"
              >
                +Row
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                title="Add Column Right"
              >
                +Col
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().deleteRow().run()}
                title="Delete Row"
              >
                −Row
              </ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().deleteColumn().run()}
                title="Delete Column"
              >
                −Col
              </ToolbarBtn>
            </>
          )}

          <Divider />

          {/* HR */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            ― HR
          </ToolbarBtn>

          <Divider />

          {/* History */}
          <ToolbarBtn
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
            disabled={!editor.can().undo()}
          >
            ↩ Undo
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
            disabled={!editor.can().redo()}
          >
            ↪ Redo
          </ToolbarBtn>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
