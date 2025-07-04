'use client'

import { type FC, type JSX } from 'react'
import { cn } from '@/lib/utils'
 
import { type HeadingProps } from './types'
import { HEADING_SIZES } from './constants'

const Heading: FC<HeadingProps> = ({ children, size, fontSize, className }) => {
  const Tag = `h${size}` as keyof JSX.IntrinsicElements

  return (
    <Tag
      className={cn(
        'flex items-center gap-x-3 font-semibold',
        fontSize ? HEADING_SIZES[fontSize] : HEADING_SIZES[size],
        className
      )}
    >
      {children}
    </Tag>
  )
}

export default Heading
