import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Tabs, router } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { glassColors } from '@/constants/Glass';
import { tabBarBottomInset, TAB_BAR_TOP_PAD, tabBarTotalHeight } from '@/utils/tabBarGeometry';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { getSessionToken, isSessionReady } from '@/services/auth/devSession';

// expo-blur calls requireNativeViewManager at module eval — guard it so a
// dev client that predates the package still renders the translucent fill.
let NativeBlurView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NativeBlurView = require('expo-blur').BlurView;
} catch {
  NativeBlurView = null;
}

function TabIcon({ name, color }: { name: string; color: ColorValue }) {
  return (
    <SymbolView
      name={name as any}
      tintColor={color as string}
      size={24}
    />
  );
}

/** Frosted-glass layer behind the tab items — blur + translucent fill,
 *  clipped to the bar's rounded top corners. No opaque backing view. */
function GlassTabBarBackground() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = glassColors(scheme);
  return (
    <View style={styles.tabBarBg}>
      {NativeBlurView ? (
        <NativeBlurView
          intensity={45}
          tint={scheme}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.glassStrong },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const glass = glassColors(scheme);
  // Tab icons are deliberately neutral — solid black on light glass, white on
  // dark — and never inherit per-tab accent colors. The active tab reads
  // through icon/label emphasis only; no background pill.
  const iconActive = scheme === 'dark' ? '#FFFFFF' : '#000000';
  const iconInactive = scheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  useEffect(() => {
    if (isSessionReady() && !getSessionToken()) {
      router.replace('/onboarding');
    }
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: iconActive,
        tabBarInactiveTintColor: iconInactive,
        // Slightly heavier label keeps the active state legible since icons
        // are no longer accent-tinted.
        tabBarLabelStyle: {
          fontWeight: '600',
        },
        // The floating bar hides while the keyboard is open so it can't
        // overlap chat composers/inputs, and returns when it closes.
        tabBarHideOnKeyboard: true,
        headerShown: useClientOnlyValue(false, true),
        tabBarBackground: () => <GlassTabBarBackground />,
        // Floating translucent bar — screens render underneath so the
        // calendar background (and other screens) shows through the glass.
        // Height/padding: the default `49 + insets.bottom` top-justifies the
        // icons and leaves a tall dead glass strip below them. We shrink the
        // bottom inset (shorter bar, anchored lower) and add a small top pad
        // so Home/Calendar/Chat icons+labels sit lower inside the bar too.
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: glass.glassBorder,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          elevation: 0,
          shadowOpacity: 0,
          height: tabBarTotalHeight(insets.bottom),
          paddingTop: TAB_BAR_TOP_PAD,
          paddingBottom: tabBarBottomInset(insets.bottom),
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="house" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon name="bubble.left.and.bubble.right" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
});
