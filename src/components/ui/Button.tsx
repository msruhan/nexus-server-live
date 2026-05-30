'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'group relative inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-colors duration-200 select-none disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 focus-visible:ring-offset-paper',
  {
    variants: {
      variant: {
        // Primary: solid ink with electric blue undercoat reveal on hover
        primary:
          'bg-ink text-paper hover:bg-primary-600 shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset]',
        // Accent: electric blue with subtle glow
        electric:
          'bg-primary-500 text-white hover:bg-primary-600 shadow-glow-blue',
        // Ghost: just text with arrow underline animation
        ghost:
          'text-ink hover:text-primary-600',
        // Outline: thin border, minimal
        outline:
          'border border-ink/15 text-ink hover:border-ink hover:bg-ink hover:text-paper',
      },
      size: {
        sm: 'h-9 px-4 text-xs rounded-full',
        md: 'h-11 px-5 text-sm rounded-full',
        lg: 'h-13 px-7 text-sm rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = HTMLMotionProps<'button'> & VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
Button.displayName = 'Button';
