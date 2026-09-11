import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';
import { getSavedDeals, isDealSaved, toggleDealSaved } from '@/services/savedDeals';
import { dealRepository } from '@/services/repository';
import type { Product } from '@/types/product';

const money = (value: number | null) => value === null ? 'Price unavailable' : `$${value.toFixed(2)}`;

function readProduct(value: string | string[] | undefined): Product | null {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as Product;
  } catch {
    return null;
  }
}

function isValidProductUrl(productUrl: string | undefined): boolean {
  if (!productUrl) return false;
  try {
    const url = new URL(productUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { product: productParam } = useLocalSearchParams<{ product?: string }>();
  const product = readProduct(productParam);
  const [imageFailed, setImageFailed] = useState(false);
  const [saved, setSaved] = useState(() => product ? isDealSaved(product.id) : false);
  const [resolvedProduct, setResolvedProduct] = useState<Product | null>(product);

  useEffect(() => {
    if (!product) return;
    void getSavedDeals().then((savedDeals) => setSaved(savedDeals.some((savedDeal) => savedDeal.id === product.id)));
  }, [product]);

  useEffect(() => {
    // Only hit the API when the product we were passed has no usable retailer
    // link of its own. Products that already carry a direct URL skip the
    // second lookup entirely, so tapping a deal doesn't spend a credit.
    if (!product?.id.startsWith('scavio-google-shopping:')) return;
    if (isValidProductUrl(product.productUrl)) return;
    let active = true;
    void dealRepository.getDealById(product.id, product.name).then((liveProduct) => {
      if (active && liveProduct) setResolvedProduct(liveProduct);
    });
    return () => { active = false; };
  }, [product]);

  if (!product) {
    return <SafeAreaView style={styles.safe}><View style={styles.errorState}><Text style={styles.errorTitle}>Deal unavailable</Text><Text style={styles.errorText}>We could not load this product.</Text><Pressable onPress={() => router.back()} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Go Back</Text></Pressable></View></SafeAreaView>;
  }

  const displayProduct = resolvedProduct ?? product;

  const canViewDeal = isValidProductUrl(displayProduct.productUrl);
  const handleSave = async () => setSaved(await toggleDealSaved(displayProduct));
  const handleViewDeal = async () => {
    if (!canViewDeal) return;
    try {
      await Linking.openURL(displayProduct.productUrl);
    } catch {
      Alert.alert('Unable to open deal', 'This deal link is not available right now.');
    }
  };

  return <SafeAreaView style={styles.safe}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={styles.topbar}><Pressable onPress={() => router.back()} style={styles.iconButton} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={21} color={theme.colors.ink} /></Pressable><Text style={styles.topbarTitle}>Deal Details</Text><Pressable onPress={handleSave} style={styles.iconButton} accessibilityLabel={saved ? 'Remove saved deal' : 'Save deal'}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={21} color={saved ? theme.colors.green : theme.colors.ink} /></Pressable></View>
    <View style={styles.imageWrap}>{imageFailed ? <View style={styles.imagePlaceholder}><Ionicons name="image-outline" size={42} color={theme.colors.muted} /><Text style={styles.placeholderText}>Image unavailable</Text></View> : <Image source={{ uri: displayProduct.imageUrl }} style={styles.image} resizeMode="cover" onError={() => setImageFailed(true)} />}</View>
    <View style={styles.details}><View style={styles.badges}><Text style={styles.discount}>{displayProduct.discountPercent > 0 ? `${displayProduct.discountPercent}% OFF` : 'CURRENT PRICE'}</Text><Text style={styles.score}>{displayProduct.dealScore >= 90 ? '🔥 ' : ''}Deal Score {displayProduct.dealScore}</Text></View><Text style={styles.store}>{displayProduct.storeName}</Text><Text style={styles.name}>{displayProduct.name}</Text><View style={styles.priceRow}><Text style={styles.price}>{money(displayProduct.currentPrice)}</Text>{displayProduct.originalPrice !== null && <Text style={styles.original}>{money(displayProduct.originalPrice)}</Text>}</View>{displayProduct.originalPrice !== null && <Text style={styles.savings}>You save {money(displayProduct.originalPrice - displayProduct.currentPrice)}</Text>}<View style={styles.infoGrid}><View style={styles.infoItem}><Text style={styles.infoLabel}>Availability</Text><Text style={styles.infoValue}>{displayProduct.availability}</Text></View><View style={styles.infoItem}><Text style={styles.infoLabel}>Updated</Text><Text style={styles.infoValue}>{displayProduct.lastUpdated}</Text></View></View><Text style={styles.sectionTitle}>About this deal</Text><Text style={styles.description}>{displayProduct.description}</Text><Pressable onPress={handleSave} style={styles.saveButton}><Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={17} color={theme.colors.green} /><Text style={styles.saveButtonText}>{saved ? 'Saved Deal' : 'Save Deal'}</Text></Pressable><Pressable onPress={handleViewDeal} disabled={!canViewDeal} style={[styles.viewButton, !canViewDeal && styles.disabledButton]}><Text style={styles.viewButtonText}>{canViewDeal ? 'View Deal' : 'Deal Link Unavailable'}</Text>{canViewDeal && <Ionicons name="open-outline" size={17} color="#fff" />}</Pressable></View>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.canvas }, content: { paddingBottom: 32 }, topbar: { height: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }, topbarTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: '800' }, iconButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.line, alignItems: 'center', justifyContent: 'center' }, imageWrap: { height: 300, marginHorizontal: 20, borderRadius: theme.radius.card, overflow: 'hidden', backgroundColor: '#f1f3ee' }, image: { width: '100%', height: '100%' }, imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' }, placeholderText: { color: theme.colors.muted, fontSize: 12, marginTop: 8 }, details: { paddingHorizontal: 20, paddingTop: 20 }, badges: { flexDirection: 'row', alignItems: 'center', gap: 8 }, discount: { color: '#fff', backgroundColor: theme.colors.orange, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '800' }, score: { color: theme.colors.orange, backgroundColor: theme.colors.orangeSoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '800' }, store: { color: theme.colors.muted, fontSize: 13, fontWeight: '700', marginTop: 16 }, name: { color: theme.colors.ink, fontSize: 25, lineHeight: 31, fontWeight: '900', marginTop: 5 }, priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 14 }, price: { color: theme.colors.green, fontSize: 30, fontWeight: '900' }, original: { color: theme.colors.muted, fontSize: 14, textDecorationLine: 'line-through' }, savings: { color: theme.colors.green, fontSize: 12, fontWeight: '800', marginTop: 4 }, infoGrid: { flexDirection: 'row', gap: 10, marginTop: 22 }, infoItem: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.line, padding: 12 }, infoLabel: { color: theme.colors.muted, fontSize: 10, fontWeight: '700' }, infoValue: { color: theme.colors.ink, fontSize: 13, fontWeight: '800', marginTop: 5 }, sectionTitle: { color: theme.colors.ink, fontSize: 17, fontWeight: '800', marginTop: 24 }, description: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7 }, saveButton: { minHeight: 48, borderRadius: theme.radius.button, borderWidth: 1, borderColor: theme.colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 24 }, saveButtonText: { color: theme.colors.green, fontSize: 14, fontWeight: '800' }, viewButton: { minHeight: 48, borderRadius: theme.radius.button, backgroundColor: theme.colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10 }, viewButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' }, disabledButton: { backgroundColor: theme.colors.muted }, errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }, errorTitle: { color: theme.colors.ink, fontSize: 22, fontWeight: '800' }, errorText: { color: theme.colors.muted, fontSize: 14, marginTop: 8 }, primaryButton: { backgroundColor: theme.colors.ink, borderRadius: theme.radius.button, paddingHorizontal: 24, paddingVertical: 13, marginTop: 22 }, primaryButtonText: { color: '#fff', fontWeight: '800' } });
