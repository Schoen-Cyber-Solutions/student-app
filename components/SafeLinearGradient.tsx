import { StyleProp, View, ViewStyle } from 'react-native';

// expo-linear-gradient is a native module. If the running dev client predates
// it, requiring it throws during module eval and kills any screen in the
// import chain. Load it defensively and fall back to a solid first color.
let NativeLinearGradient: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NativeLinearGradient = require('expo-linear-gradient').LinearGradient;
} catch {
  NativeLinearGradient = null;
}

interface SafeLinearGradientProps {
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
}

export default function SafeLinearGradient({
  colors,
  start,
  end,
  style,
}: SafeLinearGradientProps) {
  if (NativeLinearGradient) {
    return (
      <NativeLinearGradient colors={colors} start={start} end={end} style={style} />
    );
  }
  return <View style={[style, { backgroundColor: colors[0] }]} />;
}
