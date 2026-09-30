import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface WheelPickerProps<T> {
  items: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  itemHeight?: number;
  visibleCount?: number;
  textColor: string;
  mutedColor: string;
  accentSoft: string;
  renderLabel?: (item: T) => string;
}

const DEFAULT_ITEM_HEIGHT = 36;
const DEFAULT_VISIBLE = 5;

/**
 * iOS-style wheel column: a snap-to-item ScrollView with a fixed selection
 * band. Pure JS — no native dependency, works in any Expo dev build.
 */
export default function WheelPicker<T>({
  items,
  selectedIndex,
  onSelect,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  visibleCount = DEFAULT_VISIBLE,
  textColor,
  mutedColor,
  accentSoft,
  renderLabel,
}: WheelPickerProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const padCount = Math.floor(visibleCount / 2);
  const wheelHeight = itemHeight * visibleCount;
  const lastIndex = useRef(selectedIndex);

  // Scroll to the initial selection once mounted (and on external resets).
  useEffect(() => {
    lastIndex.current = selectedIndex;
    scrollRef.current?.scrollTo({ y: selectedIndex * itemHeight, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, items.length]);

  const settle = (offsetY: number) => {
    const index = Math.min(items.length - 1, Math.max(0, Math.round(offsetY / itemHeight)));
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      onSelect(index);
    } else {
      scrollRef.current?.scrollTo({ y: index * itemHeight, animated: true });
    }
  };

  return (
    <View style={[styles.wheel, { height: wheelHeight }]}>
      <View
        pointerEvents="none"
        style={[
          styles.band,
          { top: padCount * itemHeight, height: itemHeight, backgroundColor: accentSoft },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          // Slow drags with no momentum don't fire onMomentumScrollEnd.
          const y = e.nativeEvent.contentOffset.y;
          const index = Math.min(items.length - 1, Math.max(0, Math.round(y / itemHeight)));
          scrollRef.current?.scrollTo({ y: index * itemHeight, animated: true });
          if (index !== lastIndex.current) {
            lastIndex.current = index;
            onSelect(index);
          }
        }}
        contentContainerStyle={{ paddingVertical: padCount * itemHeight }}>
        {items.map((item, i) => (
          <View key={i} style={[styles.item, { height: itemHeight }]}>
            <Text
              style={[
                styles.label,
                { color: i === selectedIndex ? textColor : mutedColor },
                i === selectedIndex && styles.labelSelected,
              ]}>
              {renderLabel ? renderLabel(item) : String(item)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: {
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
  },
  labelSelected: {
    fontWeight: '600',
  },
});
