import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { initSession } from '@/services/auth/devSession';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'onboarding',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    void initSession().then(() => setSessionReady(true));
  }, []);

  useEffect(() => {
    if (loaded && sessionReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, sessionReady]);

  if (!loaded || !sessionReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Back', headerBackTitle: 'Back' }} />
        <Stack.Screen name="onboarding" options={{ title: 'Get Started', headerShown: false }} />
        <Stack.Screen name="setup" options={{ title: 'Create Profile', headerShown: false }} />
        <Stack.Screen name="calendar-connect" options={{ title: 'Connect Calendar', headerShown: false }} />
        <Stack.Screen name="calendar-edit" options={{ title: 'Calendar Options', presentation: 'modal' }} />
        <Stack.Screen name="calendar-event" options={{ title: 'New Event', presentation: 'modal' }} />
        <Stack.Screen name="profile-edit" options={{ title: 'Edit Profile', presentation: 'modal' }} />
        <Stack.Screen name="menu" options={{ title: 'Menu' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="uni-email/index" options={{ title: 'Email', headerShown: false }} />
        <Stack.Screen name="uni-email/[id]" options={{ title: 'Email' }} />
        <Stack.Screen name="uni-email/compose" options={{ title: 'New Message', presentation: 'modal' }} />
        <Stack.Screen name="chats/[courseId]" options={{ title: 'Course Community', headerShown: false }} />
        <Stack.Screen name="chats/[courseId]/new-thread" options={{ title: 'New Thread', presentation: 'modal' }} />
        <Stack.Screen name="chats/[courseId]/thread/[threadId]" options={{ title: 'Thread', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
