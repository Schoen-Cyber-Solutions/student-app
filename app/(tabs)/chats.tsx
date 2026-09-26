import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import AppHeader from '@/components/AppHeader';
import ScreenWrapper from '@/components/ScreenWrapper';
import SectionHeader from '@/components/SectionHeader';
import CourseCommunityRow from '@/components/CourseCommunityRow';
import EmptyState from '@/components/EmptyState';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useMyCommunities } from '@/hooks/useMyCommunities';
import { useCourseColors } from '@/hooks/useCourseColors';

export default function ChatsScreen() {
  const colors = Colors[useColorScheme()];
  const { status, communities, retry } = useMyCommunities();
  const { colors: courseColors, reload: reloadColors } = useCourseColors();

  useFocusEffect(
    useCallback(() => {
      retry();
      reloadColors();
    }, [retry, reloadColors])
  );

  const renderBody = () => {
    switch (status) {
      case 'loading':
        return (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.tint} />
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
              color: community.courseCode ? courseColors[community.courseCode] : undefined,
            }}
            onPress={() => router.push(`/chats/${encodeURIComponent(community.id)}`)}
          />
        ));
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader safeAreaTop />
      <ScreenWrapper>
        <View style={styles.section}>
          <SectionHeader title="Communities" />
          {renderBody()}
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
  loading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
