import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let active = true;
    const loadDeals = async () => {
      const [loadedCategories, loadedFeaturedDeals] = await Promise.all([
        dealRepository.getCategories(),
        dealRepository.getFeaturedDeals(),
      ]);
      const categoryEntries = await Promise.all(
        loadedCategories.map(async (category) => {
          const categoryDeals = await dealRepository.getDealsByCategory(category).catch(() => []);
          const fallbackDeals = loadedFeaturedDeals.filter((deal) => deal.category === category);
          return [category, categoryDeals.length > 0 ? categoryDeals : fallbackDeals] as const;
        }),
      );
      if (active) {
        setLoadError(null);
        setCategories(loadedCategories);
        setFeaturedDeals(loadedFeaturedDeals);
        setDealsByCategory(Object.fromEntries(categoryEntries));
      }
    };
    void loadDeals().catch((error) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Live deal data is unavailable.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      return () => { active = false; };
    }

    const timeout = setTimeout(() => {
      setIsSearching(true);
      void dealRepository.searchDeals(trimmedQuery).then((results) => {
        if (active) setSearchResults(results);
      }).catch(() => {
        if (active) setSearchResults([]);
      }).finally(() => {
        if (active) setIsSearching(false);
      });
    }, 350);

    return () => { active = false; clearTimeout(timeout); };
  }, [query]);

  const hasSearchQuery = query.trim().length > 0;

  return <SafeAreaView style={styles.safe}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={styles.topbar}><View><Text style={styles.logo}>Deal<Text style={styles.logoAccent}>Hunter</Text></Text><Text style={styles.kicker}>SMART SHOPPING, BETTER PRICES</Text></View></View>
    <View style={styles.searchBar}><Ionicons name="search-outline" size={19} color={theme.colors.muted} /><TextInput ref={searchInputRef} value={query} onChangeText={setQuery} placeholder="Search deals, stores, categories..." placeholderTextColor={theme.colors.muted} autoCapitalize="none" returnKeyType="search" style={styles.searchInput} /><>{query.length > 0 && <Pressable onPress={() => setQuery('')} style={styles.clearButton} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={19} color={theme.colors.muted} /></Pressable>}</></View>
    {hasSearchQuery ? <View style={styles.searchResults}><View style={styles.resultsHeader}><Text style={styles.departmentTitle}>Search results</Text>{!isSearching && <Text style={styles.resultCount}>{searchResults.length} {searchResults.length === 1 ? 'deal' : 'deals'}</Text>}</View>{isSearching ? <View style={styles.loadingState}><ActivityIndicator color={theme.colors.green} /><Text style={styles.loadingText}>Finding live deals...</Text></View> : searchResults.length > 0 ? <View style={styles.resultsRow}>{searchResults.map((product) => <DealCard key={product.id} product={product} />)}</View> : <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name="search-outline" size={27} color={theme.colors.green} /></View><Text style={styles.emptyTitle}>No deals found</Text><Text style={styles.emptyText}>Try searching for something else.</Text></View>}</View> : <><View style={styles.hero}><View style={styles.heroCopy}><Text style={styles.heroEyebrow}>🔥 TODAY&apos;S BEST DEALS</Text><Text style={styles.heroTitle}>More savings.<Text style={styles.heroTitleAccent}> Less hunting.</Text></Text><Text style={styles.heroSub}>The best discounts we&apos;ve found today, all in one place.</Text></View><View style={styles.heroBadge}><Text style={styles.badgeNumber}>50%</Text><Text style={styles.badgeLabel}>UP TO OFF</Text></View></View>
    {loadError && <View style={styles.apiError}><Ionicons name="cloud-offline-outline" size={18} color={theme.colors.orange} /><Text style={styles.apiErrorText}>Live deals are temporarily unavailable. Check the proxy and Scavio connection.</Text></View>}
    <DealSection title="Extreme Deals" subtitle="The strongest scores on the shelf" products={featuredDeals} />
    <View style={styles.departmentHeading}><Text style={styles.departmentTitle}>Shop by department</Text><Pressable onPress={() => router.push('/categories')}><Text style={styles.browse}>Browse all</Text></Pressable></View>
    {categories.map((category) => <DealSection key={category} title={category} products={dealsByCategory[category] ?? []} onSeeAll={() => router.push('/categories')} />)}</>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: theme.colors.canvas }, content: { paddingTop: 14, paddingBottom: 30 }, topbar: { paddingHorizontal: 20 }, logo: { color: theme.colors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.8 }, logoAccent: { color: theme.colors.green }, kicker: { color: theme.colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 }, searchBar: { height: 48, marginHorizontal: 20, marginTop: 18, paddingHorizontal: 13, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.line, flexDirection: 'row', alignItems: 'center' }, searchInput: { flex: 1, color: theme.colors.ink, fontSize: 13, marginLeft: 9, paddingVertical: 0 }, clearButton: { padding: 4 }, hero: { backgroundColor: theme.colors.ink, marginHorizontal: 20, marginTop: 22, borderRadius: 22, padding: 20, minHeight: 164, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }, heroCopy: { flex: 1 }, heroEyebrow: { color: '#f9c857', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginBottom: 10 }, heroTitle: { color: '#fff', fontSize: 25, lineHeight: 30, fontWeight: '900', letterSpacing: -0.5 }, heroTitleAccent: { color: '#9ee0b3' }, heroSub: { color: '#b9c5bd', fontSize: 12, lineHeight: 17, marginTop: 9, maxWidth: 210 }, heroBadge: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: '#8fd4a5', backgroundColor: '#286442', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '8deg' }] }, badgeNumber: { color: '#fff', fontSize: 20, fontWeight: '900' }, badgeLabel: { color: '#c9f0d5', fontSize: 8, fontWeight: '800', marginTop: 1 }, apiError: { flexDirection: 'row', gap: 8, alignItems: 'center', marginHorizontal: 20, marginTop: 18, padding: 12, backgroundColor: theme.colors.orangeSoft, borderRadius: 12 }, apiErrorText: { flex: 1, color: theme.colors.orange, fontSize: 12, lineHeight: 17 }, searchResults: { marginTop: 28 }, resultsHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 13 }, resultCount: { color: theme.colors.muted, fontSize: 12 }, loadingState: { alignItems: 'center', paddingVertical: 54, gap: 10 }, loadingText: { color: theme.colors.muted, fontSize: 13 }, resultsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 }, emptyState: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 54 }, emptyIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: theme.colors.greenSoft, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: theme.colors.ink, fontSize: 19, fontWeight: '800', marginTop: 15 }, emptyText: { color: theme.colors.muted, fontSize: 13, marginTop: 6 }, departmentHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 34, marginBottom: -10 }, departmentTitle: { color: theme.colors.ink, fontSize: 21, fontWeight: '900' }, browse: { color: theme.colors.green, fontSize: 12, fontWeight: '800' } });
