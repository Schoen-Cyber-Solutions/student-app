import { Stack } from 'expo-router';
import { TabTextModeProvider } from '@/components/TabTextMode';

/**
 * Nested stack inside the Chat tab. Chat subpages push within the tab so the
 * bottom tab bar stays visible throughout the Chat flow. All routes use the
 * shared custom AppHeader — native headers are disabled statically here, never
 * toggled from inside a screen (a dynamic headerShown change inside a modal
 * caused the remount loop on New Thread; new-thread is a plain push so the tab
 * bar and swipe-back remain available).
 */
export default function ChatsLayout() {
  return (
    <TabTextModeProvider tab="chat">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="[communityId]" />
        <Stack.Screen name="[communityId]/new-thread" />
        <Stack.Screen name="[communityId]/thread/[threadId]" />
      </Stack>
    </TabTextModeProvider>
  );
}
