import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { spacing, radius, typography } from '@/constants/Theme';
import { useColorScheme } from '@/components/useColorScheme';

export default function ComposeEmailScreen() {
  const colors = Colors[useColorScheme()];
  const { toName, toAddress } = useLocalSearchParams<{
    toName?: string;
    toAddress?: string;
  }>();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const recipientName = toName ?? '';
  const recipientAddress = toAddress ?? '';

  const recipientPillBg = colors.tintSoft;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New Message',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={[styles.headerAction, { color: colors.tint }]}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => {
                // Prototype: no real send. Just dismiss.
                router.back();
              }}
              hitSlop={8}>
              <Text
                style={[
                  styles.headerAction,
                  { color: subject.trim() && body.trim() ? colors.tint : colors.mutedText },
                ]}>
                Send
              </Text>
            </Pressable>
          ),
        }}
      />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* To field */}
        <View style={[styles.row, { borderBottomColor: colors.divider }]}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>To:</Text>
          <View style={[styles.recipientPill, { backgroundColor: recipientPillBg }]}>
            <SymbolView name="person.fill" tintColor={colors.tint} size={12} />
            <Text style={[styles.recipientName, { color: colors.text }]} numberOfLines={1}>
              {recipientName}
            </Text>
            <Text style={[styles.recipientAddress, { color: colors.secondaryText }]} numberOfLines={1}>
              {recipientAddress}
            </Text>
          </View>
        </View>

        {/* Subject field */}
        <View style={[styles.row, { borderBottomColor: colors.divider }]}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>Subject:</Text>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Enter subject"
            placeholderTextColor={colors.mutedText}
            value={subject}
            onChangeText={setSubject}
            autoFocus={!recipientName}
            accessibilityLabel="Subject"
          />
        </View>

        {/* Body field */}
        <TextInput
          style={[styles.bodyInput, { color: colors.text }]}
          placeholder="Write your message..."
          placeholderTextColor={colors.mutedText}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Message body"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
  },
  headerAction: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '400',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...typography.label,
    width: 64,
  },
  input: {
    ...typography.bodyRegular,
    fontSize: 15,
    flex: 1,
    paddingVertical: 2,
  },
  recipientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA', // teal-50 equivalent; overridden by inline style for dark mode
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    flex: 1,
  },
  recipientName: {
    ...typography.label,
    fontWeight: '600',
  },
  recipientAddress: {
    ...typography.caption,
    flex: 1,
  },
  bodyInput: {
    ...typography.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flex: 1,
  },
});
