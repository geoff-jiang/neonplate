// components/ui/text.tsx
import { Text as RNText, type TextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils/cn';
import { forwardRef } from 'react';

const textVariants = cva('text-foreground', {
  variants: {
    variant: {
      default: 'text-base',
      muted: 'text-sm text-muted-foreground',
      h1: 'text-3xl font-bold',
      h2: 'text-2xl font-semibold',
      h3: 'text-xl font-semibold',
      label: 'text-sm font-medium',
      caption: 'text-xs text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

type Props = TextProps & VariantProps<typeof textVariants> & { className?: string };

export const Text = forwardRef<RNText, Props>(
  ({ variant, className, ...props }, ref) => {
    return <RNText ref={ref} className={cn(textVariants({ variant }), className)} {...props} />;
  },
);
Text.displayName = 'Text';