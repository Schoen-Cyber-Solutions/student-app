import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

interface ImageViewerModalProps {
  /** Authenticated image source (uri + headers), or null when closed. */
  source: { uri: string; headers?: Record<string, string> } | null;
  onClose: () => void;
  /** When provided (another user's image), shows a report flag button. */
  onReport?: () => void;
}

/** Simple full-screen image viewer: tap backdrop or the X to dismiss. */
export default function ImageViewerModal({ source, onClose, onReport }: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={source !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close image viewer">
        {source && (
          <Image source={source} style={styles.image} resizeMode="contain" />
        )}
        <View style={[styles.close, { top: insets.top + 12 }]}>
          {onReport && (
            <Pressable
              onPress={onReport}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Report image">
              <SymbolView name="flag" tintColor="#FFFFFF" size={24} />
            </Pressable>
          )}
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <SymbolView name="xmark.circle.fill" tintColor="#FFFFFF" size={30} />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '85%',
  },
  close: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
});
