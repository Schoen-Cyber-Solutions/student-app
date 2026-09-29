import { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import KeyboardAwareScrollView from './KeyboardAwareScrollView';
import { View } from './Themed';
import { TAB_BAR_CLEARANCE } from '@/constants/Theme';

interface ScreenWrapperProps {
  children: ReactNode;
  scrollable?: boolean;
}

export default function ScreenWrapper({ children, scrollable = true }: ScreenWrapperProps) {
  if (scrollable) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {children}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={[styles.content, styles.contentNonScrollable]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    // Clearance so the last item can scroll above the floating glass tab bar.
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  contentNonScrollable: {
    flex: 1,
  },
});
