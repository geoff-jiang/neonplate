import { useWindowDimensions } from 'react-native';

export function useBreakpoint() {
  const { width } = useWindowDimensions();
  return {
    width,
    isTablet: width >= 768,
    isPhone: width < 768,
  };
}
