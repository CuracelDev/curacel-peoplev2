'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Underline as UnderlineIcon,
  Undo,
  Redo,
  Link as LinkIcon,
  Link2Off,
  Palette,
  Type,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { useCallback, useEffect, useState } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 underline',
        },
      }),
      Underline,
      TextStyle,
      Color.configure({ types: ['textStyle'] }),
      FontFamily.configure({ types: ['textStyle'] }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[150px] px-3 py-2',
          disabled && 'opacity-50 cursor-not-allowed'
        ),
      },
    },
  })

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className={cn('border rounded-md bg-white', className)}>
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run() || disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('bold') && 'bg-muted'
          )}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run() || disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('italic') && 'bg-muted'
          )}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run() || disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('underline') && 'bg-muted'
          )}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        {/* Color Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetColor().run()}>
              Default
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#000000').run()}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#000000' }} />
                Black
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#ef4444').run()}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#ef4444' }} />
                Red
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#f59e0b').run()}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#f59e0b' }} />
                Orange
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#eab308').run()}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#eab308' }} />
                Yellow
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#22c55e').run()}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#22c55e' }} />
                Green
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#3b82f6').run()}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#3b82f6' }} />
                Blue
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#6366f1').run()}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#6366f1' }} />
                Indigo
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setColor('#a855f7').run()}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: '#a855f7' }} />
                Purple
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Family */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <Type className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()}>
              Default
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Arial').run()}>
              <span style={{ fontFamily: 'Arial' }}>Arial</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Times New Roman').run()}>
              <span style={{ fontFamily: 'Times New Roman' }}>Times New Roman</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Georgia').run()}>
              <span style={{ fontFamily: 'Georgia' }}>Georgia</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Courier New').run()}>
              <span style={{ fontFamily: 'Courier New' }}>Courier New</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Verdana').run()}>
              <span style={{ fontFamily: 'Verdana' }}>Verdana</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-8 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 1 }) && 'bg-muted'
          )}
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 2 }) && 'bg-muted'
          )}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 3 }) && 'bg-muted'
          )}
        >
          <Heading3 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 4 }) && 'bg-muted'
          )}
        >
          <Heading4 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 5 }) && 'bg-muted'
          )}
        >
          <Heading5 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 6 }) && 'bg-muted'
          )}
        >
          <Heading6 className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('bulletList') && 'bg-muted'
          )}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('orderedList') && 'bg-muted'
          )}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('blockquote') && 'bg-muted'
          )}
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setLink}
          disabled={disabled}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('link') && 'bg-muted'
          )}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive('link') || disabled}
          className="h-8 w-8 p-0"
        >
          <Link2Off className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run() || disabled}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run() || disabled}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  )
}
