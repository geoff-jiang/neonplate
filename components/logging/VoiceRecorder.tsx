import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '../ui/text';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useSpeechRecognition } from '../../hooks/use-speech-recognition';
import { cn } from '../../lib/utils/cn';

type Props = {
  onParse: (text: string) => void;
  parsing: boolean;
};

export function VoiceRecorder({ onParse, parsing }: Props) {
  const { state, transcript, setTranscript, error, start, stop } = useSpeechRecognition();

  const listening = state === 'listening';

  return (
    <View className="flex-1">
      <View className="items-center mb-6">
        <Pressable
          onPress={listening ? stop : start}
          className={cn(
            'w-24 h-24 rounded-full items-center justify-center',
            listening ? 'bg-destructive' : 'bg-primary',
          )}
        >
          <Text className="text-primary-foreground text-3xl">{listening ? '■' : '●'}</Text>
        </Pressable>
        <Text variant="muted" className="mt-3">
          {listening ? 'Listening... tap to stop' : 'Tap to start recording'}
        </Text>
      </View>

      {error ? <Text className="text-destructive mb-3">{error}</Text> : null}

      <Text variant="label" className="mb-2">
        Transcription (editable)
      </Text>
      <Input
        value={transcript}
        onChangeText={setTranscript}
        multiline
        className="min-h-[120px]"
        style={{ textAlignVertical: 'top', paddingTop: 12 }}
        placeholder={listening ? 'Keep speaking...' : 'Your transcription will appear here'}
      />

      <Button
        className="mt-4"
        onPress={() => onParse(transcript)}
        disabled={parsing || !transcript.trim() || listening}
      >
        {parsing ? <ActivityIndicator color="white" /> : 'Parse'}
      </Button>
    </View>
  );
}
