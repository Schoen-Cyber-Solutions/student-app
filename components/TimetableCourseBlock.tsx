import { Pressable, StyleSheet, View, Text as RNText } from 'react-native';
import { Course } from '@/types';
import { radius, spacing } from '@/constants/Theme';
import { COMPLETED_EVENT_TEXT, COMPLETED_EVENT_COLOR } from '@/utils/courseLabel';
import { contrastText, withAlpha } from '@/constants/Glass';
import { computeBlockLabels } from '@/utils/timetableLabel';

const HOUR_HEIGHT = 52;

interface TimetableCourseBlockProps {
  course: Course;
  top: number;
  height: number;
  widthPercent: number;
  leftPercent: number;
  /** Compact mode (fit-to-screen Week view): tighter padding and lower
   *  height thresholds so short events still show their code/name. */
  compact?: boolean;
  /** Measured pixel width of this block (column width × its lane share).
   *  Omitted = unconstrained width (Day view). Drives the micro-label
   *  fallback so narrow lanes never render truncated fragments. */
  blockWidthPx?: number;
  /** Week-only label used when a saved campus event's title can't be
   *  rendered (e.g. 'Laker Event'). Never mutates the stored title. */
  fallbackTitle?: string;
  onPress?: (course: Course) => void;
}

export default function TimetableCourseBlock({
  course,
  top,
  height,
  widthPercent,
  leftPercent,
  compact = false,
  blockWidthPx,
  fallbackTitle,
  onPress,
}: TimetableCourseBlockProps) {
  const isPointInTime = !course.endTime && !course.isCluster;
  // Personal and saved Laker Connect events stack start/end on separate
  // lines — the merged "5:00 PM – 9:00 PM" string doesn't fit narrow Week
  // columns. Priority when space is tight: title → start → end.
  const stackedTimes = !!(course.isPersonal || course.isCampusEvent);
  const usablePx =
    blockWidthPx != null
      ? blockWidthPx - (compact ? 6 : 8) - (isPointInTime ? 3 : 0)
      : undefined;
  const labels = computeBlockLabels(course, height, compact, fallbackTitle, usablePx);

  // Slightly translucent course color keeps the glass feel while preserving
  // course identity; completed events keep their solid light-gray status.
  const blockColor = course.completed
    ? COMPLETED_EVENT_COLOR
    : withAlpha(course.color ?? '#64748B', 0.88);
  // Text on the course-colored block picks black or white by luminance —
  // white is not assumed to work on every palette color.
  const fg = course.completed ? COMPLETED_EVENT_TEXT : contrastText(course.color ?? '#64748B');
  const fgSoft = withAlpha(fg, 0.85);

  return (
    <Pressable
      style={[
        styles.block,
        compact && styles.blockCompact,
        isPointInTime && styles.pointBlock,
        {
          top,
          height,
          width: `${widthPercent}%`,
          left: `${leftPercent}%`,
          backgroundColor: blockColor,
        },
      ]}
      onPress={() => onPress?.(course)}
      accessibilityLabel={`${course.name}, ${course.startTime}${
        course.endTime ? ` to ${course.endTime}` : ''
      }${course.location ? `, ${course.location}` : ''}`}
      accessibilityRole="button">
      {isPointInTime && <View style={[styles.pointMarker, { backgroundColor: fgSoft }]} />}
      {/* Micro mode: one atomic token that always fits whole (code, first
          word, or "5P") — or a deliberate marker dot when nothing fits.
          Never an ellipsized fragment. */}
      {labels.microLabel ? (
        <RNText
          style={[styles.microText, { color: fg }]}
          numberOfLines={1}>
          {labels.microLabel}
        </RNText>
      ) : labels.indicatorOnly ? (
        <View style={[styles.indicatorDot, { backgroundColor: fgSoft }]} />
      ) : null}
      {labels.codeLines.length > 0 ? (
        <RNText
          style={[styles.codeText, { color: fg }]}
          // Whole lines only — a wrapped code ("CSIA"/"301") renders as
          // two deliberate lines, never an ellipsized fragment.
          numberOfLines={labels.codeLines.length}>
          {labels.codeLines.join('\n')}
        </RNText>
      ) : labels.code ? (
        <RNText
          style={[styles.codeText, { color: fg }]}
          // Week fallback ("Laker\nEvent") needs two lines.
          numberOfLines={labels.codeIsFallback ? 2 : 1}
          ellipsizeMode="tail">
          {labels.code}
        </RNText>
      ) : null}
      {labels.name ? (
        <RNText
          style={[
            styles.nameText,
            { color: fg },
            course.completed && styles.completedNameText,
          ]}
          numberOfLines={labels.nameIsFallback ? 2 : labels.showTime ? 1 : 2}
          ellipsizeMode="tail">
          {labels.name}
        </RNText>
      ) : null}
      {labels.showTime && stackedTimes ? (
        <>
          <RNText
            style={[styles.timeText, { color: fgSoft }]}
            numberOfLines={1}>
            {labels.timeLabel}
          </RNText>
          {labels.showEndLine ? (
            <RNText
              style={[styles.timeText, { color: fgSoft }]}
              numberOfLines={1}>
              {labels.endLabel}
            </RNText>
          ) : null}
        </>
      ) : labels.showTime ? (
        <RNText
          style={[styles.timeText, { color: fgSoft }]}
          numberOfLines={1}>
          {labels.timeLabel}
        </RNText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    borderRadius: radius.md,
    paddingHorizontal: 4,
    paddingVertical: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    // Improve event edges on light backgrounds.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  blockCompact: {
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: radius.sm,
    justifyContent: 'flex-start',
  },
  pointBlock: {
    // Point-in-time events get a slightly stronger left edge.
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255,255,255,0.55)',
  },
  pointMarker: {
    position: 'absolute',
    left: 2,
    top: '30%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  // Micro-mode label — one atomic token, always rendered whole.
  microText: {
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  // Deliberate marker when a block is too narrow for any text — the event
  // stays visible and tappable (full label lives on the a11y label).
  indicatorDot: {
    alignSelf: 'center',
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    letterSpacing: 0.3,
  },
  nameText: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
    opacity: 0.95,
    marginTop: 1,
  },
  timeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  // Completed events sit on a light-gray tile — muted dark text reads better
  // than the usual white-on-color treatment.
  completedText: {
    color: COMPLETED_EVENT_TEXT,
  },
  completedNameText: {
    color: COMPLETED_EVENT_TEXT,
    textDecorationLine: 'line-through',
  },
});

export { HOUR_HEIGHT };
