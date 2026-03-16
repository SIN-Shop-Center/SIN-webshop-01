'use client'

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Spinner } from './Spinner'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'cta-primary shadow-sm',
  secondary: 'rounded-full border border-black bg-black text-white hover:bg-zinc-800',
  outline: 'cta-secondary',
  ghost: 'rounded-full bg-transparent text-brand-text hover:bg-black/5',
  danger: 'rounded-full bg-red-600 text-white hover:bg-red-700',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm min-h-[2.75rem]',
  md: 'px-5 py-2.5 text-sm min-h-[3rem]',
  lg: 'px-7 py-3 text-base min-h-[3.25rem]',
  xl: 'px-8 py-3.5 text-lg min-h-[3.5rem]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.01 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.99 }}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150',
          'disabled:cursor-not-allowed disabled:opacity-55',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size={size === 'sm' ? 'sm' : 'md'} />
            <span>Wird verarbeitet...</span>
          </>
        ) : (
          <>
            {leftIcon ? <span className="flex-shrink-0">{leftIcon}</span> : null}
            {children}
            {rightIcon ? <span className="flex-shrink-0">{rightIcon}</span> : null}
          </>
        )}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'
