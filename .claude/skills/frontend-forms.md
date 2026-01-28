# Frontend Forms & State Management

Form handling patterns, validation, and state management in Curacel People.

---

## Form State Pattern

### Basic Form with useState

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function BasicForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Submit logic
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Enter name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="Enter email"
        />
      </div>

      <Button type="submit">Submit</Button>
    </form>
  )
}
```

---

## Form Components

### Select Dropdown

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

<div className="space-y-2">
  <Label>Department</Label>
  <Select
    value={formData.department || 'none'}
    onValueChange={(value) => handleChange('department', value === 'none' ? '' : value)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select department" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Select...</SelectItem>
      <SelectItem value="engineering">Engineering</SelectItem>
      <SelectItem value="sales">Sales</SelectItem>
      <SelectItem value="marketing">Marketing</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Checkbox

```tsx
import { Checkbox } from '@/components/ui/checkbox'

<label className="flex items-center gap-3 cursor-pointer">
  <Checkbox
    checked={formData.isActive}
    onCheckedChange={(checked) => handleChange('isActive', !!checked)}
  />
  <span className="text-sm">Active employee</span>
</label>
```

### Switch Toggle

```tsx
import { Switch } from '@/components/ui/switch'

<div className="flex items-center justify-between gap-3">
  <div>
    <Label className="text-sm font-medium">Enable notifications</Label>
    <p className="text-xs text-gray-500">Receive email updates</p>
  </div>
  <Switch
    checked={formData.notifications}
    onCheckedChange={(checked) => handleChange('notifications', checked)}
  />
</div>
```

### Textarea

```tsx
import { Textarea } from '@/components/ui/textarea'

<div className="space-y-2">
  <Label htmlFor="notes">Notes</Label>
  <Textarea
    id="notes"
    value={formData.notes}
    onChange={(e) => handleChange('notes', e.target.value)}
    placeholder="Add any notes..."
    rows={4}
  />
</div>
```

### Date Picker

```tsx
<div className="space-y-2">
  <Label htmlFor="startDate">Start Date</Label>
  <Input
    id="startDate"
    type="date"
    value={formData.startDate}
    onChange={(e) => handleChange('startDate', e.target.value)}
  />
</div>
```

---

## Multi-Select Patterns

### Tag/Badge Selection

```tsx
const [selectedTags, setSelectedTags] = useState<string[]>([])

const toggleTag = (tag: string) => {
  setSelectedTags(prev =>
    prev.includes(tag)
      ? prev.filter(t => t !== tag)
      : [...prev, tag]
  )
}

const removeTag = (tag: string) => {
  setSelectedTags(prev => prev.filter(t => t !== tag))
}

// Display selected
<div className="flex flex-wrap gap-2 mb-4">
  {selectedTags.map(tag => (
    <Badge
      key={tag}
      variant="secondary"
      className="gap-1 cursor-pointer"
      onClick={() => removeTag(tag)}
    >
      {tag}
      <X className="h-3 w-3" />
    </Badge>
  ))}
</div>

// Selection grid
<div className="grid grid-cols-2 gap-2">
  {availableTags.map(tag => (
    <button
      key={tag}
      type="button"
      onClick={() => toggleTag(tag)}
      className={cn(
        'p-3 border rounded-lg text-left transition-all',
        selectedTags.includes(tag)
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          'w-4 h-4 rounded flex items-center justify-center',
          selectedTags.includes(tag)
            ? 'bg-primary text-white'
            : 'border-2 border-gray-300'
        )}>
          {selectedTags.includes(tag) && <Check className="h-3 w-3" />}
        </div>
        <span className="text-sm">{tag}</span>
      </div>
    </button>
  ))}
</div>
```

### Searchable Multi-Select

```tsx
const [search, setSearch] = useState('')
const [selected, setSelected] = useState<string[]>([])
const [dropdownOpen, setDropdownOpen] = useState(false)

const filteredOptions = useMemo(() => {
  if (!search.trim()) return options
  return options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )
}, [options, search])

<div className="relative">
  <Input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    onFocus={() => setDropdownOpen(true)}
    onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
    placeholder="Search..."
  />

  {dropdownOpen && (
    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
      {filteredOptions.map(option => (
        <button
          key={option.value}
          type="button"
          className={cn(
            'w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between',
            selected.includes(option.value) && 'bg-indigo-50'
          )}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            toggleSelection(option.value)
            setSearch('')
          }}
        >
          <span className="text-sm">{option.label}</span>
          {selected.includes(option.value) && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </button>
      ))}
    </div>
  )}
</div>
```

---

## Validation

### Client-Side Validation

```tsx
const [errors, setErrors] = useState<Record<string, string>>({})

const validate = () => {
  const newErrors: Record<string, string> = {}

  if (!formData.name.trim()) {
    newErrors.name = 'Name is required'
  }

  if (!formData.email.trim()) {
    newErrors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    newErrors.email = 'Invalid email format'
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!validate()) return
  // Submit
}

