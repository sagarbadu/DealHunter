import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CategoryHeader } from '@/components/CategoryHeader';
import { DealCard } from '@/components/DealCard';
import { theme } from '@/constants/theme';
import { categories as mockCategories, dealsForCategory as mockDealsForCategory } from '@/data/mockDeals';
import { dealRepository } from '@/services/repository';
import type { DealCategory, Product } from '@/types/product';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = { Electronics: 'phone-portrait-outline', 'Home & Kitchen': 'home-outline', Fashion: 'shirt-outline', Gaming: 'game-controller-outline', Beauty: 'sparkles-outline', 'Sports & Outdoors': 'basketball-outline', 'Toys & Kids': 'happy-outline', Automotive: 'car-outline', Pets: 'paw-outline' };
export default function CategoriesScreen() {
	const liveMode = Boolean(process.env.EXPO_PUBLIC_DEAL_API_URL);
	const [categories, setCategories] = useState<DealCategory[]>(liveMode ? [] : mockCategories);
	const [dealsByCategory, setDealsByCategory] = useState<Partial<Record<DealCategory, Product[]>>>(() => liveMode ? {} : Object.fromEntries(mockCategories.map((category) => [category, mockDealsForCategory(category)])));

	useEffect(() => {
		let active = true;
		const loadCategories = async () => {
			const loadedCategories = await dealRepository.getCategories();
			const categoryEntries = await Promise.all(
				loadedCategories.map(async (category) => [category, await dealRepository.getDealsByCategory(category)] as const),
			);
			if (active) {
				setCategories(loadedCategories);
				setDealsByCategory(Object.fromEntries(categoryEntries));
			}
		};
		void loadCategories();
		return () => { active = false; };
	}, []);

	return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><Text style={styles.kicker}>EXPLORE</Text><Text style={styles.title}>Shop by category</Text><Text style={styles.subtitle}>Find the right deal for every part of your life.</Text>{categories.map((category) => <View key={category} style={styles.section}><CategoryHeader icon={icons[category]} title={category} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{(dealsByCategory[category] ?? []).map((product) => <DealCard key={product.id} product={product} compact />)}</ScrollView></View>)}</ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: theme.colors.canvas }, content: { padding: 22, paddingTop: 26, paddingBottom: 40 }, kicker: { color: theme.colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 }, title: { color: theme.colors.ink, fontSize: 29, fontWeight: '900', marginTop: 5 }, subtitle: { color: theme.colors.muted, fontSize: 14, marginTop: 7 }, section: { marginTop: 26 }, row: { gap: 12, paddingTop: 13, paddingBottom: 2 } });
