import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { glassColors } from '@/constants/Glass';
import { radius } from '@/constants/Theme';
import { useColorScheme } from './useColorScheme';
import { useTextMode, useThemedColors } from './TabTextMode';
import { chatAttachmentSource, MessageAttachment } from '@/services/api/communities';

const MAX_HEIGHT = 240;

interface AttachedImageProps {
  attachment: MessageAttachment;
  onPress?: (attachment: MessageAttachment) => void;
  style?: ViewStyle;
}

/** Renders a chat image attachment inside a bubble: aspect-ratio preserved,
 *  height-capped, translucent placeholder while it loads. No BlurView. */
export default function AttachedImage({ attachment, onPress, style }: AttachedImageProps) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = useThemedColors();
  const glass = glassColors(scheme, undefined, useTextMode());
  const [loading, setLoading] = useState(true);

  const source = useMemo(() => chatAttachmentSource(attachment), [attachment]);
  const ratio =
    attachment.width && attachment.height && attachment.width > 0
      ? attachment.width / attachment.height
      : 4 / 3;

  return (
    <Pressable
      onPress={onPress ? () => onPress(attachment) : undefined}
      disabled={!onPress}
      accessibilityRole={onPress ? 'imagebutton' : 'image'}
      accessibilityLabel="Image attachment"
      style={[styles.frame, { borderColor: glass.glassBorder }, style]}>
      <Image
        source={source}
        style={{ width: '100%', aspectRatio: ratio, maxHeight: MAX_HEIGHT }}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={[styles.placeholder, { backgroundColor: glass.glassFaint }]}>
          <ActivityIndicator size="small" color={colors.mutedText} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
