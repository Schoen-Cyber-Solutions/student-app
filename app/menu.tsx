import { StyleSheet, Pressable } from 'react-native';
import { Stack, Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Text, View } from '@/components/Themed';
import ScreenWrapper from '@/components/ScreenWrapper';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const menuItems = [
  { label: 'Profile', href: '/profile', icon: 'person' },
  { label: 'Academic Setup', href: '/academic-setup', icon: 'graduationcap' },
  { label: 'Campus Events', href: '/events', icon: 'ticket' },
  { label: 'Settings', href: '/settings', icon: 'gear' },
  { label: 'About', href: '/about', icon: 'info.circle' },
];

export default function MenuScreen() {
  const colors = Colors[useColorScheme()];
  return (
    <>
      <Stack.Screen options={{ title: 'Menu', headerTitleAlign: 'left' }} />
      <ScreenWrapper>
        <View style={styles.list}>
          {menuItems.map((item) => (
            <Link key={item.label} href={item.href as any} asChild>
              <Pressable
                style={StyleSheet.flatten([styles.row, { borderBottomColor: colors.cardBorder }])}>
                <SymbolView name={item.icon as any} tintColor={colors.tint} size={22} />
                <Text style={styles.label}>{item.label}</Text>
                <SymbolView name="chevron.right" tintColor={colors.mutedText} size={16} style={styles.chevron} />
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
