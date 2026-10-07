import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export type SpeechState = 'idle' | 'starting' | 'listening' | 'stopping' | 'error';

function speechError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Allow microphone and speech recognition access in device Settings, or type your meal below.';
    case 'network':
      return 'Speech recognition could not connect. Check your connection or type your meal below.';
    case 'no-speech':
      return 'No speech was detected. Try recording again or type your meal below.';
    case 'audio-capture':
    case 'interrupted':
      return 'Recording was interrupted. Your transcript is still available to edit or retry.';
    default:
      return 'Speech recognition could not finish. You can edit your transcript or try recording again.';
  }
}

// The native recognizer is shared across screens and its events have no session IDs.
// Keep its lease until end, even when the owning hook has already unmounted.
let nativeSessionActive = false;
function acquireNativeSession(): boolean {
  if (nativeSessionActive) return false;
  const subscription = ExpoSpeechRecognitionModule.addListener('end', () => {
    nativeSessionActive = false;
    subscription.remove();
  });
  nativeSessionActive = true;
  return true;
}

const append = (base: string, segment: string) => `${base} ${segment}`.trim();

export function useSpeechRecognition(initialTranscript = '') {
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, updateTranscript] = useState(initialTranscript);
  const [error, updateError] = useState<string | null>(null);
  const phase = useRef<SpeechState>('idle');
  const mounted = useRef(true);
  const generation = useRef(0);
  const nativeRunning = useRef(false);
  const acceptingResults = useRef(false);
  const committed = useRef(initialTranscript);
  const latestTranscript = useRef(initialTranscript);
  const latestError = useRef<string | null>(null);

  const changeState = useCallback((next: SpeechState) => {
    phase.current = next;
    if (mounted.current) setState(next);
  }, []);
  const changeError = useCallback((next: string | null) => {
    latestError.current = next;
    if (mounted.current) updateError(next);
  }, []);
  const changeTranscript = useCallback((next: string) => {
    latestTranscript.current = next;
    if (mounted.current) updateTranscript(next);
  }, []);

  // Ignore all native callbacks after cancellation until the terminal end event.
  // The native API has no session IDs; do not start again until that event drains.
  const cancel = useCallback(() => {
    generation.current++;
    acceptingResults.current = false;
    committed.current = latestTranscript.current;
    if (nativeRunning.current) {
      changeState('stopping');
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        nativeRunning.current = false;
        changeError('Recording could not finish. You can edit your transcript or retry.');
        changeState('error');
      }
    } else {
      changeState('idle');
    }
  }, [changeError, changeState]);

  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'background') cancel();
    });
    return () => {
      mounted.current = false;
      cancel();
      subscription.remove();
    };
  }, [cancel]);

  useSpeechRecognitionEvent('start', () => {
    if (!mounted.current || !acceptingResults.current || phase.current !== 'starting') return;
    changeState('listening');
  });
  useSpeechRecognitionEvent('end', () => {
    if (!mounted.current || !nativeRunning.current) return;
    nativeRunning.current = false;
    acceptingResults.current = false;
    committed.current = latestTranscript.current;
    changeState(latestError.current ? 'error' : 'idle');
  });
  useSpeechRecognitionEvent('result', (event) => {
    if (!mounted.current || !acceptingResults.current) return;
    const segment = event.results[0]?.transcript?.trim();
    if (!segment) return;
    const next = append(committed.current, segment);
    changeTranscript(next);
    if (event.isFinal) committed.current = next;
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (!mounted.current || !acceptingResults.current) return;
    acceptingResults.current = false;
    if (event.error !== 'aborted') changeError(speechError(event.error));
    // end follows error; waiting prevents its late delivery from ending a new take.
    changeState('stopping');
  });

  async function start() {
    if (!mounted.current || nativeRunning.current || phase.current === 'starting') return;
    if (nativeSessionActive) {
      changeError(
        'The previous recording is still finishing. Try again in a moment or type your meal.',
      );
      changeState('error');
      return;
    }
    const attempt = ++generation.current;
    changeError(null);
    changeState('starting');
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!mounted.current || generation.current !== attempt) return;
      if (!permission.granted) {
        changeError(
          permission.restricted
            ? 'Speech recognition is restricted in device Settings. You can type your meal below.'
            : 'Allow microphone and speech recognition access in device Settings, or type your meal below.',
        );
        changeState('error');
        return;
      }
      if (!acquireNativeSession()) {
        changeError(
          'The previous recording is still finishing. Try again in a moment or type your meal.',
        );
        changeState('error');
        return;
      }
      committed.current = latestTranscript.current;
      acceptingResults.current = true;
      nativeRunning.current = true;
      ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
    } catch {
      if (!mounted.current || generation.current !== attempt) return;
      acceptingResults.current = false;
      if (nativeRunning.current) {
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {
          /* Already failed to start. */
        }
      }
      nativeRunning.current = false;
      changeError(
        'Could not start speech recognition. Your transcript is still available; try again or type your meal.',
      );
      changeState('error');
    }
  }

  function stop() {
    if (!mounted.current) return;
    if (!nativeRunning.current) {
      cancel();
      return;
    }
    if (phase.current === 'stopping') return;
    changeState('stopping');
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      changeError('Recording could not finish. You can edit your transcript or retry.');
      cancel();
    }
  }

  function reset() {
    cancel();
    changeError(null);
    committed.current = '';
    changeTranscript('');
  }

  function setTranscript(text: string) {
    if (phase.current === 'starting' || nativeRunning.current) return;
    committed.current = text;
    changeTranscript(text);
  }

  return { state, transcript, setTranscript, error, start, stop, reset };
}
