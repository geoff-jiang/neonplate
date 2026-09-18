// components/today/TodayMealsList.tsx
import { View } from 'react-native';
import { useState } from 'react';
import { Text } from '../ui/text';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { MealItem } from './MealItem';
import type { DailyLog } from '../../lib/supabase/queries';

type Props = {
  logs: DailyLog[];
  onRemove: (id: string) => Promise<void>;
};

export function TodayMealsList({ logs, onRemove }: Props) {
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await onRemove(deleting.id);
    } catch {
      // Error handled by parent hook
    }
    setDeleting(null);
  }

  return (
    <View className="px-6 pb-6">
      <Text variant="h3" className="mb-2">
        Today&apos;s meals
      </Text>
      {logs.length === 0 ? (
        <Text variant="muted">No meals logged yet today.</Text>
      ) : (
        logs.map((log) => (
          <MealItem
            key={log.id}
            id={log.id}
            name={log.name}
            calories={log.calories}
            protein_g={log.protein_g}
            carbs_g={log.carbs_g}
            fat_g={log.fat_g}
            onDelete={(id, name) => setDeleting({ id, name })}
          />
        ))
      )}

      <ConfirmDialog
        visible={deleting !== null}
        title="Delete meal?"
        message={`Remove "${deleting?.name}" from today's log?`}
        confirmText="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </View>
  );
}
