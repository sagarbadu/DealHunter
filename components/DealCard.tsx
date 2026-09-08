import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import type { Product } from '@/types/product';

const money = (value: number | null) => value === null ? 'Price unavailable' : `$${value.toFixed(2)}`;

export function DealCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const router = useRouter();

  const handleOpenDetails = () => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id, product: JSON.stringify(product) },
    });
  };

  const handleViewDeal = async () => {
    if (!/^https?:\/\//i.test(product.productUrl)) return;
    try {
      await Linking.openURL(product.productUrl);
    } catch {
      Alert.alert('Unable to open deal', 'This deal link is not available right now.');
    }
  };

  return (
    <Pressable onPress={handleOpenDetails} style={[styles.card, compact && styles.compactCard]} accessibilityRole="button" accessibilityLabel={`View details for ${product.name}`}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.discount}><Text style={styles.discountText}>{product.discountPercent}% OFF</Text></View>
      </View>
      <View style={styles.body}>
        <Text style={styles.retailer}>{product.storeName}</Text>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{money(product.currentPrice)}</Text>
          {product.originalPrice !== null && <Text style={styles.original}>{money(product.originalPrice)}</Text>}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.score}>{product.dealScore >= 90 ? '🔥 ' : ''}Deal Score {product.dealScore}</Text>
          {!compact && <Text style={styles.stock}>{product.availability}</Text>}
        </View>
        {!compact && <Pressable onPress={handleViewDeal} disabled={!/^https?:\/\//i.test(product.productUrl)} style={[styles.button, !/^https?:\/\//i.test(product.productUrl) && styles.disabledButton]}><Text style={styles.buttonText}>{/^https?:\/\//i.test(product.productUrl) ? 'View Deal' : 'Deal Link Unavailable'}</Text>{/^https?:\/\//i.test(product.productUrl) && <Ionicons name="arrow-forward" size={15} color="#fff" />}</Pressable>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.line, width: 196 },
  compactCard: { width: 180 },
  imageWrap: { height: 142, backgroundColor: '#f1f3ee', position: 'relative' },
  image: { width: '100%', height: '100%' },
  discount: { position: 'absolute', top: 10, left: 10, backgroundColor: theme.colors.orange, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  body: { padding: 12 },
  retailer: { color: theme.colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 5 },
  name: { color: theme.colors.ink, fontSize: 14, lineHeight: 19, fontWeight: '700', minHeight: 38 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 9 },
  price: { color: theme.colors.green, fontSize: 20, fontWeight: '800' },
  original: { color: theme.colors.muted, fontSize: 11, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  score: { color: theme.colors.orange, fontSize: 10, fontWeight: '800' },
  stock: { color: theme.colors.muted, fontSize: 9 },
  button: { backgroundColor: theme.colors.ink, borderRadius: theme.radius.button, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  disabledButton: { backgroundColor: theme.colors.muted },
});