// In form
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    value={formData.email}
    onChange={(e) => handleChange('email', e.target.value)}
    className={errors.email ? 'border-red-500' : ''}
  />
  {errors.email && (
    <p className="text-sm text-red-500">{errors.email}</p>
  )}
</div>
```

### Validation Feedback Banner

```tsx
const [saveState, setSaveState] = useState<{
  type: 'success' | 'error'
  message: string
} | null>(null)

// After validation or submit
{saveState && (
  <div className={cn(
    'mb-4 rounded-lg border px-4 py-3 text-sm',
    saveState.type === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-green-200 bg-green-50 text-green-700'
  )}>
    {saveState.message}
  </div>
)}
```

---

## Form Submission

### With tRPC Mutation

```tsx
const createItem = trpc.item.create.useMutation()
const [isSaving, setIsSaving] = useState(false)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!validate()) return

  setIsSaving(true)
  try {
    const result = await createItem.mutateAsync(formData)
    setSaveState({ type: 'success', message: 'Created successfully!' })
    router.push(`/items/${result.id}`)
  } catch (error) {
    setSaveState({
      type: 'error',
      message: error instanceof Error ? error.message : 'Failed to save'
    })
  } finally {
    setIsSaving(false)
  }
}

<Button type="submit" disabled={isSaving}>
  {isSaving ? 'Saving...' : 'Save'}
</Button>
```

### Draft vs Publish

```tsx
const [saveTarget, setSaveTarget] = useState<'draft' | 'publish' | null>(null)

const handleSave = async (target: 'draft' | 'publish') => {
  setSaveTarget(target)

  const validationError = target === 'draft'
    ? validateDraft()
    : validatePublish()

  if (validationError) {
    setSaveState({ type: 'error', message: validationError })
    setSaveTarget(null)
    return
  }

  try {
    await saveMutation.mutateAsync({
      ...formData,
      status: target === 'draft' ? 'DRAFT' : 'ACTIVE',
    })
    setSaveState({
      type: target,
      message: target === 'draft'
        ? 'Draft saved!'
        : 'Published successfully!'
    })
  } catch (error) {
    setSaveState({ type: 'error', message: 'Failed to save' })
  } finally {
    setSaveTarget(null)
  }
}

<div className="flex gap-3">
  <Button
    variant="outline"
    onClick={() => handleSave('draft')}
    disabled={saveTarget !== null}
  >
    {saveTarget === 'draft' ? 'Saving...' : 'Save as Draft'}
  </Button>
  <Button
    onClick={() => handleSave('publish')}
    disabled={saveTarget !== null}
  >
    {saveTarget === 'publish' ? 'Publishing...' : 'Publish'}
  </Button>
</div>
```

---

## Form Layout Patterns

### Two-Column Form

```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label>First Name</Label>
    <Input value={formData.firstName} onChange={...} />
  </div>
  <div className="space-y-2">
    <Label>Last Name</Label>
    <Input value={formData.lastName} onChange={...} />
  </div>
</div>
```

### Sectioned Form with Numbers

```tsx
<div className="bg-white border border-gray-200 rounded-xl">
  <div className="p-5 border-b border-gray-200 flex items-center gap-3">
    <div className="w-7 h-7 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
      1
    </div>
    <h2 className="font-semibold">Basic Information</h2>
  </div>
  <div className="p-5 space-y-4">
    {/* Form fields */}
  </div>
</div>
```

### Form with Preview Sidebar

```tsx
<div className="grid grid-cols-[1fr_300px] gap-4">
  {/* Form Column */}
  <div className="space-y-4">
    {/* Form sections */}
  </div>

  {/* Preview Sidebar */}
  <div className="sticky top-20">
    <div className="bg-white border rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Preview</h3>
      {/* Live preview of form data */}
    </div>
  </div>
</div>
```

---

## Dialog Forms

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const [isOpen, setIsOpen] = useState(false)

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Create Item</DialogTitle>
      <DialogDescription>
        Fill in the details below.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">
      {/* Form fields */}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? 'Creating...' : 'Create'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Form Actions Footer

```tsx
<div className="flex justify-end gap-3 pt-4 border-t">
  <Button variant="outline" onClick={() => router.back()}>
    Cancel
  </Button>
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'Saving...' : 'Save'}
  </Button>
</div>
```

---

## Best Practices

1. **Use controlled inputs** - Always use value + onChange
2. **Show validation errors inline** - Near the relevant field
3. **Disable submit while saving** - Prevent double submissions
4. **Provide feedback** - Success/error messages after actions
5. **Support keyboard navigation** - Forms should work with Tab/Enter
6. **Handle loading states** - Show loading indicators during async operations
7. **Use proper input types** - email, number, date, etc.

---

*Version: 1.0 | Last Updated: December 2024*
