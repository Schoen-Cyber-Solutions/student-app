import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

interface PagerStripProps {
  /** Identity of the logical position (weekOffset, selectedDay timestamp,
   *  month key...). When it changes — via a swipe commit or a jump like
   *  "Today" — the strip re-centers instantly; the page that was just
   *  settled onto now occupies the center slot, so the reset is invisible. */
  position: unknown;
  /** slot -1 = previous page, 0 = current, 1 = next. The same slot index
   *  persists across rotations (keyed by slot, not content), so a settled
   *  destination page never remounts. */
  renderPage: (slot: -1 | 0 | 1) => ReactNode;
  /** Content slides left → advancing forward (next day/week/month). */
  onSwipeLeft?: () => void;
  /** Content slides right → moving backward. */
  onSwipeRight?: () => void;
  /** When true, the strip sizes to its pages' natural height instead of
   *  filling the parent — required inside an unbounded parent like a
   *  ScrollView, where flex:1 has no height to grow into and collapses. */
  fitContent?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SLOTS = [-1, 0, 1] as const;

// Gesture tuning — horizontal intent must beat dy; release commits on
// travel (fraction of page width) or velocity (px/ms).
const SWIPE_START_THRESHOLD = 10;
const SWIPE_RATIO = 1.5;
const COMMIT_TRAVEL_RATIO = 0.22;
const VELOCITY_THRESHOLD = 0.35;
const VELOCITY_MIN_DX = 30;
const SETTLE_DURATION = 220;

/**
 * Three-page horizontal pager shared by Calendar Day/Week/Month views.
 *
 * prev | current | next pages render side by side; a static -pageWidth
 * margin keeps the center page visible when translateX === 0. Drags move
 * the strip 1:1 with the finger (native-driver transform), release settles
 * to ±pageWidth or springs back, and only then does the parent's position
 * update — so the destination page is on screen continuously and no
 * spinner/blank flash can appear.
 */
export default function PagerStrip({
  position,
  renderPage,
  onSwipeLeft,
  onSwipeRight,
  fitContent = false,
  style,
}: PagerStripProps) {
  const [pageWidth, setPageWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  // useLayoutEffect so the re-center lands before paint — the just-settled
  // neighbor page is already the center page's content, so nothing moves.
  useLayoutEffect(() => {
    translateX.setValue(0);
    isAnimating.current = false;
  }, [position, translateX]);

  // Latest callbacks/width — the responder is created once.
  const cbs = useRef({ onSwipeLeft, onSwipeRight });
  cbs.current = { onSwipeLeft, onSwipeRight };
  const widthRef = useRef(pageWidth);
  widthRef.current = pageWidth;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        if (isAnimating.current) return false;
        const { dx, dy } = gs;
        return (
          Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO &&
          Math.abs(dx) > SWIPE_START_THRESHOLD
        );
      },
      onPanResponderTerminationRequest: () => true,
      onShouldBlockNativeResponder: () => false,
      // 1:1 finger-follow — no damping, no cap; slow drags track the finger
      // exactly and neighbor pages are already rendered beside this one.
      onPanResponderMove: (_, gs) => {
        translateX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        const w = widthRef.current;
        const { dx, vx } = gs;
        const goingLeft =
          dx < -w * COMMIT_TRAVEL_RATIO ||
          (dx < -VELOCITY_MIN_DX && vx < -VELOCITY_THRESHOLD);
        const goingRight =
          dx > w * COMMIT_TRAVEL_RATIO ||
          (dx > VELOCITY_MIN_DX && vx > VELOCITY_THRESHOLD);

        if (goingLeft) {
          isAnimating.current = true;
          Animated.timing(translateX, {
            toValue: -w,
            duration: SETTLE_DURATION,
            useNativeDriver: true,
          }).start(() => cbs.current.onSwipeLeft?.());
        } else if (goingRight) {
          isAnimating.current = true;
          Animated.timing(translateX, {
            toValue: w,
            duration: SETTLE_DURATION,
            useNativeDriver: true,
          }).start(() => cbs.current.onSwipeRight?.());
        } else {
          isAnimating.current = true;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
            speed: 16,
          }).start(() => {
            isAnimating.current = false;
          });
        }
      },
      onPanResponderTerminate: () => {
        isAnimating.current = true;
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 16,
        }).start(() => {
          isAnimating.current = false;
        });
      },
    })
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setPageWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
  };

  return (
    <View
      style={[fitContent ? styles.clipAuto : styles.clip, style]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}>
      {pageWidth > 0 ? (
        <Animated.View
          style={[
            fitContent ? styles.stripAuto : styles.strip,
            {
              width: pageWidth * 3,
              marginLeft: -pageWidth,
              transform: [{ translateX }],
            },
          ]}>
          {SLOTS.map((slot) => (
            <View key={slot} style={{ width: pageWidth }}>
              {renderPage(slot)}
            </View>
          ))}
        </Animated.View>
      ) : (
        // First layout pass hasn't measured yet — render the center page
        // alone so there's no empty flash.
        <View style={styles.fallback}>{renderPage(0)}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    flex: 1,
    overflow: 'hidden',
  },
  // Inside an unbounded parent (ScrollView) — height comes from the pages.
  clipAuto: {
    overflow: 'hidden',
  },
  strip: {
    flex: 1,
    flexDirection: 'row',
  },
  stripAuto: {
    flexDirection: 'row',
  },
  fallback: {
    flex: 1,
  },
});
