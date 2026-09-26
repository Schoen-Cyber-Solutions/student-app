import { Pressable, StyleSheet, View, Text as RNText } from 'react-native';
import { Course } from '@/types';
import { radius, spacing } from '@/constants/Theme';
import { COMPLETED_EVENT_TEXT } from '@/utils/courseLabel';

const HOUR_HEIGHT = 52;

interface TimetableCourseBlockProps {
  course: Course;
  top: number;
  height: number;
  widthPercent: number;
  leftPercent: number;
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
  onPress,
}: TimetableCourseBlockProps) {
  const isPointInTime = !course.endTime && !course.isCluster;
  const knownCode = course.code && course.code.trim().length >= 2 ? course.code.trim() : '';
  const displayCode = extractRecognizableCode(course.name, knownCode);
  const shortName = displayCode ? cleanShortName(course.name, displayCode) : course.name;

  const canShowCode = height >= 30 && displayCode.length > 0;
  const canShowName = height >= 36 && shortName.length > 0;
  const canShowTime = height >= 52;

  const timeText = isPointInTime
    ? course.startTime
    : course.endTime
    ? `${course.startTime} – ${course.endTime}`
    : course.startTime;

  return (
    <Pressable
      style={[
        styles.block,
        isPointInTime && styles.pointBlock,
        {
          top,
          height,
          width: `${widthPercent}%`,
          left: `${leftPercent}%`,
          backgroundColor: course.color ?? '#64748B',
        },
      ]}
      onPress={() => onPress?.(course)}
      accessibilityLabel={`${course.name}, ${course.startTime}${
        course.endTime ? ` to ${course.endTime}` : ''
      }${course.location ? `, ${course.location}` : ''}`}
      accessibilityRole="button">
      {isPointInTime && <View style={styles.pointMarker} />}
      {canShowCode ? (
        <RNText
          style={[styles.codeText, course.completed && styles.completedText]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {displayCode}
        </RNText>
      ) : null}
      {canShowName ? (
        <RNText
          style={[
            styles.nameText,
            course.completed && styles.completedNameText,
          ]}
          numberOfLines={canShowTime ? 1 : 2}
          ellipsizeMode="tail">
          {shortName}
        </RNText>
      ) : null}
      {canShowTime ? (
        <RNText
          style={[styles.timeText, course.completed && styles.completedText]}
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
    borderRadius: radius.sm,
    paddingHorizontal: 3,
    paddingVertical: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    // Improve event edges on light backgrounds.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
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
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
    letterSpacing: 0.3,
  },
  nameText: {
    color: '#FFFFFF',
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
