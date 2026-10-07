import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { Button } from '../../components/ui/button';
import { Text } from '../../components/ui/text';
import { LoadStatus } from '../../components/ui/load-status';
import {
  VerificationScreen,
  type VerificationResult,
} from '../../components/logging/VerificationScreen';
import { useAuth } from '../../hooks/use-auth';
import { dailyLogQueries, type DailyLog } from '../../lib/supabase/queries';
import type { MealExtraction } from '../../lib/ai/schemas';
import { runMutation } from '../../lib/utils/data-refresh';

export default function EditMeal() {
  const router = useRouter();
  const { id: routeId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof routeId === 'string' && routeId.trim() ? routeId : null;
  const { user } = useAuth();
  const userId = user?.id;
  const scope = `${userId}:${id}`;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    scope: string;
    meal: DailyLog | null;
    extraction: MealExtraction | null;
    loading: boolean;
    error: Error | null;
  }>({ scope, meal: null, extraction: null, loading: true, error: null });
  const active = useRef<object | null>(null);
  const saving = useRef(false);

  // Fetch the original once per meal/retry. Background refreshes must not replace an
  // in-progress edit; saving publishes the change to Today and other mounted readers.
  useEffect(() => {
    const request = {};
    active.current = request;
    setState({ scope, meal: null, extraction: null, loading: true, error: null });
    async function load() {
      try {
        if (!userId) throw new Error('Sign in to edit a meal.');
        if (!id) throw new Error('No meal was selected.');
        const meal = await dailyLogQueries.getById(userId, id);
        if (!meal) throw new Error('This meal was not found. It may have been deleted.');
        if (active.current !== request) return;
        setState({
          scope,
          meal,
          extraction: {
            name: meal.name,
            calories: meal.calories,
            protein_g: meal.protein_g,
            carbs_g: meal.carbs_g,
            fat_g: meal.fat_g,
            confidence: 'low',
            notes: '',
          },
          loading: false,
          error: null,
        });
      } catch (error) {
        if (active.current !== request) return;
        setState({
          scope,
          meal: null,
          extraction: null,
          loading: false,
          error: new Error(
            error instanceof Error
              ? error.message
              : 'Could not load this meal. Check your connection and retry.',
          ),
        });
      }
    }
    void load();
    return () => {
      active.current = null;
    };
  }, [attempt, id, scope, userId]);

  function dismiss() {
    if (saving.current || !active.current) return;
    active.current = null;
    router.back();
  }

  async function confirm(result: VerificationResult) {
    if (saving.current || !active.current) return;
    if (!userId || !id || state.scope !== scope || !state.meal)
      throw new Error('This meal is no longer available.');
    const request = active.current;
    saving.current = true;
    try {
      // Preserve when/how the meal was logged and its recipe association.
      await runMutation(`${userId}:logs`, () =>
        dailyLogQueries.update(
          id,
          {
            name: result.name,
            calories: result.calories,
            protein_g: result.protein_g,
            carbs_g: result.carbs_g,
            fat_g: result.fat_g,
          },
          userId,
        ),
      );
      if (active.current === request) {
        active.current = null;
        router.back();
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'The meal could not be saved. Check your connection and try again.',
      );
    } finally {
      saving.current = false;
    }
  }

  const loaded = state.scope === scope && state.meal && state.extraction;
  return (
    <SafeAreaView className="flex-1 bg-background">
      {loaded ? (
        <>
          <Text variant="caption" className="px-6 pt-4">
            Logged {new Date(state.meal!.logged_at).toLocaleString()}. Editing keeps this date.
          </Text>
          <VerificationScreen
            mode="edit"
            extraction={state.extraction!}
            onConfirm={confirm}
            onCancel={dismiss}
          />
        </>
      ) : (
        <View className="flex-1 py-6">
          <Text variant="h2" className="px-6">
            Edit meal
          </Text>
          <LoadStatus
            loading={state.scope !== scope || state.loading}
            error={state.scope === scope ? state.error : null}
            label="Loading meal..."
            onRetry={() => setAttempt((value) => value + 1)}
          />
          <Button variant="outline" className="mx-6" onPress={dismiss}>
            Cancel
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}
