# Curacel App UI v1

A comprehensive UI/UX design system for the Curacel People HR platform.

---

## Overview

This skill documents the UI/UX patterns, components, colors, typography, and responsive design patterns used throughout the Curacel People application. Use this as a reference when building new features to maintain visual consistency.

---

## Color System

### CSS Custom Properties (HSL)

```css
:root {
  /* Foundation */
  --background: 0 0% 100%;           /* #ffffff - Page background */
  --foreground: 210 27% 8%;          /* #0f1419 - Primary text */

  /* Cards & Surfaces */
  --card: 0 0% 100%;                 /* #ffffff */
  --card-foreground: 240 9% 16%;     /* #24242c */
  --popover: 0 0% 100%;              /* #ffffff */
  --popover-foreground: 240 9% 16%;  /* #24242c */

  /* Primary - Brand Color (Indigo/Blue) */
  --primary: 240 100% 63%;           /* #4040ff - Buttons, active states */
  --primary-foreground: 0 0% 100%;   /* #ffffff */

  /* Secondary */
  --secondary: 220 43% 97%;          /* #f5f7fb - Hover backgrounds */
  --secondary-foreground: 240 9% 16%; /* #24242c */

  /* Muted */
  --muted: 240 2% 90%;               /* #e5e5e6 - Borders, dividers */
  --muted-foreground: 210 27% 8%;    /* #0f1419 - Secondary text */

  /* Accent */
  --accent: 238 71% 79%;             /* #a2a5f2 - Highlights */
  --accent-foreground: 152 67% 11%;  /* #0a2d14 */

  /* Semantic Colors */
  --destructive: 0 74% 42%;          /* #b91c1c - Errors, delete */
  --success: 142 76% 36%;            /* Green - Success states */
  --warning: 38 92% 50%;             /* Amber - Warnings */

  /* Forms */
  --border: 180 15% 88%;             /* #dce4e4 - Input borders */
  --input: 0 0% 100%;                /* #ffffff - Input backgrounds */
  --ring: 240 100% 63%;              /* #4040ff - Focus rings */

  /* Shape */
  --radius: 0.75rem;                 /* 12px - Default border radius */
}
```

### Semantic Color Classes

| Purpose | Background | Text | Example Usage |
|---------|------------|------|---------------|
| Success | `bg-green-100` | `text-green-800` | Status badges, success messages |
| Warning | `bg-yellow-100` | `text-yellow-800` | Warning badges, alerts |
| Error | `bg-red-100` | `text-red-800` | Error states, destructive badges |
| Info | `bg-blue-100` | `text-blue-800` | Info badges, highlights |
| Active | `bg-primary` | `text-white` | Active nav items, primary buttons |
| Muted | `bg-gray-100` | `text-gray-600` | Disabled, inactive states |

---

## Typography

### Font Family
```css
font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

### Text Sizes & Weights

| Element | Classes | Usage |
|---------|---------|-------|
| Page Title | `text-2xl font-semibold` | Main page headings |
| Section Title | `text-lg font-semibold` | Card titles, sections |
| Body Text | `text-sm` | Regular content |
| Small Text | `text-xs` | Labels, hints, metadata |
| Tiny Text | `text-[10px] text-[11px]` | Badges, version numbers |

### Text Colors

| Purpose | Class | Usage |
|---------|-------|-------|
| Primary | `text-gray-900` | Headings, important text |
| Secondary | `text-gray-500` | Descriptions, metadata |
| Muted | `text-gray-400` | Timestamps, hints |
| Link | `text-primary` | Interactive links |

---

## Spacing System

### Padding Patterns

```typescript
// Responsive padding (mobile-first)
RESPONSIVE_PADDING = "px-3 sm:px-4 md:px-6"
RESPONSIVE_PADDING_Y = "py-3 sm:py-4"
RESPONSIVE_PADDING_ALL = "p-3 sm:p-4 md:p-6"
```

### Gap Patterns

```typescript
RESPONSIVE_GAP = "gap-2 sm:gap-3 md:gap-4"
RESPONSIVE_GAP_SM = "gap-2 sm:gap-3"
RESPONSIVE_GAP_LG = "gap-3 sm:gap-4 md:gap-6"
```

### Common Spacing Values

| Size | Value | Usage |
|------|-------|-------|
| xs | `gap-1`, `p-1` | Tight spacing, inline elements |
| sm | `gap-2`, `p-2` | Compact lists, mobile |
| md | `gap-3`, `p-3` | Default mobile padding |
| lg | `gap-4`, `p-4` | Default desktop padding |
| xl | `gap-6`, `p-6` | Section separators |

---

## Component Patterns

### Button Variants

```tsx
// Primary (Default) - Main actions
<Button>Create Job</Button>
// Classes: bg-primary text-white shadow-sm hover:bg-primary/90

