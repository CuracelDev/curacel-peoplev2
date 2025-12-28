'use client'

import { useState } from 'react'
import { Input } from './input'
import { Button } from './button'
import { Label } from './label'
import { useUploadThing } from '@/lib/uploadthing'
import { Upload, X, File, ExternalLink } from 'lucide-react'

interface DocumentUploadProps {
  label: string
  helpText?: string
  value: string
  onChange: (url: string) => void
  accept?: string
}

export function DocumentUpload({
  label,
  helpText,
  value,
  onChange,
  accept = '.pdf,image/*',
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('file')
  const [urlInput, setUrlInput] = useState(value || '')

  const { startUpload } = useUploadThing('employeeDocuments', {
    onClientUploadComplete: (files) => {
      if (files && files[0]) {
        onChange(files[0].url)
        setUploading(false)
      }
    },
    onUploadError: (error) => {
      console.error('Upload error:', error)
      setUploading(false)
      alert(`Upload failed: ${error.message}`)
    },
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      await startUpload([file])
    } catch (error) {
      console.error('Upload error:', error)
      setUploading(false)
    }
  }

  const handleUrlSubmit = () => {
    onChange(urlInput)
  }

  const clearFile = () => {
    onChange('')
    setUrlInput('')
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <File className="h-4 w-4 text-green-600" />
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-700 hover:underline flex-1 truncate"
          >
            {value.includes('uploadthing')
              ? 'Uploaded document'
              : value.length > 50
                ? value.substring(0, 50) + '...'
                : value}
            <ExternalLink className="inline-block ml-1 h-3 w-3" />
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFile}
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 border-b pb-2">
            <Button
              type="button"
              variant={uploadMode === 'file' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('file')}
            >
              <Upload className="mr-1 h-3 w-3" />
              Upload File
            </Button>
            <Button
              type="button"
              variant={uploadMode === 'url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUploadMode('url')}
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Paste URL
            </Button>
          </div>

          {uploadMode === 'file' ? (
            <div>
              <div className="relative">
                <input
                  type="file"
                  accept={accept}
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {uploading && (
                <p className="text-xs text-blue-600 mt-2">Uploading...</p>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://drive.google.com/..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
              <Button
                type="button"
                onClick={handleUrlSubmit}
                disabled={!urlInput}
                size="sm"
              >
                Add
              </Button>
            </div>
          )}
        </div>
      )}

      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
    </div>
  )
}
