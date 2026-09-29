import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import CourseCommunityRow from '@/components/CourseCommunityRow';
import ChatSearchBar from '@/components/ChatSearchBar';
import ChatSearchResults from '@/components/ChatSearchResults';
import EmptyState from '@/components/EmptyState';
import CalendarBackground from '@/components/CalendarBackground';
import GlassPanel from '@/components/GlassPanel';
import { spacing } from '@/constants/Theme';
import { useThemedColors } from '@/components/TabTextMode';
import { useMyCommunities } from '@/hooks/useMyCommunities';
import { useChatSearch } from '@/hooks/useChatSearch';
import { useCourseColors } from '@/hooks/useCourseColors';
import { useTabAccent } from '@/utils/tabAccent';
import { getCourseColor } from '@/utils/courseLabel';
import { refreshTabAppearance, useTabAppearance } from '@/utils/tabAppearanceStore';

export default function ChatsScreen() {
  const colors = useThemedColors();
  const accent = useTabAccent('chat');
  const chatAppearance = useTabAppearance('chat');
  const { status, communities, retry } = useMyCommunities();
  const { colors: courseColors, colorMap, reload: reloadColors } = useCourseColors();
  // Global search across every community the user can access.
  const search = useChatSearch();

  useFocusEffect(
    useCallback(() => {
      retry();
      reloadColors();
      // Refresh the shared store on focus; live writes arrive via subscription.
      void refreshTabAppearance();
    }, [retry, reloadColors])
  );

  const renderBody = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.loading}>
            <ActivityIndicator color={accent} />
          </View>
        );
      case 'unauthorized':
        return (
          <EmptyState
            title="Not signed in"
            message="Your session is missing or has expired. Sign in again to see your communities."
            icon="person.crop.circle.badge.exclamationmark"
            actionLabel="Try again"
            onAction={retry}
          />
        );
      case 'error':
        return (
          <EmptyState
            title="Couldn't load communities"
            message="Check your connection and try again."
            icon="wifi.exclamationmark"
            actionLabel="Retry"
            onAction={retry}
          />
        );
      case 'success':
        if (communities.length === 0) {
          return (
            <EmptyState
              title="No communities available yet"
              message="Add your courses in Academic Setup to join their communities."
              icon="book.closed"
              actionLabel="Academic Setup"
              onAction={() => router.push('/academic-setup')}
            />
          );
        }
        return communities.map((community) => (
          <CourseCommunityRow
            key={community.id}
            course={{
              id: community.id,
              name: community.name,
              code: community.subtitle,
              // Same shared course color as Calendar/Home — university-wide
              // communities have no course and keep the accent dot.
              color:
                community.type === 'section'
                  ? getCourseColor(
                      {
                        courseCode: community.courseCode,
                        courseName: community.courseName ?? community.name,
                      },
                      courseColors,
                      colorMap,
                    )
                  : undefined,
            }}
            onPress={() => router.push(`/chats/${encodeURIComponent(community.id)}`)}
          />
        ));
    }
  };

  return (
    <View style={styles.container}>
      <CalendarBackground appearance={chatAppearance} />
      <AppHeader safeAreaTop greeting="Chats" titleLeft accent={accent} />
      <ScreenWrapper>
        <View style={styles.section}>
          <ChatSearchBar
            value={search.query}
            onChange={search.setQuery}
            accent={accent}
            placeholder="Search your discussions"
          />
          {search.query.trim().length > 0 ? (
            <View style={styles.searchResults}>
              <ChatSearchResults
                results={search.results}
                searching={search.searching}
                query={search.query.trim()}
                accent={accent}
                type={search.type}
                onTypeChange={search.setType}
              />
            </View>
          ) : (
            <GlassPanel style={styles.listPanel} intensity={30}>
              <View style={styles.listInner}>
                {renderBody()}
              </View>
            </GlassPanel>
          )}
        </View>
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listPanel: {
    marginTop: spacing.xs,
  },
  searchResults: {
    marginTop: spacing.md,
  },
  listInner: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
