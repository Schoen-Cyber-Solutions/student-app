import { StyleSheet, Pressable } from 'react-native';
import { Stack, Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text, View } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';

const menuItems = [
  { label: 'Profile', href: '/profile', icon: 'person' },
  { label: 'Settings', href: '/menu', icon: 'gear' },
  { label: 'About', href: '/menu', icon: 'info.circle' },
];

export default function MenuScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Menu' }} />
      <ScreenWrapper>
        <View style={styles.list}>
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href as any} asChild>
              <Pressable style={styles.row}>
                <SymbolView name={item.icon as any} tintColor="#64748B" size={22} />
                <Text style={styles.label}>{item.label}</Text>
                <SymbolView name="chevron.right" tintColor="#CBD5E1" size={16} style={styles.chevron} />
              </Pressable>
            </Link>
          ))}
        </View>
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  label: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  chevron: {
    marginLeft: 'auto',
  },
});
