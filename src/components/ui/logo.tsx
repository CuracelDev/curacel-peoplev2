import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

export function Logo({ className, width = 32, height = 32, ...props }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Curacel Logo"
      width={width}
      height={height}
      className={cn('object-contain', className)}
      {...props}
    />
  )
}
