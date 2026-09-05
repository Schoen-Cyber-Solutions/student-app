import { StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';
import { mockEmails } from '@/data/mockEmails';

export default function EmailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const email = mockEmails.find((e) => e.id === id);

  if (!email) {
    return (
      <>
        <Stack.Screen options={{ title: 'Email' }} />
        <View style={styles.center}>
          <Text>Email not found.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: email.subject }} />
      <ScreenWrapper>
        <View style={styles.header}>
          <Text style={styles.sender}>{email.senderName}</Text>
          <Text style={styles.senderAddress}>{email.senderAddress}</Text>
          <Text style={styles.timestamp}>
            {new Date(email.receivedAt).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.bodyText}>
            {email.body || email.preview}
          </Text>
        </View>
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sender: {
    fontSize: 16,
    fontWeight: '600',
  },
  senderAddress: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
