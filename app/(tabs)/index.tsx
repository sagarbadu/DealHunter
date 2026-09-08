import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DealCard } from '@/components/DealCard';
import { DealSection } from '@/components/DealSection';
import { theme } from '@/constants/theme';
import { categories as mockCategories, dealsForCategory as mockDealsForCategory, extremeDeals as mockFeaturedDeals } from '@/data/mockDeals';
import { dealRepository } from '@/services/repository';
import type { DealCategory, Product } from '@/types/product';

export default function HomeScreen() {
  const router = useRouter();
  const liveMode = Boolean(process.env.EXPO_PUBLIC_DEAL_API_URL);
  const [categories, setCategories] = useState<DealCategory[]>(liveMode ? [] : mockCategories);
  const [featuredDeals, setFeaturedDeals] = useState<Product[]>(liveMode ? [] : mockFeaturedDeals);
  const [dealsByCategory, setDealsByCategory] = useState<Partial<Record<DealCategory, Product[]>>>(() => liveMode ? {} : Object.fromEntries(mockCategories.map((category) => [category, mockDealsForCategory(category)])));
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let active = true;
    const loadDeals = async () => {
      const [loadedCategories, loadedFeaturedDeals] = await Promise.all([
        dealRepository.getCategories(),
        dealRepository.getFeaturedDeals(),
      ]);
      const categoryEntries = await Promise.all(
        loadedCategories.map(async (category) => [category, await dealRepository.getDealsByCategory(category)] as const),
      );
      if (active) {
        setCategories(loadedCategories);
        setFeaturedDeals(loadedFeaturedDeals);
        setDealsByCategory(Object.fromEntries(categoryEntries));
      }
    };
    void loadDeals();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return () => { active = false; };
    }

    const search = async () => {
      const results = await dealRepository.searchDeals(trimmedQuery);
      if (active) setSearchResults(results);
    };
    void search();
    return () => { active = false; };
  }, [query]);

  const isSearching = query.trim().length > 0;

  return <SafeAreaView style={styles.safe}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={styles.topbar}><View><Text style={styles.logo}>Deal<Text style={styles.logoAccent}>Hunter</Text></Text><Text style={styles.kicker}>SMART SHOPPING, BETTER PRICES</Text></View><View style={styles.actions}><Pressable onPress={() => searchInputRef.current?.focus()} style={styles.action} accessibilityLabel="Search deals"><Ionicons name="search-outline" size={20} color={theme.colors.ink} /></Pressable><Pressable style={styles.action} accessibilityLabel="Notifications"><Ionicons name="notifications-outline" size={20} color={theme.colors.ink} /></Pressable></View></View>
    <View style={styles.searchBar}><Ionicons name="search-outline" size={19} color={theme.colors.muted} /><TextInput ref={searchInputRef} value={query} onChangeText={setQuery} placeholder="Search deals, stores, categories..." placeholderTextColor={theme.colors.muted} autoCapitalize="none" returnKeyType="search" style={styles.searchInput} /><>{query.length > 0 && <Pressable onPress={() => setQuery('')} style={styles.clearButton} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={19} color={theme.colors.muted} /></Pressable>}</></View>
    {isSearching ? <View style={styles.searchResults}><View style={styles.resultsHeader}><Text style={styles.departmentTitle}>Search results</Text><Text style={styles.resultCount}>{searchResults.length} {searchResults.length === 1 ? 'deal' : 'deals'}</Text></View>{searchResults.length > 0 ? <View style={styles.resultsRow}>{searchResults.map((product) => <DealCard key={product.id} product={product} />)}</View> : <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="search-outline" size={27} color={theme.colors.green} /></View><Text style={styles.emptyTitle}>No deals found</Text><Text style={styles.emptyText}>Try searching for something else.</Text></View>}</View> : <><View style={styles.hero}><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>🔥 TODAY&apos;S BEST DEALS</Text><Text style={styles.heroTitle}>More savings.<Text style={styles.heroTitleAccent}> Less hunting.</Text></Text><Text style={styles.heroSub}>The best discounts we&apos;ve found today, all in one place.</Text></View><View style={styles.heroBadge}><Text style={styles.badgeNumber}>50%</Text><Text style={styles.badgeLabel}>UP TO OFF</Text></View></View>
    <DealSection title="Extreme Deals" subtitle="The strongest scores on the shelf" products={featuredDeals} />
    <View style={styles.departmentHeading}><Text style={styles.departmentTitle}>Shop by department</Text><Pressable onPress={() => router.push('/categories')}><Text style={styles.browse}>Browse all</Text></Pressable></View>
    {categories.map((category) => <DealSection key={category} title={category} products={dealsByCategory[category] ?? []} onSeeAll={() => router.push('/categories')} />)}</>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.canvas }, content: { paddingTop: 14, paddingBottom: 30 }, topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }, logo: { color: theme.colors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.8 }, logoAccent: { color: theme.colors.green }, kicker: { color: theme.colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 }, actions: { flexDirection: 'row', gap: 8 }, action: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.line, width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, searchBar: { height: 48, marginHorizontal: 20, marginTop: 18, paddingHorizontal: 13, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.line, flexDirection: 'row', alignItems: 'center' }, searchInput: { flex: 1, color: theme.colors.ink, fontSize: 13, marginLeft: 9, paddingVertical: 0 }, clearButton: { padding: 4 }, hero: { backgroundColor: theme.colors.ink, marginHorizontal: 20, marginTop: 22, borderRadius: 22, padding: 20, minHeight: 164, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }, heroCopy: { flex: 1 }, heroEyebrow: { color: '#f9c857', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginBottom: 10 }, heroTitle: { color: '#fff', fontSize: 25, lineHeight: 30, fontWeight: '900', letterSpacing: -0.5 }, heroTitleAccent: { color: '#9ee0b3' }, heroSub: { color: '#b9c5bd', fontSize: 12, lineHeight: 17, marginTop: 9, maxWidth: 210 }, heroBadge: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: '#8fd4a5', backgroundColor: '#286442', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] }, badgeNumber: { color: '#fff', fontSize: 20, fontWeight: '900' }, badgeLabel: { color: '#c9f0d5', fontSize: 8, fontWeight: '800', marginTop: 1 }, searchResults: { marginTop: 28 }, resultsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 13 }, resultCount: { color: theme.colors.muted, fontSize: 12 }, resultsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 }, emptyState: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 54 }, emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: theme.colors.greenSoft, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: theme.colors.ink, fontSize: 19, fontWeight: '800', marginTop: 15 }, emptyText: { color: theme.colors.muted, fontSize: 13, marginTop: 6 }, departmentHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 34, marginBottom: -10 }, departmentTitle: { color: theme.colors.ink, fontSize: 21, fontWeight: '900' }, browse: { color: theme.colors.green, fontSize: 12, fontWeight: '800' } });
