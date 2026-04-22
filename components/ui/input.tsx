// components/ui/input.tsx
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '../../lib/utils/cn';
import { forwardRef } from 'react';
import { colors } from '../../lib/theme';

type Props = TextInputProps & { className?: string };

export const Input = forwardRef<TextInput, Props>(({ className, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.mutedForeground}
      className={cn(
        'h-12 rounded-lg border border-border bg-background px-3 text-base text-foreground',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';