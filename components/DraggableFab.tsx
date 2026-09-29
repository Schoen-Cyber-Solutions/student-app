import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import SafeLinearGradient from '@/components/SafeLinearGradient';
import { contrastText } from '@/constants/Glass';
import { clearFabPosition, loadFabPosition, saveFabPosition, type FabOffset } from '@/utils/fabPosition';

const FAB_SIZE = 60;
// Screen-edge margins the button always respects.
const EDGE_MARGIN = 12;
const TAB_BAR_GAP = 4;
const TOP_GAP = 8;
// Pixels of movement before a press becomes a drag.
const DRAG_THRESHOLD = 5;

interface DraggableFabProps {
  /** Accent gradient colors — [top-left, bottom-right]. */
  colors: [string, string];
  /** Distance from the bottom of the screen to the button's default bottom edge. */
  bottomBase: number;
  /** Top safe-area inset — the button never crosses the status bar. */
  topInset: number;
  /** Tab-bar height + bottom inset — the button never slides under the tab bar. */
  bottomKeepout: number;
  shadowColor: string;
  onPress: () => void;
}

/**
 * Floating action button that can be dragged anywhere within the visible
 * bounds and remembers its position across restarts. Tap still fires onPress
 * (the pan responder only claims the gesture after real movement, and claims
 * during the capture phase so parent ScrollViews can't steal mid-drag).
 * Long-press returns it to the default corner.
 */
export function DraggableFab({
  colors,
  bottomBase,
  topInset,
  bottomKeepout,
  shadowColor,
  onPress,
}: DraggableFabProps) {
  const { width, height } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const positionRef = useRef<FabOffset>({ x: 0, y: 0 });

  // Track the committed pan value without reaching into Animated internals.
  useEffect(() => {
    const id = pan.addListener((v) => {
      positionRef.current = { x: v.x, y: v.y };
    });
    return () => pan.removeListener(id);
  }, [pan]);

  // Offset bounds: pan is a translation relative to the default anchor.
  const bounds = useMemo(() => {
    const topEdge = height - bottomBase - FAB_SIZE;
    return {
      minX: EDGE_MARGIN - (width - 20 - FAB_SIZE),
      maxX: 20 - EDGE_MARGIN,
      minY: topInset + TOP_GAP - topEdge,
      maxY: bottomBase - bottomKeepout - TAB_BAR_GAP,
    };
  }, [width, height, bottomBase, topInset, bottomKeepout]);

  const clamp = useCallback(
    (o: FabOffset): FabOffset => ({
      x: Math.min(bounds.maxX, Math.max(bounds.minX, o.x)),
      y: Math.min(bounds.maxY, Math.max(bounds.minY, o.y)),
    }),
    [bounds],
  );
  const clampRef = useRef(clamp);
  clampRef.current = clamp;

  // Restore the persisted offset once on mount.
  useEffect(() => {
    let active = true;
    void loadFabPosition().then((saved) => {
      if (active && saved) pan.setValue(clampRef.current(saved));
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-clamp if bounds change (rotation / window resize) so the button can
  // never be left outside the visible area.
  useEffect(() => {
    const clamped = clamp(positionRef.current);
    if (clamped.x !== positionRef.current.x || clamped.y !== positionRef.current.y) {
      pan.setValue(clamped);
      void saveFabPosition(clamped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamp]);

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        Math.abs(gs.dx) > DRAG_THRESHOLD || Math.abs(gs.dy) > DRAG_THRESHOLD,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const clamped = clampRef.current(positionRef.current);
        const current = positionRef.current;
        if (clamped.x !== current.x || clamped.y !== current.y) {
          Animated.spring(pan, {
            toValue: clamped,
            useNativeDriver: false,
            friction: 7,
            tension: 80,
          }).start();
        }
        void saveFabPosition(clamped);
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
      },
    }),
  ).current;

  const reset = useCallback(() => {
    pan.flattenOffset();
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
      friction: 7,
      tension: 80,
    }).start();
    void clearFabPosition();
  }, [pan]);

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.fab,
        { bottom: bottomBase, shadowColor },
        { transform: pan.getTranslateTransform() },
      ]}>
      <Pressable
        onPress={onPress}
        onLongPress={reset}
        delayLongPress={400}
        style={({ pressed }) => [styles.pressArea, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Add calendar item"
        accessibilityHint="Tap to add an event. Drag to move the button. Press and hold to reset its position.">
        <SafeLinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SymbolView name="plus" tintColor={contrastText(colors[0])} size={28} weight="semibold" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  pressArea: {
    flex: 1,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.9,
  },
});
