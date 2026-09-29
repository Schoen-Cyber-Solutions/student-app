import { useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Text } from './Themed';
import SafeLinearGradient from './SafeLinearGradient';
import {
  HSV,
  contrastText,
  hexToHsv,
  hsvToHex,
  normalizeHex,
} from '@/constants/Glass';
import { ACCENT_PRESETS } from '@/utils/tabAppearance';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

/**
 * Dependency-free HSV accent picker. A full HSV model over a
 * saturation/brightness pad plus a hue slider covers every color a wheel
 * would — without react-native-gesture-handler or react-native-svg, which
 * the established RN picker libraries require (native rebuild).
 */

const HUE_COLORS = [
  '#FF0000',
  '#FFFF00',
  '#00FF00',
  '#00FFFF',
  '#0000FF',
  '#FF00FF',
  '#FF0000',
] as const;

interface AccentColorPickerProps {
  visible: boolean;
  initial: string;
  onApply: (hex: string) => void;
  onCancel: () => void;
  /** Sheet title — defaults to "Custom accent". */
  title?: string;
  /** Preset dots shown under the HEX field — defaults to ACCENT_PRESETS. */
  presets?: { name: string; hex: string }[];
}

function useDragResponder(onDrag: (x: number, y: number, w: number, h: number) => void) {
  const size = useRef({ w: 1, h: 1 });
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) =>
        onDrag(e.nativeEvent.locationX, e.nativeEvent.locationY, size.current.w, size.current.h),
      onPanResponderMove: (e: GestureResponderEvent) =>
        onDrag(e.nativeEvent.locationX, e.nativeEvent.locationY, size.current.w, size.current.h),
    })
  ).current;
  return { responder, size };
}

