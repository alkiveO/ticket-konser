import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

const GENRES = ['Semua Genre', 'Indie', 'EDM', 'Pop', 'Rock', 'Jazz'];
const TIME_FILTERS = ['Minggu Ini', 'Bulan Ini'];
const PRICE_FILTERS = [
  { label: 'IDR 0 - 500k', min: 0, max: 500000 },
  { label: 'IDR 500k - 1jt', min: 500000, max: 1000000 },
  { label: '> IDR 1jt', min: 1000000, max: Infinity },
];
const SORT_OPTIONS = [
  'Paling Relevan',
  'Harga Terendah',
  'Harga Tertinggi',
  'Tanggal Terdekat',
];

export default function ExploreScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [concerts, setConcerts] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const [genre, setGenre] = useState(GENRES[0]);
  const [timeFilter, setTimeFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<{ label: string; min: number; max: number } | null>(null);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [sortModalVisible, setSortModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchConcerts();
    }, [])
  );

  const fetchConcerts = async () => {
    try {
      const res = await axios.get(`${API_URL}/concerts`);
      const data = res.data.data || [];
      const publicConcerts = data.filter((item: any) => item.status !== 'draft');
      setConcerts(publicConcerts);
    } catch (err) {
      console.log('Gagal fetch concerts', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const getImageUrl = (banner: string) =>
    banner ? `${BASE_URL}${banner}` : undefined;

  const formatDate = (dateStr: string, endStr?: string) => {
    if (!dateStr) return '-';
    const start = new Date(dateStr);
    const startFmt = start.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    if (!endStr) return startFmt;
    const end = new Date(endStr);
    const endFmt = end.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return `${start.getDate()}–${endFmt}`;
  };

  const isThisWeek = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const weekLater = new Date();
    weekLater.setDate(now.getDate() + 7);
    return date >= now && date <= weekLater;
  };

  const isThisMonth = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const filtered = concerts
    .filter((item) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          item.title?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (genre !== 'Semua Genre' && item.genre !== genre) return false;
      if (timeFilter === 'Minggu Ini' && !isThisWeek(item.concert_date)) return false;
      if (timeFilter === 'Bulan Ini' && !isThisMonth(item.concert_date)) return false;
      if (priceFilter) {
        const price = Number(item.lowest_price || 0);
        if (price < priceFilter.min || price > priceFilter.max) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'Harga Terendah')
        return (a.lowest_price || 0) - (b.lowest_price || 0);
      if (sortBy === 'Harga Tertinggi')
        return (b.lowest_price || 0) - (a.lowest_price || 0);
      if (sortBy === 'Tanggal Terdekat')
        return new Date(a.concert_date).getTime() - new Date(b.concert_date).getTime();
      return (b.tickets_sold || 0) - (a.tickets_sold || 0); // Paling Relevan
    });

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color="#a855f7" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Eksplor Konser</Text>
        </View>

        {/* SEARCH */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#6b7280" />
            <TextInput
              placeholder="Cari konser, artis, atau kota..."
              placeholderTextColor="#6b7280"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setSortModalVisible(true)}
          >
            <Feather name="sliders" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {GENRES.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, genre === g && styles.chipActive]}
              onPress={() => setGenre(g)}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.chipText, genre === g && styles.chipTextActive]}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
          {TIME_FILTERS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, timeFilter === t && styles.chipActive]}
              onPress={() => setTimeFilter(timeFilter === t ? null : t)}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.chipText, timeFilter === t && styles.chipTextActive]}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
          {PRICE_FILTERS.map((p) => (
            <TouchableOpacity
              key={p.label}
              style={[styles.chip, priceFilter?.label === p.label && styles.chipActive]}
              onPress={() =>
                setPriceFilter(priceFilter?.label === p.label ? null : p)
              }
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.chipText,
                  priceFilter?.label === p.label && styles.chipTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* RESULT COUNT + SORT */}
        <View style={styles.resultRow}>
          <Text style={styles.resultText}>Menampilkan {filtered.length} hasil</Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortModalVisible(true)}
          >
            <Text style={styles.sortText}>{sortBy}</Text>
            <Ionicons name="chevron-down" size={14} color="#a78bfa" />
          </TouchableOpacity>
        </View>

        {/* LIST */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>Tidak ada konser yang cocok.</Text>
          ) : (
            filtered.map((item) => {
              const remaining = (item.total_quota || 0) - (item.tickets_sold || 0);
              const isFav = favorites.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  style={styles.card}
                  onPress={() => navigation.navigate('ConcertDetail', { id: item.id })}
                >
                  <View>
                    <Image
                      source={{ uri: getImageUrl(item.banner) }}
                      style={styles.cardImage}
                    />
                    <TouchableOpacity
                      style={styles.heartButton}
                      onPress={() => toggleFavorite(item.id)}
                    >
                      <Ionicons
                        name={isFav ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isFav ? '#ef4444' : '#fff'}
                      />
                    </TouchableOpacity>
                    {remaining > 0 && (
                      <View style={styles.quotaBadge}>
                        <Text style={styles.quotaText}>SISA {remaining} TIKET</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      {item.genre && (
                        <View style={styles.genreBadge}>
                          <Text style={styles.genreBadgeText}>
                            {item.genre.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={13} color="#9ca3af" />
                      <Text style={styles.metaText}>
                        {formatDate(item.concert_date, item.concert_end_date)}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="location-sharp" size={13} color="#9ca3af" />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.bottomRow}>
                      <View>
                        <Text style={styles.priceLabel}>Mulai dari</Text>
                        <Text style={styles.priceValue}>
                          IDR {Number(item.lowest_price || 0).toLocaleString('id-ID')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.buyButton}
                        onPress={() =>
                          navigation.navigate('ConcertDetail', { id: item.id })
                        }
                      >
                        <Text style={styles.buyButtonText}>Beli Tiket</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={22} color="#6b7280" />
          <Text style={styles.navLabel}>Beranda</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="compass" size={22} color="#a855f7" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Eksplor</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('MyTickets')}
        >
          <Ionicons name="ticket-outline" size={22} color="#6b7280" />
          <Text style={styles.navLabel}>Tiket Saya</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-outline" size={22} color="#6b7280" />
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* SORT SHEET */}
      {sortModalVisible && (
        <View style={styles.sortOverlay}>
          <TouchableOpacity
            style={styles.sortOverlayBg}
            activeOpacity={1}
            onPress={() => setSortModalVisible(false)}
          />
          <View style={styles.sortSheet}>
            <Text style={styles.sortSheetTitle}>Urutkan</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.sortOption}
                onPress={() => {
                  setSortBy(opt);
                  setSortModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === opt && styles.sortOptionTextActive,
                  ]}
                >
                  {opt}
                </Text>
                {sortBy === opt && (
                  <Ionicons name="checkmark" size={16} color="#a855f7" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0b13' },
  safeArea: { flex: 1 },
  loadingRoot: {
    flex: 1,
    backgroundColor: '#0b0b13',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: { paddingHorizontal: 20, paddingTop: 16 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141420',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 12, fontSize: 13 },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipScroll: {
    height: 46,
    marginTop: 14,
    flexGrow: 0,
  },
  chipRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#1c1c28',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginRight: 8,
    flexShrink: 0,
    flexGrow: 0,
    flexBasis: 'auto',
    overflow: 'hidden',
  },
  chipActive: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  chipText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 12,
  },
  resultText: { color: '#9ca3af', fontSize: 13 },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },
  card: {
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#141420',
  },
  cardImage: { width: '100%', height: 190 },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  quotaText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardBody: { padding: 16 },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1 },
  genreBadge: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  genreBadgeText: { color: '#c4b5fd', fontSize: 10, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaText: { color: '#9ca3af', fontSize: 12 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: { color: '#6b7280', fontSize: 11 },
  priceValue: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 },
  buyButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  buyButtonText: { color: '#0b0b13', fontSize: 13, fontWeight: '800' },
  emptyText: { color: '#6b7280', textAlign: 'center', paddingVertical: 40 },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#101018',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 10,
    paddingBottom: 24,
  },
  navItem: { alignItems: 'center', gap: 4 },
  navLabel: { color: '#6b7280', fontSize: 11 },
  navLabelActive: { color: '#a855f7', fontWeight: '700' },
sortOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sortOverlayBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sortSheet: {
    backgroundColor: '#141420',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 34,
  },
  sortSheetTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sortOptionText: { color: '#9ca3af', fontSize: 14 },
  sortOptionTextActive: { color: '#fff', fontWeight: '700' },
});