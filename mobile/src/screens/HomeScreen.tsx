import React, { useCallback, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

const PURPLE = '#a855f7';
const PURPLE_DARK = '#7c3aed';

export default function HomeScreen({ navigation }: any) {
  const { colors, mode, toggleTheme } = useTheme();
  const isDark = colors.statusBar === 'light';
  const styles = createStyles(colors, isDark);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [concerts, setConcerts] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any>(null);

  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Notification
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifList, setNotifList] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchConcerts();
      fetchProfile();
      fetchUnreadNotifications();
    }, [])
  );

  // =====================================================
  // FETCH CONCERTS
  // =====================================================

  const fetchConcerts = async () => {
    try {
      const res = await axios.get(`${API_URL}/concerts`);

      const data = res.data.data || [];

      // Jangan tampilkan konser draft
      const publicConcerts = data.filter(
        (item: any) => item.status !== 'draft'
      );

      // Urutkan berdasarkan jumlah tiket terjual
      const sorted = [...publicConcerts].sort(
        (a, b) =>
          Number(b.tickets_sold || 0) -
          Number(a.tickets_sold || 0)
      );

      setFeatured(sorted[0] || null);
      setConcerts(sorted.slice(1));
    } catch (err) {
      console.log('Gagal fetch concerts:', err);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FETCH PROFILE
  // =====================================================

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) return;

      const res = await axios.get(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const avatar = res.data.data?.avatar;

      setProfileAvatar(
        avatar ? `${BASE_URL}${avatar}` : null
      );
    } catch (err) {
      console.log('Gagal fetch profile');
    }
  };

  // =====================================================
  // FETCH UNREAD NOTIFICATION
  // =====================================================

  const fetchUnreadNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) return;

      const res = await axios.get(`${API_URL}/notifications/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const list = res.data.data || [];

      const unread = list.filter(
        (n: any) => !n.is_read
      ).length;

      setUnreadCount(unread);
    } catch (err) {
      console.log('Gagal fetch unread notification');
    }
  };

  // =====================================================
  // REFRESH
  // =====================================================

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        fetchConcerts(),
        fetchProfile(),
        fetchUnreadNotifications(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // =====================================================
  // NOTIFICATION
  // =====================================================

  const openNotifPopup = async () => {
    setNotifModalVisible(true);
    setNotifLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setNotifList([]);
        return;
      }

      const res = await axios.get(`${API_URL}/notifications/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const list = res.data.data || [];

      setNotifList(list);

      const hasUnread = list.some(
        (n: any) => !n.is_read
      );

      if (hasUnread) {
        await markAllAsRead(token);
      }
    } catch (err) {
      console.log('Gagal fetch notifikasi:', err);
      setNotifList([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const markAllAsRead = async (token: string) => {
    setMarkingRead(true);

    try {
      await axios.put(
        `${API_URL}/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifList((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.log('Gagal menandai notifikasi dibaca');
    } finally {
      setMarkingRead(false);
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const getImageUrl = (banner?: string) => {
    if (!banner) return undefined;

    if (banner.startsWith('http')) {
      return banner;
    }

    return `${BASE_URL}${banner}`;
  };

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
        })
      : '-';

  const formatNotifDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-';

  // Cek apakah tiket konser sudah habis
  const isSoldOut = (item: any) => {
    const sold = Number(item?.tickets_sold || 0);
    const quota = Number(item?.total_quota || 0);

    return quota > 0 && sold >= quota;
  };

  // Persentase tiket terjual (untuk progress bar)
  const getSoldProgress = (item: any) => {
    const sold = Number(item?.tickets_sold || 0);
    const quota = Number(item?.total_quota || 0);

    if (quota <= 0) return 0;

    return Math.min(Math.max(sold / quota, 0), 1);
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const matchesQuery = (item: any, query: string) => {
    const q = query.trim().toLowerCase();

    if (!q) return true;

    const title = (item?.title || '').toLowerCase();
    const location = (item?.location || '').toLowerCase();
    const artist = (item?.artist || '').toLowerCase();

    return (
      title.includes(q) ||
      location.includes(q) ||
      artist.includes(q)
    );
  };

  const isSearching = searchQuery.trim().length > 0;

  const filteredConcerts = concerts.filter((item) =>
    matchesQuery(item, searchQuery)
  );

  const featuredMatches = featured
    ? matchesQuery(featured, searchQuery)
    : false;

  // =====================================================
  // RENDER: BARIS KONSER (dipakai di Terpopuler & hasil search)
  // =====================================================

  const renderConcertRow = (item: any, rank?: number) => {
    const soldOut = isSoldOut(item);
    const progress = getSoldProgress(item);

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('ConcertDetail', {
            id: item.id,
          })
        }
        style={styles.popularCard}
      >
        <View style={styles.popularImageWrapper}>
          {item.banner ? (
            <Image
              source={{ uri: getImageUrl(item.banner) }}
              style={[
                styles.popularImage,
                soldOut && styles.soldOutImage,
              ]}
            />
          ) : (
            <LinearGradient
              colors={['#3b1a78', '#150a2e']}
              style={styles.popularImage}
            />
          )}

          {rank !== undefined && !soldOut && (
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{rank}</Text>
            </View>
          )}

          {soldOut && (
            <View style={styles.smallImageSoldOutBadge}>
              <Text style={styles.smallImageSoldOutText}>
                HABIS
              </Text>
            </View>
          )}
        </View>

        <View style={styles.popularContent}>
          <View style={styles.popularTitleRow}>
            <Text style={styles.popularTitle} numberOfLines={1}>
              {item.title}
            </Text>

            {soldOut && (
              <View style={styles.smallSoldOutBadge}>
                <Text style={styles.smallSoldOutText}>
                  SOLD OUT
                </Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              name="location-sharp"
              size={11}
              color={colors.subText}
            />

            <Text style={styles.popularVenue} numberOfLines={1}>
              {item.location}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons
              name="calendar-outline"
              size={11}
              color={colors.subText}
            />

            <Text style={styles.popularVenue} numberOfLines={1}>
              {formatDate(item.concert_date)}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: soldOut ? '#f87171' : PURPLE,
                },
              ]}
            />
          </View>

          <View style={styles.popularBottomRow}>
            {soldOut ? (
              <Text style={styles.soldOutPriceSmall}>
                TIKET HABIS
              </Text>
            ) : (
              <Text style={styles.popularPrice}>
                IDR{' '}
                {Number(item.lowest_price || 0).toLocaleString('id-ID')}
              </Text>
            )}

            <Text style={styles.soldText}>
              {item.tickets_sold || 0}/{item.total_quota || 0} terjual
            </Text>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={17}
          color={colors.subText}
        />
      </TouchableOpacity>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <LinearGradient
          colors={['rgba(168,85,247,0.25)', 'rgba(124,58,237,0.08)']}
          style={styles.loadingIcon}
        >
          <Ionicons
            name="ticket"
            size={28}
            color={colors.primary}
          />
        </LinearGradient>

        <ActivityIndicator
          color={colors.primary}
          size="small"
          style={styles.loadingSpinner}
        />

        <Text style={styles.loadingText}>
          Memuat konser...
        </Text>
      </View>
    );
  }

  // =====================================================
  // MAIN
  // =====================================================

  return (
    <View style={styles.root}>
      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#a855f7"
              colors={['#a855f7']}
            />
          }
        >
          {/* HEADER */}

          <View style={styles.headerRow}>
            <View>
              <View style={styles.locationRow}>
                <View style={styles.locationIconWrap}>
                  <Ionicons
                    name="location-sharp"
                    size={11}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.locationLabel}>
                  Lokasi Anda
                </Text>
              </View>

              <TouchableOpacity
                style={styles.locationValueRow}
                activeOpacity={0.7}
              >
                <Text style={styles.locationValue}>
                  Bekasi, Indonesia
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={15}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.headerIcons}>
              {/* NOTIFICATION */}

              <TouchableOpacity
                style={styles.bellButton}
                onPress={openNotifPopup}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="notifications-outline"
                  size={19}
                  color={colors.text}
                />

                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* THEME TOGGLE */}

              <TouchableOpacity
                style={styles.themeToggleButton}
                onPress={toggleTheme}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={mode === 'dark' ? 'Aktifkan light mode' : 'Aktifkan dark mode'}
              >
                <Ionicons
                  name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                  size={19}
                  color={colors.text}
                />
              </TouchableOpacity>

              {/* PROFILE */}

              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[PURPLE, PURPLE_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarRing}
                >
                  {profileAvatar ? (
                    <Image
                      source={{ uri: profileAvatar }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons
                        name="person"
                        size={17}
                        color={colors.subText}
                      />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* SEARCH */}

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <View style={styles.searchIconWrap}>
                <Ionicons
                  name="search"
                  size={15}
                  color={colors.primary}
                />
              </View>

              <TextInput
                placeholder="Cari konser, artis, atau venue..."
                placeholderTextColor={colors.subText}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />

              {isSearching && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{
                    top: 8,
                    bottom: 8,
                    left: 8,
                    right: 8,
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
          </View>

          {/* FEATURED */}

          {!isSearching && (
            <>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleWrap}>
                  <View style={styles.sectionBar} />

                  <View>
                    <Text style={styles.sectionTitle}>
                      Konser Pilihan
                    </Text>

                    <Text style={styles.sectionSubtitle}>
                      Temukan konser yang sedang ramai
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Explore')}
                  activeOpacity={0.7}
                  style={styles.sectionLinkWrap}
                >
                  <Text style={styles.sectionLink}>
                    Lihat Semua
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={12}
                    color={isDark ? '#a78bfa' : PURPLE_DARK}
                  />
                </TouchableOpacity>
              </View>

              {featured && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate('ConcertDetail', {
                      id: featured.id,
                    })
                  }
                  style={styles.featuredCard}
                >
                  {featured.banner ? (
                    <Image
                      source={{
                        uri: getImageUrl(featured.banner),
                      }}
                      style={[
                        styles.featuredImage,
                        isSoldOut(featured) && styles.soldOutImage,
                      ]}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#3b1a78', '#150a2e']}
                      style={styles.featuredImage}
                    />
                  )}

                  <LinearGradient
                    colors={[
                      'rgba(0,0,0,0.25)',
                      'transparent',
                      'rgba(0,0,0,0.55)',
                      'rgba(0,0,0,0.88)',
                    ]}
                    locations={[0, 0.3, 0.65, 1]}
                    style={[
                      styles.featuredOverlay,
                      isSoldOut(featured) && styles.soldOutOverlay,
                    ]}
                    pointerEvents="none"
                  />

                  {/* BADGE */}

                  {isSoldOut(featured) ? (
                    <View style={styles.soldOutBadge}>
                      <Ionicons
                        name="close-circle"
                        size={13}
                        color="#ffffff"
                      />

                      <Text style={styles.soldOutBadgeText}>
                        SOLD OUT
                      </Text>
                    </View>
                  ) : (
                    featured.tickets_sold > 0 && (
                      <LinearGradient
                        colors={[PURPLE, PURPLE_DARK]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.trendingBadge}
                      >
                        <Ionicons
                          name="flame"
                          size={12}
                          color="#ffffff"
                        />

                        <Text style={styles.trendingText}>
                          TRENDING
                        </Text>
                      </LinearGradient>
                    )
                  )}

                  {/* DATE PILL */}

                  <View style={styles.datePill}>
                    <Ionicons
                      name="calendar"
                      size={11}
                      color="#e9d5ff"
                    />

                    <Text style={styles.datePillText}>
                      {formatDate(featured.concert_date)}
                    </Text>
                  </View>

                  <View style={styles.featuredContent}>
                    <Text
                      style={styles.featuredTitle}
                      numberOfLines={2}
                    >
                      {featured.title}
                    </Text>

                    <View style={styles.featuredMetaRow}>
                      <Ionicons
                        name="location-sharp"
                        size={13}
                        color="#d1d5db"
                      />

                      <Text
                        style={styles.featuredMeta}
                        numberOfLines={1}
                      >
                        {featured.location}
                      </Text>
                    </View>

                    <View style={styles.featuredProgressTrack}>
                      <View
                        style={[
                          styles.featuredProgressFill,
                          {
                            width: `${getSoldProgress(featured) * 100}%`,
                            backgroundColor: isSoldOut(featured)
                              ? '#f87171'
                              : '#c084fc',
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.featuredBottom}>
                      <View>
                        {isSoldOut(featured) ? (
                          <Text style={styles.soldOutPrice}>
                            TIKET HABIS TERJUAL
                          </Text>
                        ) : (
                          <>
                            <Text style={styles.featuredPriceLabel}>
                              Mulai dari
                            </Text>

                            <Text style={styles.featuredPrice}>
                              IDR{' '}
                              {Number(
                                featured.lowest_price || 0
                              ).toLocaleString('id-ID')}
                            </Text>
                          </>
                        )}
                      </View>

                      <LinearGradient
                        colors={
                          isSoldOut(featured)
                            ? ['#dc2626', '#b91c1c']
                            : [PURPLE, PURPLE_DARK]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.featuredArrow}
                      >
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="#ffffff"
                        />
                      </LinearGradient>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* SEARCH FEATURED RESULT */}

          {isSearching &&
            featuredMatches &&
            featured && (
              <View style={styles.searchFeaturedWrapper}>
                <View style={styles.popularList}>
                  {renderConcertRow(featured)}
                </View>
              </View>
            )}

          {/* POPULAR / SEARCH RESULT */}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <View style={styles.sectionBar} />

              <View>
                <Text style={styles.sectionTitle}>
                  {isSearching ? 'Hasil Pencarian' : 'Terpopuler'}
                </Text>

                {!isSearching && (
                  <Text style={styles.sectionSubtitle}>
                    Konser yang paling banyak diminati
                  </Text>
                )}
              </View>
            </View>

            {!isSearching && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Explore')}
                activeOpacity={0.7}
                style={styles.sectionLinkWrap}
              >
                <Text style={styles.sectionLink}>
                  Lihat Semua
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={isDark ? '#a78bfa' : PURPLE_DARK}
                />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.popularList}>
            {filteredConcerts.length === 0 &&
            !(isSearching && featuredMatches) ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name={
                      isSearching
                        ? 'search-outline'
                        : 'musical-notes-outline'
                    }
                    size={25}
                    color={colors.primary}
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  {isSearching
                    ? 'Konser tidak ditemukan'
                    : 'Belum ada konser lain'}
                </Text>

                <Text style={styles.emptyText}>
                  {isSearching
                    ? `Tidak ada hasil untuk "${searchQuery}"`
                    : 'Konser lainnya akan muncul di sini.'}
                </Text>
              </View>
            ) : (
              filteredConcerts.map((item, index) =>
                renderConcertRow(
                  item,
                  isSearching ? undefined : index + 2
                )
              )
            )}
          </View>

          {/* BOTTOM SPACE */}

          <View style={{ height: 110 }} />
        </ScrollView>
      </SafeAreaView>

      {/* BOTTOM NAVIGATION */}

      <View style={styles.bottomNav}>
        {/* HOME */}

        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <View style={styles.activeNavIcon}>
            <Ionicons
              name="home"
              size={20}
              color={colors.primary}
            />
          </View>

          <Text
            style={[
              styles.navLabel,
              styles.navLabelActive,
            ]}
          >
            Beranda
          </Text>
        </TouchableOpacity>

        {/* EXPLORE */}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Explore')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons
              name="compass-outline"
              size={21}
              color={colors.subText}
            />
          </View>

          <Text style={styles.navLabel}>
            Eksplor
          </Text>
        </TouchableOpacity>

        {/* MY TICKETS */}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('MyTickets')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons
              name="ticket-outline"
              size={21}
              color={colors.subText}
            />
          </View>

          <Text style={styles.navLabel}>
            Tiket Saya
          </Text>
        </TouchableOpacity>

        {/* PROFILE */}

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons
              name="person-outline"
              size={21}
              color={colors.subText}
            />
          </View>

          <Text style={styles.navLabel}>
            Profil
          </Text>
        </TouchableOpacity>
      </View>

      {/* NOTIFICATION MODAL */}

      <Modal
        visible={notifModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNotifModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.notifCard}
            onPress={() => {}}
          >
            {/* HANDLE */}

            <View style={styles.sheetHandle} />

            {/* HEADER */}

            <View style={styles.notifHeader}>
              <View style={styles.notifHeaderLeft}>
                <View style={styles.notifHeaderIcon}>
                  <Ionicons
                    name="notifications"
                    size={17}
                    color={PURPLE}
                  />
                </View>

                <View>
                  <Text style={styles.notifHeaderTitle}>
                    Notifikasi
                  </Text>

                  {markingRead && (
                    <Text style={styles.notifHeaderSub}>
                      Menandai dibaca...
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.notifCloseBtn}
                onPress={() => setNotifModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close"
                  size={19}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>

            {/* LOADING */}

            {notifLoading ? (
              <View style={styles.notifLoadingBox}>
                <ActivityIndicator color={colors.primary} />

                <Text style={styles.notifLoadingText}>
                  Memuat notifikasi...
                </Text>
              </View>
            ) : notifList.length === 0 ? (
              /* EMPTY */

              <View style={styles.notifEmptyBox}>
                <View style={styles.notifEmptyIconWrap}>
                  <Ionicons
                    name="notifications-off-outline"
                    size={27}
                    color={colors.subText}
                  />
                </View>

                <Text style={styles.notifEmptyTitle}>
                  Belum ada notifikasi
                </Text>

                <Text style={styles.notifEmptySub}>
                  Kabar terbaru soal konser kamu bakal muncul di sini.
                </Text>
              </View>
            ) : (
              /* LIST */

              <FlatList
                data={notifList}
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: 460 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 4 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.notifItem,
                      !item.is_read && styles.notifItemUnread,
                    ]}
                    onPress={() => {
                      setNotifModalVisible(false);

                      if (item.concert_id) {
                        navigation.navigate('ConcertDetail', {
                          id: item.concert_id,
                        });
                      }
                    }}
                  >
                    {/* THUMBNAIL */}

                    {item.concert_banner ? (
                      <Image
                        source={{
                          uri: getImageUrl(item.concert_banner),
                        }}
                        style={styles.notifThumb}
                      />
                    ) : (
                      <View style={styles.notifThumbPlaceholder}>
                        <Ionicons
                          name="musical-notes"
                          size={17}
                          color={colors.subText}
                        />
                      </View>
                    )}

                    <View style={styles.notifContent}>
                      {/* CONCERT BADGE */}

                      {item.concert_title && (
                        <View style={styles.concertBadge}>
                          <Ionicons
                            name="musical-note"
                            size={10}
                            color={colors.primary}
                          />

                          <Text
                            style={styles.concertBadgeText}
                            numberOfLines={1}
                          >
                            {item.concert_title}
                          </Text>
                        </View>
                      )}

                      {/* TITLE */}

                      <View style={styles.notifTitleRow}>
                        {!item.is_read && (
                          <View style={styles.notifDot} />
                        )}

                        <Text
                          style={styles.notifTitle}
                          numberOfLines={1}
                        >
                          {item.title || 'Notifikasi'}
                        </Text>
                      </View>

                      {/* MESSAGE */}

                      <Text
                        style={styles.notifMessage}
                        numberOfLines={3}
                      >
                        {item.message}
                      </Text>

                      {/* DATE */}

                      <View style={styles.notifDateRow}>
                        <Ionicons
                          name="time-outline"
                          size={10}
                          color={colors.subText}
                        />

                        <Text style={styles.notifDate}>
                          {formatNotifDate(item.created_at)}
                        </Text>
                      </View>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.subText}
                    />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View style={styles.notifSeparator} />
                )}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// =======================================================
// STYLES
// =======================================================

const createStyles = (
  colors: typeof import('../context/ThemeContext').themes.dark,
  isDark: boolean
) => {
  const accentText = isDark ? '#c4b5fd' : PURPLE_DARK;
  const priceColor = isDark ? '#a78bfa' : PURPLE_DARK;
  const danger = isDark ? '#f87171' : '#dc2626';

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    safeArea: {
      flex: 1,
    },

    // LOADING

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
      justifyContent: 'center',
      alignItems: 'center',
    },

    loadingSpinner: {
      marginTop: 18,
    },

    loadingText: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 9,
    },

    // HEADER

    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 15,
    },

    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    locationIconWrap: {
      width: 20,
      height: 20,
      borderRadius: 7,
      backgroundColor: 'rgba(168,85,247,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    locationLabel: {
      color: colors.subText,
      fontSize: 11,
      fontWeight: '500',
    },

    locationValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
    },

    locationValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.2,
    },

    headerIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    bellButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    themeToggleButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },

    badge: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
      borderWidth: 2,
      borderColor: colors.background,
    },

    badgeText: {
      color: '#ffffff',
      fontSize: 8,
      fontWeight: '900',
    },

    avatarRing: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },

    avatar: {
      width: 37,
      height: 37,
      borderRadius: 18.5,
      borderWidth: 2,
      borderColor: colors.background,
    },

    avatarPlaceholder: {
      width: 37,
      height: 37,
      borderRadius: 18.5,
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // SEARCH

    searchRow: {
      paddingHorizontal: 20,
      marginTop: 20,
    },

    searchBox: {
      width: '100%',
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 17,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },

    searchIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: 'rgba(168,85,247,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    searchInput: {
      flex: 1,
      color: colors.text,
      paddingVertical: 0,
      paddingHorizontal: 10,
      fontSize: 13,
    },

    // SECTION

    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginTop: 28,
      marginBottom: 14,
    },

    sectionTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    sectionBar: {
      width: 4,
      height: 30,
      borderRadius: 4,
      backgroundColor: PURPLE,
      marginRight: 11,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.2,
    },

    sectionSubtitle: {
      color: colors.subText,
      fontSize: 10.5,
      marginTop: 3,
    },

    sectionLinkWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: 'rgba(168,85,247,0.1)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },

    sectionLink: {
      color: priceColor,
      fontSize: 11.5,
      fontWeight: '700',
    },

    // FEATURED

    featuredCard: {
      marginHorizontal: 20,
      height: 245,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: PURPLE_DARK,
      shadowOpacity: isDark ? 0.3 : 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },

    featuredImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },

    featuredOverlay: {
      ...StyleSheet.absoluteFill,
    },

    soldOutImage: {
      opacity: 0.65,
    },

    soldOutOverlay: {
      opacity: 0.9,
    },

    trendingBadge: {
      position: 'absolute',
      top: 14,
      left: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 20,
    },

    trendingText: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.5,
    },

    soldOutBadge: {
      position: 'absolute',
      top: 14,
      left: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#dc2626',
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 20,
    },

    soldOutBadgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },

    datePill: {
      position: 'absolute',
      top: 14,
      right: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
    },

    datePillText: {
      color: '#f5f3ff',
      fontSize: 10,
      fontWeight: '800',
    },

    featuredContent: {
      position: 'absolute',
      left: 18,
      right: 16,
      bottom: 16,
    },

    featuredTitle: {
      color: '#ffffff',
      fontSize: 21,
      lineHeight: 26,
      fontWeight: '900',
      letterSpacing: -0.4,
      textShadowColor: 'rgba(0,0,0,0.4)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },

    featuredMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 7,
    },

    featuredMeta: {
      color: '#d1d5db',
      fontSize: 11.5,
      flex: 1,
    },

    featuredProgressTrack: {
      height: 4,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginTop: 12,
      overflow: 'hidden',
    },

    featuredProgressFill: {
      height: '100%',
      borderRadius: 4,
    },

    featuredBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
    },

    featuredPriceLabel: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 10,
    },

    featuredPrice: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '900',
      marginTop: 1,
    },

    soldOutPrice: {
      color: '#f87171',
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.3,
    },

    featuredArrow: {
      width: 38,
      height: 38,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // POPULAR

    searchFeaturedWrapper: {
      marginTop: 18,
    },

    popularList: {
      paddingHorizontal: 20,
      gap: 12,
    },

    popularCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 11,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.18 : 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },

    popularImageWrapper: {
      width: 82,
      height: 92,
      borderRadius: 15,
      overflow: 'hidden',
      backgroundColor: colors.secondary,
    },

    popularImage: {
      width: 82,
      height: 92,
      borderRadius: 15,
      backgroundColor: colors.secondary,
    },

    rankBadge: {
      position: 'absolute',
      top: 5,
      left: 5,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 7,
    },

    rankText: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '900',
    },

    smallImageSoldOutBadge: {
      position: 'absolute',
      bottom: 5,
      left: 5,
      backgroundColor: '#dc2626',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },

    smallImageSoldOutText: {
      color: '#ffffff',
      fontSize: 8,
      fontWeight: '900',
    },

    popularContent: {
      flex: 1,
      minWidth: 0,
    },

    popularTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
    },

    popularTitle: {
      color: colors.text,
      fontSize: 14.5,
      fontWeight: '800',
      flex: 1,
      minWidth: 0,
    },

    smallSoldOutBadge: {
      backgroundColor: 'rgba(220,38,38,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(248,113,113,0.35)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },

    smallSoldOutText: {
      color: danger,
      fontSize: 8,
      fontWeight: '900',
    },

    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 5,
    },

    popularVenue: {
      color: colors.subText,
      fontSize: 11,
      flex: 1,
    },

    progressTrack: {
      height: 4,
      borderRadius: 4,
      backgroundColor: colors.border,
      marginTop: 10,
      overflow: 'hidden',
    },

    progressFill: {
      height: '100%',
      borderRadius: 4,
    },

    popularBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },

    popularPrice: {
      color: priceColor,
      fontSize: 13,
      fontWeight: '900',
    },

    soldOutPriceSmall: {
      color: danger,
      fontSize: 10,
      fontWeight: '900',
    },

    soldText: {
      color: colors.subText,
      fontSize: 10,
    },

    // EMPTY

    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 34,
      paddingHorizontal: 20,
    },

    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor: 'rgba(168,85,247,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 13,
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },

    emptyText: {
      color: colors.subText,
      fontSize: 11.5,
      textAlign: 'center',
      marginTop: 5,
      lineHeight: 17,
    },

    // BOTTOM NAV

    bottomNav: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 82,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-start',
      backgroundColor: colors.tabBar,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 9,
      paddingBottom: 12,
    },

    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    navIcon: {
      width: 35,
      height: 35,
      alignItems: 'center',
      justifyContent: 'center',
    },

    activeNavIcon: {
      width: 44,
      height: 35,
      borderRadius: 13,
      backgroundColor: 'rgba(168,85,247,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    navLabel: {
      color: colors.subText,
      fontSize: 10,
      marginTop: 2,
    },

    navLabelActive: {
      color: '#a855f7',
      fontWeight: '800',
    },

    // NOTIFICATION MODAL

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.68)',
      justifyContent: 'flex-end',
    },

    notifCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom: 28,
      maxHeight: '82%',
      borderTopWidth: 1,
      borderColor: colors.border,
    },

    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 15,
    },

    notifHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    notifHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },

    notifHeaderIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: 'rgba(168,85,247,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    notifHeaderTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },

    notifHeaderSub: {
      color: priceColor,
      fontSize: 10,
      marginTop: 2,
    },

    notifCloseBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    notifLoadingBox: {
      paddingVertical: 40,
      alignItems: 'center',
    },

    notifLoadingText: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 10,
    },

    notifEmptyBox: {
      alignItems: 'center',
      paddingVertical: 34,
      paddingHorizontal: 20,
    },

    notifEmptyIconWrap: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },

    notifEmptyTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },

    notifEmptySub: {
      color: colors.subText,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 5,
      lineHeight: 17,
    },

    notifItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: 12,
      paddingHorizontal: 9,
      borderRadius: 16,
    },

    notifItemUnread: {
      backgroundColor: 'rgba(168,85,247,0.09)',
    },

    notifThumb: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.secondary,
    },

    notifThumbPlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    notifContent: {
      flex: 1,
      minWidth: 0,
    },

    concertBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      backgroundColor: 'rgba(168,85,247,0.13)',
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
      marginBottom: 4,
      maxWidth: '100%',
    },

    concertBadgeText: {
      color: accentText,
      fontSize: 9,
      fontWeight: '700',
    },

    notifTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    notifDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: PURPLE,
    },

    notifTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      flex: 1,
    },

    notifMessage: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 3,
      lineHeight: 16,
    },

    notifDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 5,
    },

    notifDate: {
      color: colors.subText,
      fontSize: 9,
    },

    notifSeparator: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 8,
    },
  });
};