import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ABOUT_EMY, EMY_HELP, EmyScreenKey } from '@/constants/emyHelp';
import { radius, spacing, typography } from '@/constants/Theme';

const emyImage = require('@/assets/images/emy-icon.png');

type SheetView = 'menu' | 'tips' | 'about';

interface EmySheetProps {
  visible: boolean;
  /** Screen key for contextual tips. Undefined → no "Help for this screen" row. */
  screen?: EmyScreenKey;
  /** Which view to open on (e.g. 'about' from Settings → About Emy). */
  initialView?: SheetView;
  onClose: () => void;
}

export default function EmySheet({ visible, screen, initialView = 'menu', onClose }: EmySheetProps) {
  const colors = Colors[useColorScheme()];
  const [view, setView] = useState<SheetView>(initialView);
  const help = screen ? EMY_HELP[screen] : undefined;

  const close = () => {
    onClose();
    // Reset after the slide-out finishes so reopening starts at the menu.
    setTimeout(() => setView(initialView), 300);
  };

  const openSettings = () => {
    close();
    router.push('/settings');
  };

  const MenuRow = ({
    icon,
    label,
    onPress,
    last,
  }: {
    icon: string;
    label: string;
    onPress: () => void;
    last?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomColor: colors.cardBorder, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && { opacity: 0.6 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <SymbolView name={icon as any} tintColor={colors.tint} size={20} />
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <SymbolView name="chevron.right" tintColor={colors.mutedText} size={14} />
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
      accessibilityViewIsModal>
      <Pressable
        style={[styles.backdrop, { backgroundColor: 'rgba(2,6,23,0.6)' }]}
        onPress={close}
        accessibilityLabel="Dismiss Emy"
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={emyImage} style={styles.avatar} accessibilityIgnoresInvertColors />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Emy</Text>
          <Pressable
            onPress={close}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close">
            <SymbolView name="xmark" tintColor={colors.mutedText} size={18} />
          </Pressable>
        </View>

        {view === 'menu' && (
          <View>
            {help ? (
              <MenuRow
                icon="questionmark.circle"
                label={`Help for this screen`}
                onPress={() => setView('tips')}
              />
            ) : null}
            <MenuRow
              icon="info.circle"
              label="About Emy"
              onPress={() => setView('about')}
            />
            <MenuRow icon="gear" label="Open Settings" onPress={openSettings} last />
          </View>
        )}

        {view === 'tips' && help && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{help.title}</Text>
            {help.tips.map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: colors.tint }]} />
                <Text style={[styles.tipText, { color: colors.secondaryText }]}>{tip}</Text>
              </View>
            ))}
            <MenuRow icon="chevron.left" label="Back" onPress={() => setView('menu')} last />
          </View>
        )}

        {view === 'about' && (
          <View>
            <Text style={[styles.aboutText, { color: colors.secondaryText }]}>{ABOUT_EMY}</Text>
            <MenuRow icon="chevron.left" label="Back" onPress={() => setView('menu')} last />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.lg + 6,
    borderTopRightRadius: radius.lg + 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  headerTitle: {
    ...typography.heading,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
  },
  rowLabel: {
    ...typography.body,
    fontSize: 16,
    flex: 1,
  },
  sectionTitle: {
    ...typography.body,
    fontSize: 16,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  tipText: {
    ...typography.bodyRegular,
    flex: 1,
    lineHeight: 21,
  },
  aboutText: {
    ...typography.bodyRegular,
    lineHeight: 22,
    marginVertical: spacing.md,
  },
});
