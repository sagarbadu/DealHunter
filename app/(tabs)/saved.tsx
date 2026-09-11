import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DealCard } from '@/components/DealCard';
import { theme } from '@/constants/theme';
import { getSavedDeals, subscribeToSavedDeals } from '@/services/savedDeals';
import type { Product } from '@/types/product';

export default function SavedScreen() {
	const [savedDeals, setSavedDeals] = useState<Product[]>([]);

	useEffect(() => {
		const refresh = () => { void getSavedDeals().then(setSavedDeals); };
		refresh();
		return subscribeToSavedDeals(refresh);
	}, []);

	return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
		<Text style={styles.kicker}>YOUR LIST</Text>
		<Text style={styles.title}>Saved deals</Text>
		<Text style={styles.subtitle}>{savedDeals.length ? 'Deals you want to come back to.' : 'Bookmark a deal to keep it here while you shop around.'}</Text>
		{savedDeals.length ? <View style={styles.grid}>{savedDeals.map((product) => <DealCard key={product.id} product={product} />)}</View> : <View style={styles.empty}><Text style={styles.emptyTitle}>No saved deals yet</Text></View>}
	</ScrollView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: theme.colors.canvas }, content: { padding: 22, paddingTop: 26, paddingBottom: 40 }, kicker: { color: theme.colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 }, title: { color: theme.colors.ink, fontSize: 29, fontWeight: '900', marginTop: 5 }, subtitle: { color: theme.colors.muted, fontSize: 14, lineHeight: 20, marginTop: 7 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 }, empty: { alignItems: 'center', paddingTop: 64 }, emptyTitle: { color: theme.colors.muted, fontSize: 15, fontWeight: '700' } });
