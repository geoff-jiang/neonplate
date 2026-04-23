import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'NeonPlate',
  slug: 'neonplate',
  version: '0.1.0',
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: 'neonplate',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.geoffjiang.neonplate',
    infoPlist: {
      NSMicrophoneUsageDescription: 'NeonPlate needs your microphone to log meals via voice.',
      NSSpeechRecognitionUsageDescription: 'NeonPlate uses speech recognition to transcribe meal descriptions.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: 'com.geoffjiang.neonplate',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'NeonPlate needs your microphone to log meals via voice.',
        speechRecognitionPermission: 'NeonPlate uses speech recognition to transcribe your meal descriptions.',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
        dark: { backgroundColor: '#000000' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
