import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { spacing, typography } from '@/constants/Theme';
import { LEGAL_DOCUMENTS, LegalDocId, LegalSegment } from '@/constants/legalDocuments';

function SegmentText({ segment, color, linkColor }: { segment: LegalSegment; color: string; linkColor: string }) {
  if (segment.doc) {
    return (
      <Text
        style={{ color: linkColor }}
        accessibilityRole="link"
        onPress={() => router.push(`/legal/${segment.doc}`)}>
        {segment.text}
      </Text>
    );
  }
  if (segment.url) {
    return (
      <Text
        style={{ color: linkColor }}
        accessibilityRole="link"
        onPress={() => Linking.openURL(segment.url!)}>
        {segment.text}
      </Text>
    );
  }
  return <Text style={{ color }}>{segment.text}</Text>;
}

export default function LegalDocumentScreen() {
  const colors = Colors[useColorScheme()];
  const insets = useSafeAreaInsets();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const document = LEGAL_DOCUMENTS[doc as LegalDocId];

  if (!document) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.body, { color: colors.text }]}>Document not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header — safe-area aware, keeps a real Done button for VoiceOver */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.cardBorder },
        ]}>
        <View style={styles.headerSide} />
        <Text
          style={[styles.headerTitle, { color: colors.text }]}
          numberOfLines={1}
          accessibilityRole="header">
          {document.title}
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Done"
          style={styles.headerSide}>
          <Text style={[styles.done, { color: colors.tint }]}>Done</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}>
        <Text style={[styles.title, { color: colors.text }]}>{document.title}</Text>
        <Text style={[styles.intro, { color: colors.secondaryText }]}>{document.intro}</Text>
        <Text style={[styles.meta, { color: colors.mutedText }]}>
          Effective Date: {document.effectiveDate}
        </Text>

        {document.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.text }]}
              accessibilityRole="header">
              {section.title}
            </Text>
            {section.blocks.map((block, i) => {
              if (block.type === 'subheading') {
                return (
                  <Text
                    key={i}
                    style={[styles.subheading, { color: colors.text }]}
                    accessibilityRole="header">
                    {block.text}
                  </Text>
                );
              }
              if (block.type === 'bullets') {
                return (
                  <View key={i} style={styles.bulletList}>
                    {block.items.map((item) => (
                      <View key={item} style={styles.bulletRow}>
                        <View style={[styles.bullet, { backgroundColor: colors.tint }]} />
                        <Text style={[styles.body, { color: colors.secondaryText, flex: 1 }]}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              }
              return (
                <Text key={i} style={[styles.body, { color: colors.secondaryText }]}>
                  {block.segments.map((segment, j) => (
                    <SegmentText
                      key={j}
                      segment={segment}
                      color={colors.secondaryText}
                      linkColor={colors.tint}
                    />
                  ))}
                </Text>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: {
    minWidth: 48,
  },
  headerTitle: {
    ...typography.label,
    fontSize: 17,
    flex: 1,
    textAlign: 'center',
  },
  done: {
    ...typography.label,
    fontSize: 17,
    textAlign: 'right',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    ...typography.heading,
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  intro: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  meta: {
    ...typography.caption,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  subheading: {
    ...typography.label,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  body: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bulletList: {
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 9,
  },
});
