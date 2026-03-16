'use client'

import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  showPasswordToggle?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      success,
      hint,
      leftIcon,
      rightIcon,
      showPasswordToggle,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const actualType = isPassword && showPassword ? 'text' : type

    return (
      <div className="w-full">
        {label ? <label className="mb-1.5 block text-sm font-medium text-brand-text">{label}</label> : null}
        <div className="relative">
          {leftIcon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted">{leftIcon}</span> : null}
          <input
            ref={ref}
            type={actualType}
            disabled={disabled}
            suppressHydrationWarning
            className={cn(
              'w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-brand-text transition-colors',
              'placeholder:text-brand-text-muted focus:border-brand-accent focus:outline-none',
              leftIcon && 'pl-10',
              (rightIcon || (isPassword && showPasswordToggle)) && 'pr-10',
              error ? 'border-red-400' : success ? 'border-green-500' : 'border-brand-border',
              disabled && 'cursor-not-allowed bg-brand-bg-muted text-brand-text-muted',
              className,
            )}
            {...props}
          />
          {isPassword && showPasswordToggle ? (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          ) : null}
          {!isPassword && rightIcon ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted">{rightIcon}</span> : null}
        </div>
        {error || success || hint ? (
          <p
            className={cn(
              'mt-1.5 flex items-center gap-1 text-xs',
              error && 'text-red-600',
              success && 'text-green-600',
              hint && !error && !success && 'text-brand-text-muted',
            )}
            aria-live={error ? 'assertive' : 'polite'}
          >
            {error ? <AlertCircle className="h-3.5 w-3.5" /> : null}
            {success ? <CheckCircle className="h-3.5 w-3.5" /> : null}
            {error || success || hint}
          </p>
        ) : null}
      </div>
    )
  },
)

Input.displayName = 'Input'
