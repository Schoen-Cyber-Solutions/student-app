import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';
import CalendarBackground from '@/components/CalendarBackground';
import GlassPanel from '@/components/GlassPanel';
import AccentColorPicker from '@/components/AccentColorPicker';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { contrastText, glassColors } from '@/constants/Glass';
import { spacing, typography, radius } from '@/constants/Theme';
import {
  ACCENT_PRESETS,
  SOLID_BACKGROUND_PRESETS,
  TAB_TEXT_COLORS,
  TabKey,
  TextMode,
  resolveBackgroundColor,
  resolveTextMode,
  setTabAccent,
  setTabBackgroundColor,
  setTabTextMode,
} from '@/utils/tabAppearance';
import { refreshTabAppearance, useTabAppearance } from '@/utils/tabAppearanceStore';
import { useTabAccent } from '@/utils/tabAccent';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'chat', label: 'Chat' },
];

const TEXT_OPTIONS: { key: TextMode; label: string }[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

function ActionRow({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const colors = Colors[useColorScheme()];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.cardBorder },
        pressed && { opacity: 0.6 },
      ]}
      accessibilityRole="button">
      <SymbolView
        name={icon as any}
        tintColor={destructive ? colors.urgent : colors.tint}
        size={20}
      />
      <Text style={[styles.rowLabel, { color: destructive ? colors.urgent : colors.text }]}>
        {label}
      </Text>
      <SymbolView name="chevron.right" tintColor={colors.mutedText} size={14} />
    </Pressable>
  );
}

