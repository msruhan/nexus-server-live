'use client'

import * as React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-[11px] font-bold transition-colors ${
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-line bg-paper text-ink hover:border-ink'
      } disabled:opacity-50`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'min-h-[220px] w-full rounded-lg border border-line bg-paper px-4 py-3 text-sm leading-6 focus:outline-none',
        'data-placeholder': placeholder ?? '',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  React.useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== (value || '')) editor.commands.setContent(value || '', { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  const can = editor?.can()

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-line bg-paper-50 p-2">
        <ToolbarButton
          title="Bold"
          disabled={!can?.toggleBold?.()}
          active={editor?.isActive('bold')}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          disabled={!can?.toggleItalic?.()}
          active={editor?.isActive('italic')}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          disabled={!can?.toggleUnderline?.()}
          active={editor?.isActive('underline')}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          U
        </ToolbarButton>
        <ToolbarButton
          title="Strike"
          disabled={!can?.toggleStrike?.()}
          active={editor?.isActive('strike')}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          S
        </ToolbarButton>

        <span className="mx-1 h-6 w-px bg-line" />

        <ToolbarButton
          title="H1"
          active={editor?.isActive('heading', { level: 1 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          title="H2"
          active={editor?.isActive('heading', { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="H3"
          active={editor?.isActive('heading', { level: 3 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>

        <span className="mx-1 h-6 w-px bg-line" />

        <ToolbarButton
          title="Bullet list"
          active={editor?.isActive('bulletList')}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor?.isActive('orderedList')}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          active={editor?.isActive('blockquote')}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          “ Quote
        </ToolbarButton>

        <span className="mx-1 h-6 w-px bg-line" />

        <ToolbarButton
          title="Align left"
          active={editor?.isActive({ textAlign: 'left' })}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        >
          ⬅︎
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor?.isActive({ textAlign: 'center' })}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        >
          ⬍
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor?.isActive({ textAlign: 'right' })}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        >
          ➡︎
        </ToolbarButton>
        <ToolbarButton
          title="Justify"
          active={editor?.isActive({ textAlign: 'justify' })}
          onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
        >
          ☰
        </ToolbarButton>

        <span className="mx-1 h-6 w-px bg-line" />

        <label className="inline-flex items-center gap-2 rounded-md border border-line bg-paper px-2 py-1 text-[11px] font-bold text-ink hover:border-ink">
          Color
          <input
            type="color"
            value={(editor?.getAttributes('textStyle')?.color as string) ?? '#111827'}
            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
            className="h-5 w-5 cursor-pointer rounded"
          />
        </label>

        <ToolbarButton
          title="Set link"
          active={editor?.isActive('link')}
          onClick={() => {
            const prev = editor?.getAttributes('link')?.href as string | undefined
            const url = window.prompt('Link URL', prev ?? '')
            if (!editor) return
            if (url === null) return
            if (!url.trim()) {
              editor.chain().focus().unsetLink().run()
              return
            }
            editor.chain().focus().setLink({ href: url.trim() }).run()
          }}
        >
          Link
        </ToolbarButton>
        <ToolbarButton
          title="Remove link"
          onClick={() => editor?.chain().focus().unsetLink().run()}
          disabled={!editor?.isActive('link')}
        >
          Unlink
        </ToolbarButton>

        <span className="mx-1 h-6 w-px bg-line" />

        <ToolbarButton
          title="Undo"
          disabled={!can?.undo?.()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          ↶
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          disabled={!can?.redo?.()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          ↷
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}

