import { useEffect } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useSpeechRecognition } from '../../hooks/use-speech-recognition';
import { cn } from '../../lib/utils/cn';

type Props = {
  onParse: (text: string) => void;
  parsing: boolean;
  initialTranscript?: string;
  onTranscriptChange?: (text: string) => void;
};

export function VoiceRecorder({ onParse, parsing, initialTranscript, onTranscriptChange }: Props) {
  const { state, transcript, setTranscript, error, start, stop, reset } =
    useSpeechRecognition(initialTranscript);
  const listening = state === 'listening';
  const starting = state === 'starting';
  const stopping = state === 'stopping';
  const recording = listening || starting || stopping;

  useEffect(() => {
    onTranscriptChange?.(transcript);
  }, [transcript, onTranscriptChange]);

  return (
    <View className="flex-1">
      <View className="items-center mb-6">
        <Pressable
          onPress={listening || starting ? stop : start}
          disabled={parsing || stopping}
          accessibilityRole="button"
          accessibilityLabel={
            listening
              ? 'Stop recording'
              : starting
                ? 'Cancel starting recording'
                : 'Start recording'
          }
          accessibilityState={{ disabled: parsing || stopping, busy: starting || stopping }}
          className={cn(
            'w-24 h-24 rounded-full items-center justify-center',
            recording ? 'bg-destructive' : 'bg-primary',
            (parsing || stopping) && 'opacity-50',
          )}
        >
          {starting || stopping ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-primary-foreground text-3xl">{listening ? '■' : '●'}</Text>
          )}
        </Pressable>
        <Text variant="muted" className="mt-3">
          {starting
            ? 'Starting... tap to cancel'
            : stopping
              ? 'Finishing recording...'
              : listening
                ? 'Listening... tap to stop'
                : 'Tap to add a recording'}
        </Text>
      </View>

      {error ? <Text className="text-destructive mb-3">{error}</Text> : null}
      <Text variant="label" className="mb-2">
        Transcription (editable after recording)
      </Text>
      <Input
        value={transcript}
        onChangeText={setTranscript}
        editable={!parsing && !recording}
        multiline
        className="min-h-[120px]"
        style={{ textAlignVertical: 'top', paddingTop: 12 }}
        placeholder={listening ? 'Keep speaking...' : 'Your transcription will appear here'}
      />
      <Button
        variant="ghost"
        onPress={reset}
        disabled={parsing || recording || !transcript}
        className="mt-2"
      >
        Clear transcript
      </Button>
      <Button
        className="mt-4"
        onPress={() => {
          if (!recording && !parsing && transcript.trim()) onParse(transcript);
        }}
        disabled={parsing || !transcript.trim() || recording}
      >
        {parsing ? <ActivityIndicator color="white" /> : 'Parse'}
      </Button>
    </View>
  );
}
