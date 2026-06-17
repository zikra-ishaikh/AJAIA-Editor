'use client';

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Terminal,
} from 'lucide-react';

interface TiptapEditorProps {
  content: any;
  onChange: (json: any) => void;
  editable?: boolean;
}

export default function TiptapEditor({ content, onChange, editable = true }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: content || { type: 'doc', content: [{ type: 'paragraph' }] },
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-zinc dark:prose-invert max-w-none focus:outline-none min-h-[300px] text-zinc-100 p-4 leading-relaxed',
      },
    },
  });

  // Track the current document content to prevent feedback loops
  const contentRef = useRef(JSON.stringify(content));

  useEffect(() => {
    if (!editor) return;

    const currentString = JSON.stringify(content);
    if (currentString !== contentRef.current) {
      contentRef.current = currentString;
      // We set the content without triggering another onUpdate cycle if possible
      // or we just set it since useEditor was initialized
      editor.commands.setContent(content || { type: 'doc', content: [{ type: 'paragraph' }] }, { emitUpdate: false });
    }
  }, [content, editor]);

  // Sync editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[350px] border border-zinc-800/80 rounded-xl bg-zinc-900/10 backdrop-blur-md">
        <span className="text-zinc-500 text-sm animate-pulse tracking-wide font-medium">Initializing Editor...</span>
      </div>
    );
  }

  const MenuButton = ({
    onClick,
    isActive,
    disabled,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-all cursor-pointer border ${
        isActive
          ? 'bg-indigo-600/10 text-indigo-300 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.08)]'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border-transparent'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-zinc-850/60 rounded-xl bg-zinc-900/10 backdrop-blur-xl overflow-hidden flex flex-col flex-1 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.4)]">
      {/* Toolbar */}
      {editable && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-zinc-950/40 border-b border-zinc-850/60 backdrop-blur-xl">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </MenuButton>

        <div className="w-[1px] h-5 bg-zinc-800 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </MenuButton>

        <div className="w-[1px] h-5 bg-zinc-800 mx-1" />

        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Terminal className="w-4 h-4" />
        </MenuButton>

        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </MenuButton>

        <div className="w-[1px] h-5 bg-zinc-800 mx-1 flex-grow sm:flex-grow-0" />

        <div className="flex items-center gap-1 sm:ml-auto">
          <MenuButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </MenuButton>

          <MenuButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </MenuButton>
        </div>
      </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 bg-zinc-950/20 overflow-y-auto max-h-[calc(100vh-250px)] min-h-[350px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
