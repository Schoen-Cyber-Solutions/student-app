import { useCallback, useEffect, useState } from 'react';
import { getCourseColors, setCourseColor as saveCourseColor } from '@/services/api/me';
import { getMyEnrollments } from '@/services/api/academic';
import { buildCourseColorMap } from '@/utils/courseLabel';

/**
 * Shared course-color state:
 *  - `colors`   — backend-persisted user overrides, keyed by course code
 *  - `colorMap` — resolved per-code colors for the student's enrolled
 *                 sections (override wins, otherwise a palette pick chosen to
 *                 maximize hue distance between active courses)
 *
 * Enrollments come from the same API every screen already trusts, so the
 * assignment set — and therefore every course's color — is identical on
 * Home, Calendar, and Chat.
 */
export function useCourseColors() {
  const [colors, setColors] = useState<Record<string, string>>({});
  const [colorMap, setColorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      // Enrollments are allowed to fail independently — an empty set just
      // means colorMap stays empty and getCourseColor falls back to hashing.
      const [list, enrollments] = await Promise.all([
        getCourseColors(),
        getMyEnrollments().catch(() => []),
      ]);
      const map: Record<string, string> = {};
      for (const item of list) {
        map[item.courseCode] = item.color;
      }
      setColors(map);
      setColorMap(
        buildCourseColorMap(
          enrollments.map((e) => e.section.course.code),
          map,
        ),
      );
    } catch {
      // leave defaults empty
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setCourseColor = useCallback(async (courseCode: string, color: string) => {
    setLoading(true);
    try {
      await saveCourseColor(courseCode, color);
      setColors((prev) => ({ ...prev, [courseCode]: color }));
      setColorMap((prev) => ({ ...prev, [courseCode]: color }));
    } finally {
      setLoading(false);
    }
  }, []);

  return { colors, colorMap, loading, setCourseColor, reload: load };
}
