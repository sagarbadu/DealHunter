import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DealCard } from '@/components/DealCard';
import { theme } from '@/constants/theme';
import type { Product } from '@/types/product';

export function DealSection({ title, subtitle, products, onSeeAll }: { title: string; subtitle?: string; products: Product[]; onSeeAll?: () => void }) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View><Text style={styles.title}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>
        {onSeeAll && <Pressable onPress={onSeeAll} style={styles.seeAll}><Text style={styles.seeAllText}>See All</Text><Ionicons name="chevron-forward" size={15} color={theme.colors.green} /></Pressable>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {products.map((product) => <DealCard key={product.id} product={product} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ section: { marginTop: 26 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 13 }, title: { color: theme.colors.ink, fontSize: 20, fontWeight: '800' }, subtitle: { color: theme.colors.muted, fontSize: 12, marginTop: 4 }, seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 }, seeAllText: { color: theme.colors.green, fontSize: 12, fontWeight: '800' }, row: { gap: 12, paddingHorizontal: 20, paddingBottom: 3 },
});
