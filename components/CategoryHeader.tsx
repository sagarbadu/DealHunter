import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

export function CategoryHeader({ icon, title, color = theme.colors.green }: { icon: keyof typeof Ionicons.glyphMap; title: string; color?: string }) {
  return <View style={styles.wrap}><View style={[styles.icon, { backgroundColor: `${color}18` }]}><Ionicons name={icon} size={18} color={color} /></View><Text style={styles.title}>{title}</Text></View>;
}

const styles = StyleSheet.create({ wrap: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, title: { color: theme.colors.ink, fontSize: 17, fontWeight: '800' } });
