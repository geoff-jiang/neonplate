import { useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export type SpeechState = 'idle' | 'listening' | 'error';

export function useSpeechRecognition() {
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setState('listening');
    setError(null);
  });

  useSpeechRecognitionEvent('end', () => {
    setState('idle');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const latest = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setTranscript((prev) => (prev ? `${prev} ${latest}`.trim() : latest));
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setState('error');
    setError(event.message ?? 'Unknown speech recognition error');
  });

  async function start() {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError('Microphone or speech recognition permission denied.');
      setState('error');
      return;
    }
    setTranscript('');
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
    });
  }

  function stop() {
    ExpoSpeechRecognitionModule.stop();
  }

  function reset() {
    setTranscript('');
    setError(null);
    setState('idle');
  }

  return {
    state,
    transcript,
    setTranscript,
    error,
    start,
    stop,
    reset,
  };
}