// Outline - Secondary actions
<Button variant="outline">Cancel</Button>
// Classes: border border-border bg-background hover:bg-secondary

// Ghost - Tertiary actions
<Button variant="ghost">Edit</Button>
// Classes: hover:bg-secondary hover:text-foreground

// Destructive - Dangerous actions
<Button variant="destructive">Delete</Button>
// Classes: bg-destructive text-white

// Success - Positive confirmations
<Button variant="success">Approve</Button>
// Classes: bg-green-600 text-white
```

### Button Sizes

```tsx
<Button size="sm">Small</Button>    // h-9 px-3
<Button size="default">Default</Button>  // h-10 px-4
<Button size="lg">Large</Button>    // h-11 px-8
<Button size="icon">...</Button>    // h-10 w-10
```

### Badge Variants

```tsx
// Status badges (rounded-full)
<Badge variant="success">Active</Badge>     // bg-green-100 text-green-800
<Badge variant="warning">Pending</Badge>    // bg-yellow-100 text-yellow-800
<Badge variant="destructive">Failed</Badge> // bg-red-100 text-red-800
<Badge variant="info">In Progress</Badge>   // bg-blue-100 text-blue-800

// Custom inline status badges
className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700"
```

### Card Component

```tsx
<Card>
  <CardHeader>  {/* p-4 sm:p-6 */}
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>  {/* p-4 pt-0 sm:p-6 sm:pt-0 */}
    Content here
  </CardContent>
  <CardFooter>  {/* p-4 pt-0 sm:p-6 sm:pt-0 */}
    Actions
  </CardFooter>
</Card>
// Base: rounded-xl border border-border/50 shadow-sm hover:shadow-md
```

### Input Fields

```tsx
<Input className="h-10 rounded-lg border-border" />
<Textarea className="rounded-lg border-border" />
<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>...</SelectContent>
</Select>
```

---

## Layout Patterns

### Sidebar Navigation

```tsx
// Active nav item
className="bg-primary text-white rounded-lg px-3 py-2"

// Inactive nav item
className="text-muted-foreground hover:bg-secondary rounded-lg px-3 py-2"

// Section headers
className="text-[11px] font-semibold text-muted-foreground tracking-wider"

// Badge counts
className="bg-primary text-white rounded-full h-4 min-w-[16px] text-[10px]"
```

### Page Structure

```tsx
<div className="p-3 sm:p-6">
  {/* Header with action button */}
  <div className="flex items-center justify-between mb-4 sm:mb-6">
    <h1 className="text-2xl font-semibold">Page Title</h1>
    <Button>Action</Button>
  </div>

  {/* Content */}
  <Card>...</Card>
</div>
```

### Stats Grid (Dashboard Pattern)

```tsx
// 4-column stats grid
<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-2xl font-bold">42</p>
          <p className="text-sm text-gray-500">Label</p>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
```

### List Items (Clickable Cards)

```tsx
<Link href="/path">
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors">
    <Avatar className="h-10 w-10 flex-shrink-0">
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <p className="font-medium truncate">Title</p>
      <p className="text-sm text-gray-500">Description</p>
    </div>
    <div className="w-full sm:w-48">
      {/* Right side content */}
    </div>
  </div>
</Link>
```

---

## Responsive Patterns

### Breakpoints

| Prefix | Width | Target |
|--------|-------|--------|
| (none) | 0-639px | Mobile phones |
| `sm:` | 640px+ | Large phones |
| `md:` | 768px+ | Tablets |
| `lg:` | 1024px+ | Laptops |
| `xl:` | 1280px+ | Desktops |

### Grid Patterns

```typescript
// 2-column responsive
RESPONSIVE_GRID_2 = "grid-cols-1 sm:grid-cols-2"

// 3-column responsive
RESPONSIVE_GRID_3 = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// 4-column responsive (stats)
RESPONSIVE_GRID_4 = "grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"

// 6-column responsive (settings cards)
RESPONSIVE_GRID_6 = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
```

### Flex Patterns

```typescript
// Stack on mobile, row on desktop
RESPONSIVE_FLEX_COL = "flex flex-col sm:flex-row"

