import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  ScrollViewProps,
  TextInput,
} from 'react-native';

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: ReactNode;
  /**
   * Minimum gap kept between the bottom of the focused input and the top of
   * the keyboard, in points.
   */
  extraScrollHeight?: number;
}

/**
 * ScrollView that keeps the focused TextInput visible above the keyboard.
 *
 * - Uses `automaticallyAdjustKeyboardInsets` on iOS so the scrollable area
 *   extends above the keyboard.
 * - On focus (bubbled from descendant TextInputs) and on keyboard show,
 *   measures the focused input and scrolls it above the keyboard if needed.
 * - On Android, applies equivalent bottom padding while the keyboard is open.
 */
export default function KeyboardAwareScrollView({
  children,
  extraScrollHeight = 16,
  contentContainerStyle,
  onScroll,
  onFocus,
  scrollEventThrottle,
  ...rest
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const keyboardHeight = useRef(0);
  const [androidPad, setAndroidPad] = useState(0);

  const scrollFocusedIntoView = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    if (!input) return;
    input.measureInWindow((_x, y, _w, h) => {
      const screenH = Dimensions.get('window').height;
      const visibleBottom = screenH - keyboardHeight.current - extraScrollHeight;
      const inputBottom = y + h;
      if (inputBottom > visibleBottom) {
        const delta = inputBottom - visibleBottom;
        scrollRef.current?.scrollTo({
          y: scrollOffset.current + delta,
          animated: true,
        });
      }
    });
  }, [extraScrollHeight]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        keyboardHeight.current = e.endCoordinates.height;
        if (Platform.OS === 'android') setAndroidPad(e.endCoordinates.height);
        // Let the focus state settle before measuring.
        setTimeout(scrollFocusedIntoView, 60);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeight.current = 0;
        setAndroidPad(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollFocusedIntoView]);

  // Focus events bubble up from descendant TextInputs, so this also handles
  // moving between fields while the keyboard is already open.
  const handleFocus = useCallback(
    (e: Parameters<NonNullable<ScrollViewProps['onFocus']>>[0]) => {
      onFocus?.(e);
      setTimeout(scrollFocusedIntoView, 80);
    },
    [onFocus, scrollFocusedIntoView]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    },
    [onScroll]
  );

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      scrollEventThrottle={scrollEventThrottle ?? 16}
      onScroll={handleScroll}
      onFocus={handleFocus}
      contentContainerStyle={[
        contentContainerStyle,
        Platform.OS === 'android' && androidPad > 0
          ? { paddingBottom: androidPad }
          : null,
      ]}
      {...rest}>
      {children}
    </ScrollView>
  );
}
