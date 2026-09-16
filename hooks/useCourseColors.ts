import { useCallback, useEffect, useState } from 'react';
import { getCourseColors, setCourseColor as saveCourseColor } from '@/services/api/me';

export function useCourseColors() {
  const [colors, setColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await getCourseColors();
      const map: Record<string, string> = {};
      for (const item of list) {
        map[item.courseCode] = item.color;
      }
      setColors(map);
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
    } finally {
      setLoading(false);
    }
  }, []);

  return { colors, loading, setCourseColor, reload: load };
}
