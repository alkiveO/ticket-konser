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
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, themes } from '../context/ThemeContext';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

const PURPLE = '#a855f7';
const PURPLE_DARK = '#7c3aed';

const TIME_FILTERS = ['Minggu Ini', 'Bulan Ini'];

const PRICE_FILTERS = [
  { label: 'IDR 0 - 500k', min: 0, max: 500000 },
  { label: 'IDR 500k - 1jt', min: 500000, max: 1000000 },
  { label: '> IDR 1jt', min: 1000000, max: Infinity },
];

const SORT_OPTIONS: { label: string; icon: any }[] = [
  { label: 'Paling Relevan', icon: 'flame-outline' },
  { label: 'Harga Terendah', icon: 'trending-down-outline' },
  { label: 'Harga Tertinggi', icon: 'trending-up-outline' },
  { label: 'Tanggal Terdekat', icon: 'calendar-outline' },
];

type ViewMode = 'poster' | 'grid';

export default function ExploreScreen({ navigation }: any) {
  const { colors } = useTheme();
  const isDark = colors.statusBar === 'light';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gridCardWidth = (width - 40 - 12) / 2;
  const styles = createStyles(colors, isDark, gridCardWidth, insets.bottom);

  const [loading, setLoading] = useState(true);
  const [concerts, setConcerts] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('poster');

  const [timeFilter, setTimeFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<{
    label: string;
    min: number;
    max: number;
  } | null>(null);

  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0].label);
  const [sortModalVisible, setSortModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchConcerts();
    }, [])
  );

  // =====================================================
  // FETCH CONCERTS
  // =====================================================

  const fetchConcerts = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_URL}/concerts`);
      const data = res.data.data || [];

      const publicConcerts = data.filter(
        (item: any) => item.status !== 'draft'
      );

      setConcerts(publicConcerts);
    } catch (err) {
      console.log('Gagal fetch concerts', err);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const toggleFavorite = (id: string | number) => {
    const key = String(id);

    setFavorites((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const getImageUrl = (banner: string) => {
    if (!banner) return undefined;
    if (banner.startsWith('http')) return banner;

    return `${BASE_URL}${banner}`;
  };

  const isSoldOut = (item: any) => {
    const sold = Number(item?.tickets_sold || 0);
    const quota = Number(item?.total_quota || 0);

    return quota > 0 && sold >= quota;
  };

  const getRemainingTickets = (item: any) => {
    const quota = Number(item?.total_quota || 0);
    const sold = Number(item?.tickets_sold || 0);

    return Math.max(quota - sold, 0);
  };

  const getSoldProgress = (item: any) => {
    const quota = Number(item?.total_quota || 0);
    const sold = Number(item?.tickets_sold || 0);

    if (quota <= 0) return 0;

    return Math.min(Math.max(sold / quota, 0), 1);
  };

  // Normalisasi teks untuk pencarian.
  const normalizeText = (value: any) => {
    return String(value ?? '').trim().toLowerCase();
  };

  // Mengubah tanggal menjadi Date lokal.
  // Format YYYY-MM-DD tidak diproses sebagai UTC.
  const parseConcertDate = (dateStr: string) => {
    if (!dateStr) return null;

    const value = String(dateStr).trim();

    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    const date = dateOnly
      ? new Date(
          Number(dateOnly[1]),
          Number(dateOnly[2]) - 1,
          Number(dateOnly[3])
        )
      : new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return date;
  };

  // Mengambil nilai harga dari data konser.
  const getConcertPrice = (item: any) => {
    const rawPrice = item?.lowest_price;

    if (rawPrice === null || rawPrice === undefined || rawPrice === '') {
      return 0;
    }

    const price = Number(String(rawPrice).replace(/[^\d.-]/g, ''));

    return Number.isFinite(price) ? price : 0;
  };

  const getDay = (dateStr: string) => {
    const date = parseConcertDate(dateStr);

    if (!date) return '--';

    return date.toLocaleDateString('id-ID', { day: '2-digit' });
  };

  const getMonth = (dateStr: string) => {
    const date = parseConcertDate(dateStr);

    if (!date) return '';

    return date
      .toLocaleDateString('id-ID', {
        month: 'short',
      })
      .toUpperCase();
  };

  const formatDate = (dateStr: string, endStr?: string) => {
    if (!dateStr) return '-';

    const start = parseConcertDate(dateStr);

    if (!start) return dateStr;

    const startFmt = start.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    if (!endStr) return startFmt;

    const end = parseConcertDate(endStr);

    if (!end) return startFmt;

    const endFmt = end.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    if (startFmt === endFmt) return startFmt;

    if (
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
    ) {
      return `${String(start.getDate()).padStart(2, '0')}–${endFmt}`;
    }

    return `${startFmt} – ${endFmt}`;
  };

  // Minggu ini: hari ini sampai tujuh hari ke depan.
  const isThisWeek = (dateStr: string) => {
    const date = parseConcertDate(dateStr);

    if (!date) return false;

    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);

    return date >= today && date <= weekLater;
  };

  // Bulan ini berdasarkan bulan dan tahun kalender saat ini.
  const isThisMonth = (dateStr: string) => {
    const date = parseConcertDate(dateStr);

    if (!date) return false;

    const now = new Date();

    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const resetFilters = () => {
    setSearch('');
    setTimeFilter(null);
    setPriceFilter(null);
    setSortBy(SORT_OPTIONS[0].label);
  };

  // =====================================================
  // FILTER & SORT
  // =====================================================

  const filtered = concerts
    .filter((item) => {
      // SEARCH
      if (search.trim()) {
        const q = normalizeText(search);

        const searchableFields = [
          item.title,
          item.location,
          item.artist,
          item.genre,
        ];

        const match = searchableFields.some((field) =>
          normalizeText(field).includes(q)
        );

        if (!match) return false;
      }

      // TIME
      if (timeFilter === 'Minggu Ini') {
        if (!isThisWeek(item.concert_date)) return false;
      }

      if (timeFilter === 'Bulan Ini') {
        if (!isThisMonth(item.concert_date)) return false;
      }

      // PRICE
      if (priceFilter) {
        const price = getConcertPrice(item);

        if (priceFilter.label === 'IDR 0 - 500k') {
          if (price < 0 || price >= 500000) return false;
        }

        if (priceFilter.label === 'IDR 500k - 1jt') {
          if (price < 500000 || price >= 1000000) return false;
        }

        if (priceFilter.label === '> IDR 1jt') {
          if (price < 1000000) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // HARGA TERENDAH
      if (sortBy === 'Harga Terendah') {
        return getConcertPrice(a) - getConcertPrice(b);
      }

      // HARGA TERTINGGI
      if (sortBy === 'Harga Tertinggi') {
        return getConcertPrice(b) - getConcertPrice(a);
      }

      // TANGGAL TERDEKAT
      if (sortBy === 'Tanggal Terdekat') {
        const dateA = parseConcertDate(a.concert_date)?.getTime() ?? Infinity;

        const dateB = parseConcertDate(b.concert_date)?.getTime() ?? Infinity;

        return dateA - dateB;
      }

      // PALING RELEVAN
      return Number(b.tickets_sold || 0) - Number(a.tickets_sold || 0);
    });

  const hasActiveFilter = !!timeFilter || !!priceFilter;

  const hasAnyFilter = hasActiveFilter || !!search.trim();

  const goDetail = (id: any) => {
    navigation.navigate('ConcertDetail', { id });
  };

  // =====================================================
  // RENDER: POSTER CARD
  // =====================================================

  const renderPoster = (item: any) => {
    const soldOut = isSoldOut(item);
    const remaining = getRemainingTickets(item);
    const isFav = favorites.includes(String(item.id));
    const almostOut = !soldOut && remaining > 0 && remaining <= 20;
    const progress = getSoldProgress(item);

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.92}
        style={styles.poster}
        onPress={() => goDetail(item.id)}
      >
        {item.banner ? (
          <Image
            source={{ uri: getImageUrl(item.banner) }}
            style={[styles.posterImage, soldOut && styles.soldOutImage]}
          />
        ) : (
          <LinearGradient
            colors={['#3b1a78', '#150a2e']}
            style={styles.posterImage}
          />
        )}

        <LinearGradient
          colors={[
            'rgba(0,0,0,0.3)',
            'transparent',
            'rgba(0,0,0,0.6)',
            'rgba(0,0,0,0.92)',
          ]}
          locations={[0, 0.3, 0.62, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* DATE BLOCK */}
        <View style={styles.dateBlock}>
          <Text style={styles.dateMonth}>{getMonth(item.concert_date)}</Text>

          <Text style={styles.dateDay}>{getDay(item.concert_date)}</Text>
        </View>

        {/* HEART */}
        <TouchableOpacity
          style={styles.heartButton}
          activeOpacity={0.8}
          onPress={() => toggleFavorite(item.id)}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={19}
            color={isFav ? '#f472b6' : '#ffffff'}
          />
        </TouchableOpacity>

        {/* BOTTOM CONTENT */}
        <View style={styles.posterContent}>
          <View style={styles.posterBadgeRow}>
            {!!item.genre && (
              <View style={styles.genrePill}>
                <Text style={styles.genrePillText}>
                  {String(item.genre).toUpperCase()}
                </Text>
              </View>
            )}

            {soldOut ? (
              <View style={styles.soldOutPill}>
                <Ionicons name="close-circle" size={11} color="#ffffff" />
                <Text style={styles.soldOutPillText}>SOLD OUT</Text>
              </View>
            ) : (
              almostOut && (
                <View style={styles.hotPill}>
                  <Ionicons name="flame" size={11} color="#fbbf24" />
                  <Text style={styles.hotPillText}>HAMPIR HABIS</Text>
                </View>
              )
            )}
          </View>

          <Text style={styles.posterTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.posterMetaRow}>
            <Ionicons name="location-sharp" size={12} color="#d1d5db" />

            <Text style={styles.posterMeta} numberOfLines={1}>
              {item.location}
            </Text>
          </View>

          <View style={styles.posterMetaRow}>
            <Ionicons name="calendar-outline" size={12} color="#d1d5db" />

            <Text style={styles.posterMeta} numberOfLines={1}>
              {formatDate(item.concert_date, item.concert_end_date)}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: soldOut ? '#f87171' : '#c084fc',
                },
              ]}
            />
          </View>

          <View style={styles.posterBottom}>
            <View style={{ flex: 1 }}>
              <Text style={styles.posterPriceLabel}>
                {soldOut ? 'Status tiket' : 'Mulai dari'}
              </Text>

              {soldOut ? (
                <Text style={styles.posterSoldOutText}>
                  TIKET HABIS TERJUAL
                </Text>
              ) : (
                <Text style={styles.posterPrice}>
                  IDR {getConcertPrice(item).toLocaleString('id-ID')}
                </Text>
              )}
            </View>

            <LinearGradient
              colors={
                soldOut ? ['#52525b', '#3f3f46'] : [PURPLE, PURPLE_DARK]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.posterArrow}
            >
              <Ionicons
                name={soldOut ? 'close' : 'arrow-forward'}
                size={17}
                color="#ffffff"
              />
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================================
  // RENDER: GRID CARD
  // =====================================================

  const renderGrid = (item: any) => {
    const soldOut = isSoldOut(item);
    const remaining = getRemainingTickets(item);
    const isFav = favorites.includes(String(item.id));

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.9}
        style={styles.gridCard}
        onPress={() => goDetail(item.id)}
      >
        <View style={styles.gridImageWrap}>
          {item.banner ? (
            <Image
              source={{ uri: getImageUrl(item.banner) }}
              style={[styles.gridImage, soldOut && styles.soldOutImage]}
            />
          ) : (
            <LinearGradient
              colors={['#3b1a78', '#150a2e']}
              style={styles.gridImage}
            />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.gridImageGradient}
            pointerEvents="none"
          />

          <TouchableOpacity
            style={styles.gridHeart}
            activeOpacity={0.8}
            onPress={() => toggleFavorite(item.id)}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={15}
              color={isFav ? '#f472b6' : '#ffffff'}
            />
          </TouchableOpacity>

          <View style={styles.gridDate}>
            <Text style={styles.gridDateText}>
              {getDay(item.concert_date)} {getMonth(item.concert_date)}
            </Text>
          </View>

          {soldOut && (
            <View style={styles.gridSoldOut}>
              <Text style={styles.gridSoldOutText}>SOLD OUT</Text>
            </View>
          )}
        </View>

        <View style={styles.gridBody}>
          <Text style={styles.gridTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.gridMetaRow}>
            <Ionicons name="location-sharp" size={11} color={colors.subText} />

            <Text style={styles.gridMeta} numberOfLines={1}>
              {item.location}
            </Text>
          </View>

          <View style={styles.gridDivider} />

          {soldOut ? (
            <Text style={styles.gridSoldOutPrice}>TIKET HABIS</Text>
          ) : (
            <>
              <Text style={styles.gridPriceLabel}>
                {remaining > 0 && remaining <= 20
                  ? `Tinggal ${remaining} tiket`
                  : 'Mulai dari'}
              </Text>

              <Text style={styles.gridPrice}>
                IDR {getConcertPrice(item).toLocaleString('id-ID')}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // =====================================================
  // CHIP HELPER
  // =====================================================

  const renderChip = (
    key: string,
    label: string,
    active: boolean,
    onPress: () => void,
    icon?: any
  ) => (
    <TouchableOpacity
      key={key}
      activeOpacity={0.8}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      {!!icon && (
        <Ionicons
          name={icon}
          size={13}
          color={active ? '#ffffff' : colors.subText}
        />
      )}

      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.chipText, active && styles.chipTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />

        <LinearGradient
          colors={['rgba(168,85,247,0.25)', 'rgba(124,58,237,0.08)']}
          style={styles.loadingIcon}
        >
          <Ionicons name="compass" size={28} color={PURPLE} />
        </LinearGradient>

        <ActivityIndicator
          color={PURPLE}
          size="small"
          style={{ marginTop: 20 }}
        />

        <Text style={styles.loadingText}>Mencari konser...</Text>
      </View>
    );
  }

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>EKSPLOR</Text>
            <Text style={styles.headerTitle}>Temukan Konser</Text>
          </View>

          <View style={styles.headerCount}>
            <Ionicons name="musical-notes" size={13} color={PURPLE} />

            <Text style={styles.headerCountText}>{concerts.length}</Text>
          </View>
        </View>

        {/* SEARCH */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={PURPLE} />

            <TextInput
              placeholder="Cari konser, artis, atau kota..."
              placeholderTextColor={colors.subText}
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />

            {!!search && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{
                  top: 10,
                  bottom: 10,
                  left: 10,
                  right: 10,
                }}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.subText}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSortModalVisible(true)}
          >
            <LinearGradient
              colors={[PURPLE, PURPLE_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.filterButton}
            >
              <Feather name="sliders" size={18} color="#ffffff" />

              {hasActiveFilter && <View style={styles.filterDot} />}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {TIME_FILTERS.map((t) =>
            renderChip(
              `t-${t}`,
              t,
              timeFilter === t,
              () => setTimeFilter(timeFilter === t ? null : t),
              'time-outline'
            )
          )}

          {PRICE_FILTERS.map((p) =>
            renderChip(
              `p-${p.label}`,
              p.label,
              priceFilter?.label === p.label,
              () => setPriceFilter(priceFilter?.label === p.label ? null : p),
              'pricetag-outline'
            )
          )}
        </ScrollView>

        {/* RESULT COUNT + SORT + VIEW TOGGLE */}
        <View style={styles.resultRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultText}>
              <Text style={styles.resultCount}>{filtered.length}</Text>{' '}
              konser ditemukan
            </Text>

            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setSortModalVisible(true)}
            >
              <Ionicons
                name="swap-vertical"
                size={13}
                color={isDark ? '#a78bfa' : PURPLE_DARK}
              />

              <Text style={styles.sortText}>{sortBy}</Text>

              <Ionicons
                name="chevron-down"
                size={13}
                color={isDark ? '#a78bfa' : PURPLE_DARK}
              />
            </TouchableOpacity>
          </View>

          {hasAnyFilter && (
            <TouchableOpacity
              onPress={resetFilters}
              activeOpacity={0.8}
              style={styles.resetChip}
            >
              <Ionicons
                name="refresh"
                size={12}
                color={isDark ? '#c4b5fd' : PURPLE_DARK}
              />

              <Text style={styles.resetChipText}>Reset</Text>
            </TouchableOpacity>
          )}

          <View style={styles.viewToggle}>
            <TouchableOpacity
              onPress={() => setViewMode('poster')}
              activeOpacity={0.8}
              style={[
                styles.viewToggleBtn,
                viewMode === 'poster' && styles.viewToggleBtnActive,
              ]}
            >
              <Ionicons
                name="albums"
                size={15}
                color={viewMode === 'poster' ? '#ffffff' : colors.subText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode('grid')}
              activeOpacity={0.8}
              style={[
                styles.viewToggleBtn,
                viewMode === 'grid' && styles.viewToggleBtnActive,
              ]}
            >
              <Ionicons
                name="grid"
                size={14}
                color={viewMode === 'grid' ? '#ffffff' : colors.subText}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* LIST */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 130 + insets.bottom,
          }}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search" size={32} color={PURPLE} />
              </View>

              <Text style={styles.emptyTitle}>Konser tidak ditemukan</Text>

              <Text style={styles.emptyText}>
                Tidak ada konser yang cocok dengan pencarian atau filter kamu.
              </Text>

              {hasAnyFilter && (
                <TouchableOpacity
                  onPress={resetFilters}
                  activeOpacity={0.85}
                  style={styles.resetButton}
                >
                  <Ionicons name="refresh" size={14} color="#ffffff" />

                  <Text style={styles.resetButtonText}>Reset Filter</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : viewMode === 'poster' ? (
            filtered.map(renderPoster)
          ) : (
            <View style={styles.gridWrap}>{filtered.map(renderGrid)}</View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="home-outline" size={22} color={colors.subText} />
          <Text style={styles.navLabel}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <View style={styles.activeNavIcon}>
            <Ionicons name="compass" size={22} color={PURPLE} />
          </View>

          <Text style={[styles.navLabel, styles.navLabelActive]}>Eksplor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('MyTickets')}
        >
          <Ionicons name="ticket-outline" size={22} color={colors.subText} />
          <Text style={styles.navLabel}>Tiket Saya</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-outline" size={22} color={colors.subText} />
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
            <View style={styles.sheetHandle} />

            <Text style={styles.sortSheetTitle}>Urutkan</Text>

            <Text style={styles.sortSheetSub}>
              Pilih cara menampilkan daftar konser
            </Text>

            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.label;

              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[styles.sortOption, active && styles.sortOptionActive]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSortBy(opt.label);
                    setSortModalVisible(false);
                  }}
                >
                  <View
                    style={[
                      styles.sortOptionIcon,
                      active && styles.sortOptionIconActive,
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={active ? '#ffffff' : colors.subText}
                    />
                  </View>

                  <Text
                    style={[
                      styles.sortOptionText,
                      active && styles.sortOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>

                  {active && (
                    <View style={styles.checkWrap}>
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// =======================================================
// STYLES
// =======================================================

const createStyles = (
  colors: typeof themes.dark,
  isDark: boolean,
  gridCardWidth: number,
  bottomInset: number
) => {
  const accentText = isDark ? '#c4b5fd' : PURPLE_DARK;
  const danger = isDark ? '#f87171' : '#dc2626';
  const softBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    safeArea: {
      flex: 1,
    },

    /* ---------- LOADING ---------- */

    loadingRoot: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },

    loadingIcon: {
      width: 66,
      height: 66,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(168,85,247,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 10,
    },

    /* ---------- HEADER ---------- */

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
    },

    headerEyebrow: {
      color: PURPLE,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 2,
    },

    headerTitle: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '900',
      letterSpacing: -0.6,
      marginTop: 2,
    },

    headerCount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(168,85,247,0.12)',
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 12,
    },

    headerCountText: {
      color: PURPLE,
      fontSize: 12,
      fontWeight: '800',
    },

    /* ---------- SEARCH ---------- */

    searchRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginTop: 18,
      gap: 10,
    },

    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      gap: 9,
      height: 50,
    },

    searchInput: {
      flex: 1,
      color: colors.text,
      paddingVertical: 0,
      fontSize: 13,
    },

    filterButton: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: PURPLE,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 5,
    },

    filterDot: {
      position: 'absolute',
      top: 11,
      right: 12,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: '#fbbf24',
      borderWidth: 1.5,
      borderColor: PURPLE_DARK,
    },

    /* ---------- CHIPS ---------- */

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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      flexShrink: 0,
      flexGrow: 0,
      flexBasis: 'auto',
      overflow: 'hidden',
    },

    chipActive: {
      backgroundColor: PURPLE,
      borderColor: PURPLE,
    },

    chipText: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '600',
    },

    chipTextActive: {
      color: '#ffffff',
      fontWeight: '800',
    },

    /* ---------- RESULT ROW ---------- */

    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginTop: 14,
      marginBottom: 14,
      gap: 10,
    },

    resultText: {
      color: colors.subText,
      fontSize: 13,
    },

    resultCount: {
      color: colors.text,
      fontWeight: '900',
    },

    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 5,
      alignSelf: 'flex-start',
    },

    sortText: {
      color: accentText,
      fontSize: 12.5,
      fontWeight: '700',
    },

    resetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(168,85,247,0.12)',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
    },

    resetChipText: {
      color: accentText,
      fontSize: 11,
      fontWeight: '800',
    },

    viewToggle: {
      flexDirection: 'row',
      backgroundColor: softBg,
      borderRadius: 12,
      padding: 3,
    },

    viewToggleBtn: {
      width: 34,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    viewToggleBtnActive: {
      backgroundColor: PURPLE_DARK,
    },

    /* ---------- POSTER CARD ---------- */

    poster: {
      marginHorizontal: 20,
      marginBottom: 18,
      height: 300,
      borderRadius: 26,
      overflow: 'hidden',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: PURPLE_DARK,
      shadowOpacity: isDark ? 0.3 : 0.16,
      shadowRadius: 16,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      elevation: 5,
    },

    posterImage: {
      ...StyleSheet.absoluteFill,
      width: '100%',
      height: '100%',
    },

    soldOutImage: {
      opacity: 0.5,
    },

    dateBlock: {
      position: 'absolute',
      top: 14,
      left: 14,
      width: 52,
      paddingVertical: 7,
      borderRadius: 15,
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },

    dateMonth: {
      color: '#d8b4fe',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
    },

    dateDay: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: '900',
      lineHeight: 23,
    },

    heartButton: {
      position: 'absolute',
      top: 14,
      right: 14,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    posterContent: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 16,
    },

    posterBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },

    genrePill: {
      backgroundColor: 'rgba(168,85,247,0.85)',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
    },

    genrePillText: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
    },

    soldOutPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#dc2626',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
    },

    soldOutPillText: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
    },

    hotPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1,
      borderColor: 'rgba(251,191,36,0.45)',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
    },

    hotPillText: {
      color: '#fbbf24',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
    },

    posterTitle: {
      color: '#ffffff',
      fontSize: 22,
      lineHeight: 27,
      fontWeight: '900',
      letterSpacing: -0.4,
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: {
        width: 0,
        height: 2,
      },
      textShadowRadius: 6,
    },

    posterMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 5,
    },

    posterMeta: {
      color: '#d1d5db',
      fontSize: 12,
      flex: 1,
    },

    progressTrack: {
      height: 4,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginTop: 12,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      borderRadius: 4,
    },

    posterBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },

    posterPriceLabel: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 10,
    },

    posterPrice: {
      color: '#ffffff',
      fontSize: 17,
      fontWeight: '900',
      marginTop: 1,
    },

    posterSoldOutText: {
      color: '#f87171',
      fontSize: 12,
      fontWeight: '900',
      marginTop: 3,
    },

    posterArrow: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* ---------- GRID CARD ---------- */

    gridWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
    },

    gridCard: {
      width: gridCardWidth,
      marginBottom: 14,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.22 : 0.07,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      elevation: 3,
    },

    gridImageWrap: {
      height: 130,
    },

    gridImage: {
      width: '100%',
      height: '100%',
    },

    gridImageGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 60,
    },

    gridHeart: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    gridDate: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 7,
    },

    gridDateText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '800',
    },

    gridSoldOut: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: '#dc2626',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
    },

    gridSoldOutText: {
      color: '#ffffff',
      fontSize: 8,
      fontWeight: '900',
    },

    gridBody: {
      padding: 12,
    },

    gridTitle: {
      color: colors.text,
      fontSize: 13.5,
      fontWeight: '800',
      lineHeight: 18,
      minHeight: 36,
    },

    gridMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 5,
    },

    gridMeta: {
      color: colors.subText,
      fontSize: 11,
      flex: 1,
    },

    gridDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 10,
    },

    gridPriceLabel: {
      color: colors.subText,
      fontSize: 10,
    },

    gridPrice: {
      color: isDark ? '#a78bfa' : PURPLE_DARK,
      fontSize: 14,
      fontWeight: '900',
      marginTop: 1,
    },

    gridSoldOutPrice: {
      color: danger,
      fontSize: 11,
      fontWeight: '900',
    },

    /* ---------- EMPTY ---------- */

    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 50,
      paddingHorizontal: 30,
    },

    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: 'rgba(168,85,247,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },

    emptyText: {
      color: colors.subText,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 19,
    },

    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 18,
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: 13,
      backgroundColor: PURPLE_DARK,
    },

    resetButtonText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },

    /* ---------- BOTTOM NAV ---------- */

    bottomNav: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 10,
      paddingBottom: Math.max(bottomInset, 12) + 6,
    },

    navItem: {
      alignItems: 'center',
      gap: 4,
    },

    activeNavIcon: {
      width: 44,
      height: 30,
      borderRadius: 12,
      backgroundColor: 'rgba(168,85,247,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    navLabel: {
      color: colors.subText,
      fontSize: 11,
    },

    navLabelActive: {
      color: PURPLE,
      fontWeight: '800',
    },

    /* ---------- SORT SHEET ---------- */

    sortOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'flex-end',
    },

    sortOverlayBg: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.65)',
    },

    sortSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: Math.max(bottomInset, 16) + 14,
      borderWidth: 1,
      borderColor: colors.border,
    },

    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 16,
    },

    sortSheetTitle: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '900',
    },

    sortSheetSub: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 3,
      marginBottom: 14,
    },

    sortOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 10,
      borderRadius: 16,
      marginBottom: 4,
    },

    sortOptionActive: {
      backgroundColor: 'rgba(168,85,247,0.12)',
    },

    sortOptionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: softBg,
      alignItems: 'center',
      justifyContent: 'center',
    },

    sortOptionIconActive: {
      backgroundColor: PURPLE_DARK,
    },

    sortOptionText: {
      flex: 1,
      color: colors.subText,
      fontSize: 14,
      fontWeight: '600',
    },

    sortOptionTextActive: {
      color: colors.text,
      fontWeight: '800',
    },

    checkWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: PURPLE_DARK,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};