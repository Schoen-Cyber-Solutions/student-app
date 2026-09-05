import { StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Text, View } from '@/components/Themed';
import AppHeader from '@/components/AppHeader';
import { mockEmails } from '@/data/mockEmails';

const categoryColors: Record<string, string> = {
  academic: '#EFF6FF',
  administrative: '#F3E8FF',
  club: '#ECFDF5',
  general: '#F1F5F9',
};

const categoryTextColors: Record<string, string> = {
  academic: '#1D4ED8',
  administrative: '#7E22CE',
  club: '#047857',
  general: '#475569',
};

export default function UniEmailScreen() {
  return (
    <View style={styles.container}>
      <AppHeader greeting="Uni Email" />
      <View style={styles.list}>
        {mockEmails.map((email) => (
          <Link
            key={email.id}
            href={`/uni-email/${email.id}`}
            asChild>
            <Pressable style={styles.row}>
              <View style={styles.left}>
                <Text style={[styles.sender, !email.isRead && styles.unread]}>
                  {email.senderName}
                </Text>
                <Text style={styles.subject} numberOfLines={1}>
                  {email.subject}
                </Text>
                <Text style={styles.preview} numberOfLines={2}>
                  {email.preview}
                </Text>
              </View>
              <View style={styles.right}>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: categoryColors[email.category] || '#F1F5F9' },
                  ]}>
                  <Text
                    style={[
                      styles.categoryText,
                      { color: categoryTextColors[email.category] || '#475569' },
                    ]}>
                    {email.category}
                  </Text>
                </View>
                <Text style={styles.timestamp}>
                  {new Date(email.receivedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                {!email.isRead && <View style={styles.unreadDot} />}
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  left: {
    flex: 1,
  },
  sender: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  unread: {
    fontWeight: '700',
    color: '#0F172A',
  },
  subject: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  preview: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 12,
    minWidth: 60,
  },
  categoryBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timestamp: {
    fontSize: 12,
    color: '#94A3B8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F766E',
    marginTop: 6,
  },
});
