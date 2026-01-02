import * as React from 'react'
import { cn } from '@/lib/utils'

export type SliderProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange'
> & {
  value?: number[]
  defaultValue?: number[]
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onValueChange?: (value: number[]) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, defaultValue, onChange, onValueChange, ...props }, ref) => {
    const rangeProps: React.InputHTMLAttributes<HTMLInputElement> = {
      type: 'range',
      ...props,
    }

    if (Array.isArray(value)) {
      rangeProps.value = value[0] ?? 0
    } else if (Array.isArray(defaultValue)) {
      rangeProps.defaultValue = defaultValue[0] ?? 0
    }

    return (
      <input
        ref={ref}
        {...rangeProps}
        onChange={(event) => {
          onChange?.(event)
          onValueChange?.([Number(event.target.value)])
        }}
        className={cn(
          'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary',
          className
        )}
      />
    )
  }
)

Slider.displayName = 'Slider'

export { Slider }
