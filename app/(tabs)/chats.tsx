import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import AppHeader from '@/components/AppHeader';

export default function ChatsScreen() {
  return (
    <View style={styles.container}>
      <AppHeader greeting="Chats" />
      <View style={styles.center}>
        <Text style={styles.title}>Course Communities</Text>
        <Text style={styles.subtitle}>
          Select a course to view its discussion threads.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
});
