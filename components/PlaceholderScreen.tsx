import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

export function PlaceholderScreen({ icon, title, description }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }) {
  return <View style={styles.screen}><View style={styles.icon}><Ionicons name={icon} size={32} color={theme.colors.green} /></View><Text style={styles.title}>{title}</Text><Text style={styles.description}>{description}</Text></View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.canvas, padding: 32 }, icon: { width: 72, height: 72, borderRadius: 24, backgroundColor: theme.colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }, title: { color: theme.colors.ink, fontSize: 22, fontWeight: '800' }, description: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 280 } });
