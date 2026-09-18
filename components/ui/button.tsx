// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '../../lib/utils/cn';

const buttonVariants = cva('flex-row items-center justify-center rounded-lg', {
  variants: {
    variant: {
      default: 'bg-primary',
      destructive: 'bg-destructive',
      outline: 'border border-border bg-background',
      ghost: 'bg-transparent',
    },
    size: {
      default: 'h-12 px-4',
      sm: 'h-10 px-3',
      lg: 'h-14 px-6',
      icon: 'h-12 w-12',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const textVariants = cva('text-base font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      ghost: 'text-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    children: React.ReactNode;
    className?: string;
  };

export const Button = forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  ({ variant, size, className, children, ...props }, ref) => {
    return (
      <Pressable ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
        {typeof children === 'string' || typeof children === 'number' ? (
          <Text className={textVariants({ variant })}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    );
  },
);
Button.displayName = 'Button';
