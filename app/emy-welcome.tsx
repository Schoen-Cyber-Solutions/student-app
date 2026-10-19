import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { markEmyWelcomeSeen } from '@/utils/emyOnboarding';

const emyImage = require('@/assets/images/emy-icon.png');

interface Slide {
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    title: "Hi, I'm Emy.",
    body: "Welcome to Study with Emy — I'm your university companion, and I'll help you get around.",
  },
  {
    title: 'Home',
    body: "Home shows what matters today — your next classes, upcoming events, and updates at a glance.",
  },
  {
    title: 'Calendar',
    body: 'See your schedule by Day, Week, or Month — and add personal events alongside your classes.',
  },
  {
    title: 'Courses',
    body: 'Search courses in Academic Setup, pick your sections, and build your semester schedule.',
  },
  {
    title: 'Campus Events',
    body: 'Discover what\'s happening on campus — open locations in Maps and save events to your calendar.',
  },
  {
    title: 'Communities',
    body: 'Every course section has a community. Ask questions, reply in threads — and report or block when needed.',
  },
  {
    title: 'That\'s it!',
    body: "Tap me anytime on a screen and I'll give you a quick tip about what you're looking at.",
  },
];

export default function EmyWelcome() {
  const colors = Colors[useColorScheme()];
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = async () => {
    await markEmyWelcomeSeen();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Skip */}
      <View style={[styles.topRow, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={finish}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip introduction">
          <Text style={[styles.skip, { color: colors.secondaryText }]}>Skip</Text>
        </Pressable>
      </View>

      {/* Slide */}
      <View style={styles.slide}>
        <Image
          source={emyImage}
          style={styles.mascot}
          accessibilityLabel="Emy, your guide"
          accessibilityIgnoresInvertColors
        />
        <Text style={[styles.title, { color: colors.text }]}>{SLIDES[index].title}</Text>
        <Text style={[styles.body, { color: colors.secondaryText }]}>{SLIDES[index].body}</Text>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.dots} accessibilityElementsHidden>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === index ? colors.tint : colors.cardBorder },
              ]}
            />
          ))}
        </View>
        <View style={styles.buttons}>
          <Pressable
            onPress={() => setIndex((i) => i - 1)}
            disabled={index === 0}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={[styles.backButton, index === 0 && { opacity: 0.3 }]}>
            <Text style={[styles.backText, { color: colors.secondaryText }]}>Back</Text>
          </Pressable>
          <Pressable
            onPress={last ? finish : () => setIndex((i) => i + 1)}
            accessibilityRole="button"
            accessibilityLabel={last ? 'Get started' : 'Next'}
            style={[styles.nextButton, { backgroundColor: colors.tint }]}>
            <Text style={[styles.nextText, { color: colors.tintText }]}>
              {last ? 'Get Started' : 'Next'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skip: {
    ...typography.body,
    fontSize: 16,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  mascot: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading,
    fontSize: 30,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    ...typography.bodyRegular,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
  },
  controls: {
    paddingHorizontal: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  backText: {
    ...typography.body,
    fontSize: 16,
  },
  nextButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    minWidth: 120,
    alignItems: 'center',
  },
  nextText: {
    ...typography.body,
    fontSize: 16,
  },
});
