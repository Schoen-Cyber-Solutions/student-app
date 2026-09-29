import { Pressable, StyleSheet, View, Text as RNText } from 'react-native';
import { Course } from '@/types';
import { radius, spacing } from '@/constants/Theme';
import { COMPLETED_EVENT_TEXT, COMPLETED_EVENT_COLOR } from '@/utils/courseLabel';
import { contrastText, withAlpha } from '@/constants/Glass';

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
  onPress?: (course: Course) => void;
}

// Recognizable course code patterns such as CSIA301, CST301, CS 425.
const COURSE_CODE_RE = /\b[A-Z]{2,}(?:\s*[-.]?\s*)?\d{3,}[A-Z]?\b/g;

function extractRecognizableCode(name: string, knownCode: string): string {
  if (knownCode && knownCode.replace(/\s/g, '').length >= 3) {
    return knownCode.trim();
  }
  const matches = name.match(COURSE_CODE_RE);
  if (!matches || matches.length === 0) return '';
  // First match is the most reliable recognisable code.
  return matches[0].replace(/\s/g, '');
}

function cleanShortName(name: string, code: string): string {
  // Remove the recognised code and any other code-like substrings.
  let withoutCode = name
    .replace(new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
    .replace(COURSE_CODE_RE, '');
  // Strip noisy prefixes like "G5.202710:" or standalone numbers/punctuation.
  withoutCode = withoutCode.replace(/[A-Za-z]?\d+(?:\.\d+)+[:\s]*/g, ' ');
  withoutCode = withoutCode.replace(/[^A-Za-z\s&-]/g, ' ');
  withoutCode = withoutCode.replace(/\s+/g, ' ').trim();
  const letters = withoutCode.replace(/[^A-Za-z]/g, '');
  // Only return a short name if it has a meaningful word left.
  return letters.length >= 4 ? withoutCode : '';
}

export default function TimetableCourseBlock({
  course,
  top,
  height,
  widthPercent,
  leftPercent,
  compact = false,
  onPress,
}: TimetableCourseBlockProps) {
  const isPointInTime = !course.endTime && !course.isCluster;
  const knownCode = course.code && course.code.trim().length >= 2 ? course.code.trim() : '';
  const displayCode = extractRecognizableCode(course.name, knownCode);
  const shortName = displayCode ? cleanShortName(course.name, displayCode) : course.name;

  // Compact blocks show their identifier earlier and fit name+time on
  // shorter events; the course code is the priority label.
  const canShowCode = height >= (compact ? 22 : 30) && displayCode.length > 0;
  const canShowName = height >= (compact ? 34 : 36) && shortName.length > 0;
  const canShowTime = height >= (compact ? 46 : 52);

  const timeText = isPointInTime
    ? course.startTime
    : course.endTime
    ? `${course.startTime} – ${course.endTime}`
    : course.startTime;

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
      {canShowCode ? (
        <RNText
          style={[styles.codeText, { color: fg }]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {displayCode}
        </RNText>
      ) : null}
      {canShowName ? (
        <RNText
          style={[
            styles.nameText,
            { color: fg },
            course.completed && styles.completedNameText,
          ]}
          numberOfLines={canShowTime ? 1 : 2}
          ellipsizeMode="tail">
          {shortName}
        </RNText>
      ) : null}
      {canShowTime ? (
        <RNText
          style={[styles.timeText, { color: fgSoft }]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {timeText}
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
