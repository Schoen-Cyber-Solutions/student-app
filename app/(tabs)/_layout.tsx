import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Tabs, router } from 'expo-router';
import type { ColorValue } from 'react-native';

import Colors from '@/constants/Colors';
import { glassColors } from '@/constants/Glass';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { getSessionToken, isSessionReady } from '@/services/auth/devSession';
import { useTabAccent } from '@/utils/tabAccent';

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
  const glass = glassColors(colorScheme === 'dark' ? 'dark' : 'light');
  // Each tab's saved accent drives the active tab tint; the values update
  // live via the shared accent store when tabs/screens seed it.
  const homeAccent = useTabAccent('home');
  const calendarAccent = useTabAccent('calendar');
  const chatAccent = useTabAccent('chat');

  useEffect(() => {
    if (isSessionReady() && !getSessionToken()) {
      router.replace('/onboarding');
    }
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].tabIconDefault,
        headerShown: useClientOnlyValue(false, true),
        tabBarBackground: () => <GlassTabBarBackground />,
        // Floating translucent bar — screens render underneath so the
        // calendar background (and other screens) shows through the glass.
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: glass.glassBorder,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarActiveTintColor: homeAccent,
          tabBarIcon: ({ color }) => <TabIcon name="house" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          headerShown: false,
          tabBarActiveTintColor: calendarAccent,
          tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarActiveTintColor: chatAccent,
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
