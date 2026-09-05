import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Course } from '@/types';
import { Text } from './Themed';
import Colors from '@/constants/Colors';
import { radius, spacing, typography } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';

interface CourseDetailOverlayProps {
  course: Course | null;
  onClose: () => void;
}

export default function CourseDetailOverlay({ course, onClose }: CourseDetailOverlayProps) {
  const colors = Colors[useColorScheme()];
  const visible = course !== null;

  const handleEmailProfessor = () => {
    if (!course) return;
    onClose();
    router.push({
      pathname: '/uni-email/compose',
      params: {
        toName: course.instructor,
        toAddress: course.instructorEmail,
      },
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      presentationStyle="overFullScreen">
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropHit} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Handle bar */}
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.divider }]} />
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}>
              <SymbolView name="xmark.circle.fill" tintColor={colors.mutedText} size={24} />
            </Pressable>
          </View>

          {course && (
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={[styles.code, { color: colors.secondaryText }]}>{course.code}</Text>
                <Text style={styles.name}>{course.name}</Text>
              </View>

              <View style={styles.row}>
                <SymbolView name="clock" tintColor={colors.mutedText} size={16} />
                <Text style={[styles.rowText, { color: colors.text }]}>
                  {course.startTime} – {course.endTime}
                </Text>
              </View>

              <View style={styles.row}>
                <SymbolView name="mappin.and.ellipse" tintColor={colors.mutedText} size={16} />
                <Text style={[styles.rowText, { color: colors.text }]}>{course.location}</Text>
              </View>

              <Pressable
                onPress={handleEmailProfessor}
                style={({ pressed }) => [
                  styles.row,
                  styles.professorRow,
                  { backgroundColor: colors.surface },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Email ${course.instructor}`}>
                <SymbolView name="envelope" tintColor={colors.tint} size={16} />
                <View style={styles.professorText}>
                  <Text style={[styles.rowText, { color: colors.text }]}>{course.instructor}</Text>
                  <Text style={[styles.email, { color: colors.secondaryText }]}>
                    {course.instructorEmail}
                  </Text>
                </View>
                <SymbolView
                  name="chevron.right"
                  tintColor={colors.mutedText}
                  size={14}
                  style={styles.chevron}
                />
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backdropHit: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 32,
    maxHeight: '60%',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    position: 'relative',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.sm,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  code: {
    ...typography.overline,
    marginBottom: 4,
  },
  name: {
    ...typography.heading,
    fontSize: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.sm,
  },
  rowText: {
    ...typography.bodyRegular,
    fontSize: 15,
  },
  professorRow: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  professorText: {
    flex: 1,
  },
  email: {
    ...typography.caption,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 'auto',
  },
});