export default function AppearanceScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme];
  const [tab, setTab] = useState<TabKey>('calendar');
  const accent = useTabAccent(tab);
  const glass = glassColors(scheme === 'dark' ? 'dark' : 'light', accent);
  // Shared runtime store — live updates, no per-screen SecureStore reads.
  const appearance = useTabAppearance(tab);
  const [pickerTarget, setPickerTarget] = useState<'accent' | 'background' | null>(null);
  const textMode = resolveTextMode(appearance, scheme === 'dark' ? 'dark' : 'light');
  const previewText = TAB_TEXT_COLORS[textMode];
  const bgColor = resolveBackgroundColor(appearance, scheme === 'dark' ? 'dark' : 'light');

  useFocusEffect(
    useCallback(() => {
      void refreshTabAppearance();
    }, []),
  );

  const handleTextMode = async (textMode: TextMode) => {
    try {
      await setTabTextMode(tab, textMode);
    } catch {
      await refreshTabAppearance();
    }
  };

  const handleBgColor = async (hex: string) => {
    try {
      await setTabBackgroundColor(tab, hex);
    } catch {
      await refreshTabAppearance();
    }
  };

  const handleAccent = async (hex: string) => {
    try {
      await setTabAccent(tab, hex);
    } catch {
      await refreshTabAppearance();
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Appearance' }} />
      <ScreenWrapper>
        {/* Tab selector — each tab keeps its own prefs. */}
        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: active ? glass.accent : colors.surface,
                    borderColor: active ? glass.accent : colors.cardBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Customize ${t.label}`}>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: active ? contrastText(glass.accent) : colors.secondaryText },
                  ]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Live preview of the selected tab */}
        <View style={styles.previewWrap}>
          <View style={styles.previewClip}>
            <CalendarBackground appearance={appearance} />
            <View style={styles.previewInner}>
              <GlassPanel intensity={30}>
                <View style={styles.previewPanelContent}>
                  <Text style={[styles.previewTitle, { color: previewText.primary }]}>
                    {TABS.find((t) => t.key === tab)?.label}
                  </Text>
                  <Text style={[styles.previewMeta, { color: previewText.secondary }]}>
                    {textMode === 'light' ? 'Light text over dark backgrounds' : 'Dark text over light backgrounds'}
                  </Text>
                  <View style={styles.previewRow}>
                    <View style={[styles.previewChip, { backgroundColor: glass.accent }]} />
                    <View style={[styles.previewBar, { backgroundColor: colors.cardBorder }]} />
                  </View>
                  <View style={styles.previewRow}>
                    <View style={[styles.previewChip, { backgroundColor: '#34D399' }]} />
                    <View style={[styles.previewBar, { backgroundColor: colors.cardBorder, width: '60%' }]} />
                  </View>
                </View>
              </GlassPanel>
            </View>
          </View>
          <Text style={[styles.previewCaption, { color: colors.mutedText }]}>
            Solid background
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>Background</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.swatchRow}>
            {SOLID_BACKGROUND_PRESETS.map((p) => {
              const active = bgColor === p.hex;
              return (
                <Pressable
                  key={p.hex}
                  onPress={() => handleBgColor(p.hex)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${p.name} background`}>
                  <View
                    style={[
                      styles.swatchRing,
                      active && { borderColor: glass.accent, borderWidth: 2 },
                    ]}>
                    <View
                      style={[
                        styles.swatch,
                        {
                          backgroundColor: p.hex,
                          borderColor: colors.cardBorder,
                          borderWidth: StyleSheet.hairlineWidth,
                        },
                      ]}>
                      {active ? (
                        <SymbolView
                          name="checkmark"
                          tintColor={contrastText(p.hex)}
                          size={13}
                          weight="bold"
                        />
                      ) : null}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.swatchLabel,
                      { color: active ? colors.text : colors.mutedText },
                    ]}
                    numberOfLines={1}>
                    {p.name.split(' ')[0]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <ActionRow
            icon="paintpalette"
            label="Custom color…"
            onPress={() => setPickerTarget('background')}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>Text</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.dimRow}>
            {TEXT_OPTIONS.map((o) => {
              const active = textMode === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => handleTextMode(o.key)}
                  style={[
                    styles.dimPill,
                    {
                      backgroundColor: active ? glass.accent : colors.surface,
                      borderColor: active ? glass.accent : colors.cardBorder,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${o.label} text`}>
                  <Text
                    style={[
                      styles.dimLabel,
                      { color: active ? contrastText(glass.accent) : colors.secondaryText },
                    ]}>
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: colors.mutedText }]}>
            Light text suits dark backgrounds; dark text suits light ones. Accent and course colors are unaffected.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>Accent color</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.swatchRow}>
            {ACCENT_PRESETS.map((p) => {
              const active = appearance.accent === p.hex;
              return (
                <Pressable
                  key={p.hex}
                  onPress={() => handleAccent(p.hex)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${p.name} accent`}>
                  <View
                    style={[
                      styles.swatchRing,
                      active && { borderColor: p.hex, borderWidth: 2 },
                    ]}>
                    <View style={[styles.swatch, { backgroundColor: p.hex }]}>
                      {active ? (
                        <SymbolView
                          name="checkmark"
                          tintColor={contrastText(p.hex)}
                          size={13}
                          weight="bold"
                        />
                      ) : null}
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.swatchLabel,
                      { color: active ? colors.text : colors.mutedText },
                    ]}
                    numberOfLines={1}>
                    {p.name.split(' ')[0]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <ActionRow
            icon="paintpalette"
            label="Custom color…"
            onPress={() => setPickerTarget('accent')}
          />
        </View>

        <Text style={[styles.footer, { color: colors.mutedText }]}>
          Changes apply immediately on each tab.
        </Text>
      </ScreenWrapper>

      <AccentColorPicker
        visible={pickerTarget !== null}
        title={pickerTarget === 'background' ? 'Custom background' : 'Custom accent'}
        initial={pickerTarget === 'background' ? bgColor : appearance.accent}
        presets={pickerTarget === 'background' ? SOLID_BACKGROUND_PRESETS : ACCENT_PRESETS}
        onApply={(hex) => {
          const target = pickerTarget;
          setPickerTarget(null);
          void (target === 'background' ? handleBgColor(hex) : handleAccent(hex));
        }}
        onCancel={() => setPickerTarget(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
  },
  previewWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  previewClip: {
    height: 180,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewInner: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  previewPanelContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  previewMeta: {
    ...typography.caption,
    fontSize: 11,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewChip: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  previewBar: {
    height: 8,
    borderRadius: 4,
    width: '80%',
  },
  previewCaption: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    ...typography.body,
    fontSize: 16,
    flex: 1,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
    padding: spacing.md,
  },
  swatchRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 52,
  },
  dimRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  dimPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dimLabel: {
    ...typography.label,
    fontSize: 13,
  },
  hint: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  footer: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
});
