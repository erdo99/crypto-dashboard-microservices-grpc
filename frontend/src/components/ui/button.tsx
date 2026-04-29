import * as React from 'react';
import { cn } from '@/lib/utils';

/** Finai-Go Metronic butonlarına yakın ince sarmalayıcı (tam 400+ satırlık button.tsx taşınmadı). */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'md';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-60',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'secondary' && 'bg-muted text-foreground hover:bg-muted/80',
        variant === 'outline' && 'border border-border bg-background hover:bg-accent',
        variant === 'ghost' && 'hover:bg-accent',
        size === 'md' && 'h-9 px-4',
        size === 'sm' && 'h-8 px-3 text-xs',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
