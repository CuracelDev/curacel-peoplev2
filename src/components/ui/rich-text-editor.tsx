'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { 
  Bold, 
  Italic, 
  List, 
  Link as LinkIcon,
  Type,
  Quote,
  Code,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eraser,
  Undo,
  Redo
} from 'lucide-react'
import { Button } from './button'

export interface RichTextEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ className, value = '', onChange, placeholder, ...props }, ref) => {
    const editorRef = React.useRef<HTMLDivElement>(null)
    const [internalValue, setInternalValue] = React.useState(value)

    React.useImperativeHandle(ref, () => editorRef.current!)

    React.useEffect(() => {
      if (value !== undefined && editorRef.current) {
        if (editorRef.current.innerHTML !== value) {
          editorRef.current.innerHTML = value
          setInternalValue(value)
        }
      }
    }, [value])

    const handleInput = () => {
      if (editorRef.current) {
        const html = editorRef.current.innerHTML
        setInternalValue(html)
        onChange?.(html)
      }
    }

    const execCommand = (command: string, value?: string) => {
      document.execCommand(command, false, value)
      editorRef.current?.focus()
      handleInput()
    }

    const handleBold = () => execCommand('bold')
    const handleItalic = () => execCommand('italic')
    const handleLink = () => {
      const url = prompt('Enter URL:')
      if (url) {
        execCommand('createLink', url)
      }
    }
    const handleHeading = () => execCommand('formatBlock', '<h2>')
    const handleQuote = () => execCommand('formatBlock', '<blockquote>')
    const handleCode = () => execCommand('formatBlock', '<pre>')
    const handleUnorderedList = () => execCommand('insertUnorderedList')
    const handleOrderedList = () => execCommand('insertOrderedList')
    const handleAlignLeft = () => execCommand('justifyLeft')
    const handleAlignCenter = () => execCommand('justifyCenter')
    const handleAlignRight = () => execCommand('justifyRight')
    const handleRemoveFormat = () => execCommand('removeFormat')
    const handleUndo = () => execCommand('undo')
    const handleRedo = () => execCommand('redo')

    return (
      <div className={cn('border border-border rounded-lg focus-within:ring-2 focus-within:ring-primary', className)}>
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/50 rounded-t-lg flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleBold}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleItalic}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleLink}
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleHeading}
            title="Heading"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleQuote}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleCode}
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleUnorderedList}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleOrderedList}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleAlignLeft}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleAlignCenter}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleAlignRight}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleRemoveFormat}
            title="Clear Formatting"
          >
            <Eraser className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleUndo}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleRedo}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
        
        {/* ContentEditable Editor */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="min-h-[200px] p-4 rounded-b-lg focus:outline-none prose prose-sm max-w-none rich-text-editor-content"
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          data-placeholder={placeholder}
          suppressContentEditableWarning
          {...props}
        />
      </div>
    )
  }
)
RichTextEditor.displayName = 'RichTextEditor'

export { RichTextEditor }
