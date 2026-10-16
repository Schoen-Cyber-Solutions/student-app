import { useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { EmyScreenKey } from '@/constants/emyHelp';
import EmySheet from './EmySheet';

const emyImage = require('@/assets/images/emy-icon.png');

interface EmyHelpProps {
  /** Contextual help key for this screen — determines the tips shown. */
  screen?: EmyScreenKey;
}

/**
 * The Emy access point: a small mascot button that opens the Emy helper
 * sheet on demand. Renders nothing visually dominant — 36px, glass-style
 * border, sits alongside existing header controls.
 */
export default function EmyHelp({ screen }: EmyHelpProps) {
  const colors = Colors[useColorScheme()];
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Ask Emy for help"
        accessibilityHint="Opens a short guide for this screen"
        style={({ pressed }) => [
          styles.button,
          { borderColor: colors.cardBorder },
          pressed && { opacity: 0.7 },
        ]}>
        <Image source={emyImage} style={styles.image} accessibilityIgnoresInvertColors />
      </Pressable>
      <EmySheet visible={open} screen={screen} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
