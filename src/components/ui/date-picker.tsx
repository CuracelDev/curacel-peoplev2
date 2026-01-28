import * as React from 'react'
import { Calendar } from 'lucide-react'
import { Input } from './input'
import { cn } from '@/lib/utils'

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

function mergeRefs<T>(...refs: Array<React.Ref<T>>) {
  return (value: T) => {
    refs.forEach((ref) => {
      if (!ref) return
      if (typeof ref === 'function') {
        ref(value)
      } else {
        // @ts-expect-error - acceptable ref assignment
        ref.current = value
      }
    })
  }
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement>(null)

    const openPicker = () => {
      const node = innerRef.current
      if (!node) return
      // Native picker where supported (Chrome, Edge); fallback to focus
      const maybePicker = node as HTMLInputElement & { showPicker?: () => void }
      if (typeof maybePicker.showPicker === 'function') {
        maybePicker.showPicker()
      } else {
        node.focus()
      }
    }

    return (
      <div className="relative">
        <Input
          type="date"
          placeholder="dd/mm/yy"
          className={cn('ring-border focus:ring-primary pr-10', className)}
          ref={mergeRefs(innerRef, forwardedRef)}
          {...props}
        />
        <button
          type="button"
          onClick={openPicker}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
          aria-label="Open date picker"
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>
    )
  }
)
DatePicker.displayName = 'DatePicker'

export { DatePicker }
