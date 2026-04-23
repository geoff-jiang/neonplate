// components/ui/card.tsx
import { View, type ViewProps } from 'react-native';
import { cn } from '../../lib/utils/cn';
import { forwardRef } from 'react';

type Props = ViewProps & { className?: string };

export const Card = forwardRef<View, Props>(({ className, ...props }, ref) => {
  return (
    <View
      ref={ref}
      className={cn('rounded-xl border border-border bg-background p-4', className)}
      {...props}
    />
  );
});
Card.displayName = 'Card';