export default function AccentColorPicker({
  visible,
  initial,
  onApply,
  onCancel,
  title = 'Custom accent',
  presets = ACCENT_PRESETS,
}: AccentColorPickerProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(initial));
  const [hexInput, setHexInput] = useState(() => normalizeHex(initial) ?? initial);
  const [hexTouched, setHexTouched] = useState(false);

  // PanResponder handlers are created once — always read the latest draft
  // through a ref so gestures never act on a stale render-time value.
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  // Re-seed the draft every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const next = hexToHsv(initial);
    setHsv(next);
    hsvRef.current = next;
    setHexInput(normalizeHex(initial) ?? initial);
    setHexTouched(false);
  }, [visible, initial]);

  const draftHex = hsvToHex(hsv);
  const typedHex = normalizeHex(hexInput);
  const hexValid = !hexTouched || typedHex !== null;

  const sv = useDragResponder((x, y, w, h) => {
    const s = Math.min(1, Math.max(0, x / w));
    const v = Math.min(1, Math.max(0, 1 - y / h));
    const next = { ...hsvRef.current, s, v };
    hsvRef.current = next;
    setHsv(next);
    setHexInput(hsvToHex(next));
    setHexTouched(false);
  });

  const hue = useDragResponder((x, _y, w) => {
    const hDeg = Math.min(359.999, Math.max(0, (x / w) * 360));
    const next = { ...hsvRef.current, h: hDeg };
    hsvRef.current = next;
    setHsv(next);
    setHexInput(hsvToHex(next));
    setHexTouched(false);
  });

  const applyPreset = (hex: string) => {
    const next = hexToHsv(hex);
    hsvRef.current = next;
    setHsv(next);
    setHexInput(normalizeHex(hex) ?? hex);
    setHexTouched(false);
  };

  const handleHexChange = (t: string) => {
    setHexTouched(true);
    setHexInput(t);
    const norm = normalizeHex(t);
    if (norm) {
      const next = hexToHsv(norm);
      hsvRef.current = next;
      setHsv(next);
    }
  };

  const svHeight = 170;
  const thumb = (left: number, top: number): ViewStyle => ({
    left: `${Math.min(100, Math.max(0, left))}%`,
    top: `${Math.min(100, Math.max(0, top))}%`,
  });

  // Backdrop tap dismisses the keyboard first; a second tap closes the sheet.
  const handleBackdrop = () => {
    if (Keyboard.isVisible()) Keyboard.dismiss();
    else onCancel();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          {/* Taps on the dimmed area dismiss the keyboard (or close the
              sheet once the keyboard is already down). The sheet renders on
              top, so its taps never reach this layer. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdrop} />
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Live preview */}
          <View style={styles.previewRow}>
            <View
              style={[
                styles.previewSwatch,
                { backgroundColor: draftHex, borderColor: colors.cardBorder },
              ]}
            />
            <Text style={[styles.previewHex, { color: colors.secondaryText }]}>
              {draftHex}
            </Text>
          </View>

          {/* Saturation / brightness pad */}
          <View
            style={[styles.svPad, { height: svHeight }]}
            onLayout={(e) => {
              sv.size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
            }}
            {...sv.responder.panHandlers}>
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }) },
              ]}
            />
            <SafeLinearGradient
              colors={['#FFFFFF', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <SafeLinearGradient
              colors={['rgba(0,0,0,0)', '#000000']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[
                styles.thumb,
                thumb(hsv.s * 100, (1 - hsv.v) * 100),
                { borderColor: '#FFFFFF' },
              ]}
            />
          </View>

          {/* Hue slider */}
          <View
            style={styles.hueWrap}
            onLayout={(e) => {
              hue.size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
            }}
            {...hue.responder.panHandlers}>
            <SafeLinearGradient
              colors={HUE_COLORS}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[styles.hueThumb, { left: `${(hsv.h / 360) * 100}%` }]}
            />
          </View>

          {/* HEX input */}
          <View style={styles.hexRow}>
            <Text style={[styles.hexLabel, { color: colors.secondaryText }]}>HEX</Text>
            <TextInput
              value={hexInput}
              onChangeText={handleHexChange}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
              placeholder="#7161EF"
              placeholderTextColor={colors.mutedText}
              style={[
                styles.hexInput,
                {
                  color: colors.text,
                  borderColor: hexValid ? colors.cardBorder : colors.urgent,
                  backgroundColor: colors.surface,
                },
              ]}
            />
          </View>
          {!hexValid ? (
            <Text style={[styles.hexError, { color: colors.urgent }]}>
              Enter a 6-digit hex color like #3B82F6.
            </Text>
          ) : null}

          {/* Presets */}
          <View style={styles.presetRow}>
            {presets.map((p) => (
              <Pressable
                key={p.hex}
                onPress={() => applyPreset(p.hex)}
                style={({ pressed }) => [
                  styles.presetDot,
                  { backgroundColor: p.hex },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${p.name} preset`}
              />
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: colors.cardBorder },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button">
              <Text style={[styles.actionText, { color: colors.secondaryText }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => hexValid && onApply(draftHex)}
              disabled={!hexValid}
              style={({ pressed }) => [
                styles.applyBtn,
                { backgroundColor: draftHex, opacity: hexValid ? 1 : 0.4 },
                pressed && { opacity: 0.8 },
              ]}
              accessibilityRole="button">
              <Text style={[styles.actionText, { color: contrastText(draftHex) }]}>Apply</Text>
            </Pressable>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}


const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  title: {
    ...typography.heading,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  previewSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewHex: {
    ...typography.label,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  svPad: {
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  hueWrap: {
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    marginLeft: -11,
    marginTop: -11,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  hueThumb: {
    position: 'absolute',
    width: 8,
    top: 0,
    bottom: 0,
    marginLeft: -4,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hexLabel: {
    ...typography.label,
    fontWeight: '700',
  },
  hexInput: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  hexError: {
    ...typography.caption,
    marginTop: 4,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  presetDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  applyBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  actionText: {
    ...typography.label,
    fontSize: 15,
    fontWeight: '700',
  },
});
