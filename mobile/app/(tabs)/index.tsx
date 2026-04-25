import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Image, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '../../src/lib/api';

interface Vendor {
  id: string;
  store_name: string;
  category: string;
  city: string;
  rating: number;
  total_sales: number;
  logo_url?: string;
  status: string;
}

export default function HomeScreen() {
  const router    = useRouter();
  const [vendors, setVendors]      = useState<Vendor[]>([]);
  const [loading, setLoading]      = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');

  const load = async () => {
    try {
      const data = await API.get('/vendors?limit=20&status=approved');
      setVendors(data.data || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load vendors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = vendors.filter(v =>
    v.store_name.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase()) ||
    v.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Hero Banner */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>🛒 Shop Local, Fast Delivery</Text>
        <Text style={styles.heroSub}>Find vendors near you · 48-hour delivery</Text>
        <TouchableOpacity style={styles.heroBtn} onPress={() => router.push('/marketplace')}>
          <Text style={styles.heroBtnText}>Browse Marketplace →</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍  Search vendors, products, cities..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#16a34a" />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Featured Vendors</Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading vendors...</Text>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏪</Text>
            <Text style={styles.emptyText}>No vendors found</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map(vendor => (
              <TouchableOpacity
                key={vendor.id}
                style={styles.vendorCard}
                onPress={() => router.push(`/vendor/${vendor.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.vendorLogo}>
                  {vendor.logo_url ? (
                    <Image source={{ uri: vendor.logo_url }} style={styles.logoImg} />
                  ) : (
                    <Text style={styles.logoEmoji}>🏪</Text>
                  )}
                </View>
                <Text style={styles.vendorName} numberOfLines={1}>{vendor.store_name}</Text>
                <Text style={styles.vendorCategory}>{vendor.category}</Text>
                <Text style={styles.vendorCity}>📍 {vendor.city}</Text>
                <View style={styles.vendorMeta}>
                  <Text style={styles.rating}>⭐ {vendor.rating || '4.5'}</Text>
                  <Text style={styles.sales}>{vendor.total_sales || 0} sales</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CTA */}
        <View style={styles.vendorCta}>
          <Text style={styles.ctaTitle}>Sell on LastMart</Text>
          <Text style={styles.ctaSub}>Join thousands of vendors reaching customers in their city</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/auth/register')}>
            <Text style={styles.ctaBtnText}>Become a Vendor →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  hero:         { backgroundColor: '#16a34a', padding: 20, paddingTop: 12 },
  heroTitle:    { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroSub:      { fontSize: 13, color: '#dcfce7', marginBottom: 14 },
  heroBtn:      { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  heroBtnText:  { color: '#16a34a', fontWeight: '700', fontSize: 14 },
  searchRow:    { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchInput:  { backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', padding: 16, paddingBottom: 8 },
  loadingText:  { textAlign: 'center', color: '#9ca3af', padding: 40 },
  emptyState:   { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji:   { fontSize: 48, marginBottom: 10 },
  emptyText:    { color: '#9ca3af', fontSize: 16 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  vendorCard:   { width: '48%', margin: '1%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  vendorLogo:   { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoImg:      { width: 48, height: 48, borderRadius: 12 },
  logoEmoji:    { fontSize: 24 },
  vendorName:   { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  vendorCategory: { fontSize: 11, color: '#16a34a', fontWeight: '600', marginBottom: 2 },
  vendorCity:   { fontSize: 11, color: '#9ca3af', marginBottom: 6 },
  vendorMeta:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rating:       { fontSize: 11, color: '#374151' },
  sales:        { fontSize: 10, color: '#9ca3af' },
  vendorCta:    { margin: 16, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f3f4f6', alignItems: 'center', marginBottom: 32 },
  ctaTitle:     { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  ctaSub:       { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 14 },
  ctaBtn:       { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  ctaBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});