// Wrap when needed
RESPONSIVE_FLEX_WRAP = "flex flex-wrap"
```

### Visibility Patterns

```typescript
// Hide on mobile
HIDDEN_MOBILE = "hidden sm:inline"

// Show only on mobile
VISIBLE_MOBILE_ONLY = "sm:hidden"
```

### Common Responsive Patterns

```tsx
// Fixed width that becomes full on mobile
className="w-full sm:w-48"

// Responsive padding
className="px-3 sm:px-6 py-3 sm:py-4"

// Stack items on mobile
className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"

// Hide icon on mobile
className="hidden sm:flex"
```

---

## Icons

Using **Lucide React** icons consistently throughout the app.

### Common Icons

| Icon | Usage |
|------|-------|
| `Plus` | Create/Add actions |
| `Pencil` / `Edit` | Edit actions |
| `Trash2` | Delete actions |
| `ChevronRight` / `ChevronDown` | Navigation, expand/collapse |
| `Search` | Search inputs |
| `Filter` | Filter controls |
| `MoreHorizontal` | Menu triggers |
| `Loader2` | Loading spinners (with `animate-spin`) |
| `Check` | Success, checkmarks |
| `X` | Close, cancel |
| `AlertCircle` | Warnings, errors |

### Icon Sizes

| Size | Class | Usage |
|------|-------|-------|
| Small | `h-4 w-4` | Inline, buttons |
| Medium | `h-5 w-5` | Navigation, list items |
| Large | `h-6 w-6` | Feature icons |
| XL | `h-8 w-8` | Empty states |

---

## Animation & Transitions

### Standard Transitions

```tsx
// Hover effects
className="transition-all duration-200"

// Shadow transitions
className="shadow-sm hover:shadow-md transition-shadow duration-200"

// Color transitions
className="transition-colors"
```

### Loading States

```tsx
// Spinner
<Loader2 className="h-8 w-8 animate-spin text-primary" />

// Loading container
<div className="flex items-center justify-center py-12">
  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
</div>
```

---

## Empty States

```tsx
<div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
  <Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
  <h3 className="font-semibold text-gray-700 mb-1">No items found</h3>
  <p className="text-sm text-gray-500 mb-4">
    Description text here
  </p>
  <Button>Action</Button>
</div>
```

---

## Forms

### Form Layout

```tsx
<div className="space-y-4">
  <div>
    <Label htmlFor="field">Field Label</Label>
    <Input id="field" className="mt-1" />
  </div>

  <div>
    <Label htmlFor="select">Select Label</Label>
    <Select>
      <SelectTrigger className="mt-1">
        <SelectValue placeholder="Choose..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Option 1</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

### Form Actions

```tsx
<div className="flex justify-end gap-3 pt-4 border-t">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</div>
```

---

## Tables

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="h-10 sm:h-12 px-2 sm:px-4">Header</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-gray-50">
      <TableCell className="p-2 sm:p-4">Content</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## Dialogs & Modals

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description text</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Brand Elements

### Logo & App Name

```tsx
<div className="flex items-center">
  <Logo className="h-8 w-8" />
  <span className="ml-3 text-lg font-semibold text-primary">
    Curacel People
  </span>
  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
    v2
  </span>
</div>
```

### Blue AI Branding

```tsx
// Special AI button styling
className="bg-primary/10 text-primary hover:bg-primary hover:text-white"
```

---

## Best Practices

1. **Mobile-first**: Always start with mobile styles, then add responsive breakpoints
2. **Consistency**: Use the defined color variables and spacing patterns
3. **Accessibility**: Include focus states (`focus:ring-2 focus:ring-primary`)
4. **Transitions**: Add smooth transitions for interactive elements
5. **Truncation**: Use `truncate` class for text that might overflow
6. **Min-width**: Use `min-w-0` on flex children to allow truncation
7. **Flex-shrink**: Use `flex-shrink-0` on fixed-width elements

---

## Files Reference

| File | Purpose |
|------|---------|
| `tailwind.config.ts` | Theme configuration |
| `src/app/globals.css` | CSS variables, base styles |
| `src/lib/responsive.ts` | Responsive utility constants |
| `src/components/ui/*.tsx` | shadcn/ui components |
| `src/components/layout/sidebar.tsx` | Navigation patterns |

---

*Version: 1.0 | Last Updated: December 2024*
