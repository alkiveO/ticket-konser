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
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const BASE_URL =
  'http://localhost:3000';

const API_URL = `${BASE_URL}/api`;

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [concerts, setConcerts] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any>(null);

  const [profileAvatar, setProfileAvatar] =
    useState<string | null>(null);

  const [unreadCount, setUnreadCount] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Notification
  const [notifModalVisible, setNotifModalVisible] =
    useState(false);
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
          (b.tickets_sold || 0) -
          (a.tickets_sold || 0)
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
      const token =
        await AsyncStorage.getItem('token');

      if (!token) return;

      const res = await axios.get(
        `${API_URL}/auth/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      const token =
        await AsyncStorage.getItem('token');

      if (!token) return;

      const res = await axios.get(
        `${API_URL}/notifications/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const list = res.data.data || [];

      const unread = list.filter(
        (n: any) => !n.is_read
      ).length;

      setUnreadCount(unread);
    } catch (err) {
      console.log(
        'Gagal fetch unread notification'
      );
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
      const token =
        await AsyncStorage.getItem('token');

      if (!token) {
        setNotifList([]);
        return;
      }

      const res = await axios.get(
        `${API_URL}/notifications/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const list = res.data.data || [];

      setNotifList(list);

      const hasUnread = list.some(
        (n: any) => !n.is_read
      );

      if (hasUnread) {
        await markAllAsRead(token);
      }
    } catch (err) {
      console.log(
        'Gagal fetch notifikasi:',
        err
      );

      setNotifList([]);
    } finally {
      setNotifLoading(false);
    }
  };

  const markAllAsRead = async (
    token: string
  ) => {
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
      console.log(
        'Gagal menandai notifikasi dibaca'
      );
    } finally {
      setMarkingRead(false);
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================

  const getImageUrl = (
    banner?: string
  ) => {
    if (!banner) return undefined;

    if (banner.startsWith('http')) {
      return banner;
    }

    return `${BASE_URL}${banner}`;
  };

  const formatDate = (
    date?: string
  ) =>
    date
      ? new Date(date).toLocaleDateString(
          'id-ID',
          {
            day: '2-digit',
            month: 'short',
          }
        )
      : '-';

  const formatNotifDate = (
    date?: string
  ) =>
    date
      ? new Date(date).toLocaleDateString(
          'id-ID',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }
        )
      : '-';

  // =====================================================
  // SEARCH
  // =====================================================

  const matchesQuery = (
    item: any,
    query: string
  ) => {
    const q = query
      .trim()
      .toLowerCase();

    if (!q) return true;

    const title =
      (item?.title || '').toLowerCase();

    const location =
      (item?.location || '').toLowerCase();

    const artist =
      (item?.artist || '').toLowerCase();

    return (
      title.includes(q) ||
      location.includes(q) ||
      artist.includes(q)
    );
  };

  const isSearching =
    searchQuery.trim().length > 0;

  const filteredConcerts =
    concerts.filter((item) =>
      matchesQuery(
        item,
        searchQuery
      )
    );

  const featuredMatches = featured
    ? matchesQuery(
        featured,
        searchQuery
      )
    : false;

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <View style={styles.loadingIcon}>
          <Ionicons
            name="ticket"
            size={28}
            color="#a855f7"
          />
        </View>

        <ActivityIndicator
          color="#a855f7"
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
          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <View style={styles.headerRow}>
            <View>
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-sharp"
                  size={13}
                  color="#a855f7"
                />

                <Text
                  style={styles.locationLabel}
                >
                  Lokasi Anda
                </Text>
              </View>

              <TouchableOpacity
                style={styles.locationValueRow}
                activeOpacity={0.7}
              >
                <Text
                  style={styles.locationValue}
                >
                  Bekasi, Indonesia
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={15}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            <View
              style={styles.headerIcons}
            >
              {/* NOTIFICATION */}
              <TouchableOpacity
                style={styles.bellButton}
                onPress={openNotifPopup}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="notifications-outline"
                  size={19}
                  color="#fff"
                />

                {unreadCount > 0 && (
                  <View
                    style={styles.badge}
                  >
                    <Text
                      style={
                        styles.badgeText
                      }
                    >
                      {unreadCount > 9
                        ? '9+'
                        : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* PROFILE */}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'Profile'
                  )
                }
                activeOpacity={0.8}
              >
                {profileAvatar ? (
                  <Image
                    source={{
                      uri: profileAvatar,
                    }}
                    style={styles.avatar}
                  />
                ) : (
                  <View
                    style={
                      styles.avatarPlaceholder
                    }
                  >
                    <Ionicons
                      name="person"
                      size={18}
                      color="#71717a"
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ================================================= */}
          {/* SEARCH */}
          {/* ================================================= */}

          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color="#a855f7"
              />

              <TextInput
                placeholder="Cari konser, artis, atau venue..."
                placeholderTextColor="#6b7280"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={
                  setSearchQuery
                }
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />

              {isSearching && (
                <TouchableOpacity
                  onPress={() =>
                    setSearchQuery('')
                  }
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
                    color="#6b7280"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ================================================= */}
          {/* FEATURED */}
          {/* ================================================= */}

          {!isSearching && (
            <>
              <View
                style={
                  styles.sectionHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Konser Pilihan
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Temukan konser yang sedang ramai
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      'Explore'
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={
                      styles.sectionLink
                    }
                  >
                    Lihat Semua
                  </Text>
                </TouchableOpacity>
              </View>

              {featured && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate(
                      'ConcertDetail',
                      {
                        id: featured.id,
                      }
                    )
                  }
                  style={
                    styles.featuredCard
                  }
                >
                  <Image
                    source={{
                      uri: getImageUrl(
                        featured.banner
                      ),
                    }}
                    style={
                      styles.featuredImage
                    }
                  />

                  <View
                    style={
                      styles.featuredOverlay
                    }
                  />

                  {/* TRENDING */}
                  {featured.tickets_sold >
                    0 && (
                    <View
                      style={
                        styles.trendingBadge
                      }
                    >
                      <Ionicons
                        name="flame"
                        size={12}
                        color="#fff"
                      />

                      <Text
                        style={
                          styles.trendingText
                        }
                      >
                        TRENDING
                      </Text>
                    </View>
                  )}

                  <View
                    style={
                      styles.featuredContent
                    }
                  >
                    <Text
                      style={
                        styles.featuredTitle
                      }
                      numberOfLines={2}
                    >
                      {featured.title}
                    </Text>

                    <View
                      style={
                        styles.featuredMetaRow
                      }
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={13}
                        color="#d1d5db"
                      />

                      <Text
                        style={
                          styles.featuredMeta
                        }
                        numberOfLines={1}
                      >
                        {formatDate(
                          featured.concert_date
                        )}{' '}
                        • {featured.location}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.featuredBottom
                      }
                    >
                      <Text
                        style={
                          styles.featuredPrice
                        }
                      >
                        Mulai IDR{' '}
                        {Number(
                          featured.lowest_price ||
                            0
                        ).toLocaleString(
                          'id-ID'
                        )}
                      </Text>

                      <View
                        style={
                          styles.featuredArrow
                        }
                      >
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="#fff"
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* ================================================= */}
          {/* SEARCH FEATURED RESULT */}
          {/* ================================================= */}

          {isSearching &&
            featuredMatches &&
            featured && (
              <View
                style={
                  styles.searchFeaturedWrapper
                }
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate(
                      'ConcertDetail',
                      {
                        id: featured.id,
                      }
                    )
                  }
                  style={
                    styles.popularCard
                  }
                >
                  <Image
                    source={{
                      uri: getImageUrl(
                        featured.banner
                      ),
                    }}
                    style={
                      styles.popularImage
                    }
                  />

                  <View
                    style={
                      styles.popularContent
                    }
                  >
                    <Text
                      style={
                        styles.popularTitle
                      }
                      numberOfLines={1}
                    >
                      {featured.title}
                    </Text>

                    <View
                      style={
                        styles.locationRow
                      }
                    >
                      <Ionicons
                        name="location-sharp"
                        size={11}
                        color="#9ca3af"
                      />

                      <Text
                        style={
                          styles.popularVenue
                        }
                        numberOfLines={1}
                      >
                        {featured.location}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.popularBottomRow
                      }
                    >
                      <Text
                        style={
                          styles.popularPrice
                        }
                      >
                        IDR{' '}
                        {Number(
                          featured.lowest_price ||
                            0
                        ).toLocaleString(
                          'id-ID'
                        )}
                      </Text>

                      <Text
                        style={
                          styles.soldText
                        }
                      >
                        {featured.tickets_sold ||
                          0}
                        /
                        {featured.total_quota ||
                          0}{' '}
                        terjual
                      </Text>
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color="#52525b"
                  />
                </TouchableOpacity>
              </View>
            )}

          {/* ================================================= */}
          {/* POPULAR / SEARCH RESULT */}
          {/* ================================================= */}

          <View
            style={styles.sectionHeader}
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                {isSearching
                  ? 'Hasil Pencarian'
                  : 'Terpopuler'}
              </Text>

              {!isSearching && (
                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Konser yang paling banyak diminati
                </Text>
              )}
            </View>

            {!isSearching && (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate(
                    'Explore'
                  )
                }
                activeOpacity={0.7}
              >
                <Text
                  style={
                    styles.sectionLink
                  }
                >
                  Lihat Semua
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={styles.popularList}
          >
            {filteredConcerts.length ===
              0 &&
            !(
              isSearching &&
              featuredMatches
            ) ? (
              <View
                style={
                  styles.emptyContainer
                }
              >
                <View
                  style={
                    styles.emptyIcon
                  }
                >
                  <Ionicons
                    name={
                      isSearching
                        ? 'search-outline'
                        : 'musical-notes-outline'
                    }
                    size={25}
                    color="#71717a"
                  />
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  {isSearching
                    ? 'Konser tidak ditemukan'
                    : 'Belum ada konser lain'}
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  {isSearching
                    ? `Tidak ada hasil untuk "${searchQuery}"`
                    : 'Konser lainnya akan muncul di sini.'}
                </Text>
              </View>
            ) : (
              filteredConcerts.map(
                (item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate(
                        'ConcertDetail',
                        {
                          id: item.id,
                        }
                      )
                    }
                    style={
                      styles.popularCard
                    }
                  >
                    <Image
                      source={{
                        uri: getImageUrl(
                          item.banner
                        ),
                      }}
                      style={
                        styles.popularImage
                      }
                    />

                    <View
                      style={
                        styles.popularContent
                      }
                    >
                      <Text
                        style={
                          styles.popularTitle
                        }
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>

                      <View
                        style={
                          styles.locationRow
                        }
                      >
                        <Ionicons
                          name="location-sharp"
                          size={11}
                          color="#9ca3af"
                        />

                        <Text
                          style={
                            styles.popularVenue
                          }
                          numberOfLines={1}
                        >
                          {item.location}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.popularBottomRow
                        }
                      >
                        <Text
                          style={
                            styles.popularPrice
                          }
                        >
                          IDR{' '}
                          {Number(
                            item.lowest_price ||
                              0
                          ).toLocaleString(
                            'id-ID'
                          )}
                        </Text>

                        <Text
                          style={
                            styles.soldText
                          }
                        >
                          {item.tickets_sold ||
                            0}
                          /
                          {item.total_quota ||
                            0}{' '}
                          terjual
                        </Text>
                      </View>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color="#52525b"
                    />
                  </TouchableOpacity>
                )
              )
            )}
          </View>

          {/* BOTTOM SPACE */}
          <View
            style={{ height: 110 }}
          />
        </ScrollView>
      </SafeAreaView>

      {/* ================================================= */}
      {/* BOTTOM NAVIGATION */}
      {/* ================================================= */}

      <View
        style={styles.bottomNav}
      >
        {/* HOME */}
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <View
            style={styles.activeNavIcon}
          >
            <Ionicons
              name="home"
              size={20}
              color="#a855f7"
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
          onPress={() =>
            navigation.navigate(
              'Explore'
            )
          }
          activeOpacity={0.7}
        >
          <View
            style={styles.navIcon}
          >
            <Ionicons
              name="compass-outline"
              size={21}
              color="#6b7280"
            />
          </View>

          <Text
            style={styles.navLabel}
          >
            Eksplor
          </Text>
        </TouchableOpacity>

        {/* MY TICKETS */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            navigation.navigate(
              'MyTickets'
            )
          }
          activeOpacity={0.7}
        >
          <View
            style={styles.navIcon}
          >
            <Ionicons
              name="ticket-outline"
              size={21}
              color="#6b7280"
            />
          </View>

          <Text
            style={styles.navLabel}
          >
            Tiket Saya
          </Text>
        </TouchableOpacity>

        {/* PROFILE */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            navigation.navigate(
              'Profile'
            )
          }
          activeOpacity={0.7}
        >
          <View
            style={styles.navIcon}
          >
            <Ionicons
              name="person-outline"
              size={21}
              color="#6b7280"
            />
          </View>

          <Text
            style={styles.navLabel}
          >
            Profil
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================================================= */}
      {/* NOTIFICATION MODAL */}
      {/* ================================================= */}

      <Modal
        visible={notifModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setNotifModalVisible(false)
        }
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() =>
            setNotifModalVisible(false)
          }
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.notifCard}
            onPress={() => {}}
          >
            {/* HANDLE */}
            <View
              style={styles.sheetHandle}
            />

            {/* HEADER */}
            <View
              style={styles.notifHeader}
            >
              <View>
                <Text
                  style={
                    styles.notifHeaderTitle
                  }
                >
                  Notifikasi
                </Text>

                {markingRead && (
                  <Text
                    style={
                      styles.notifHeaderSub
                    }
                  >
                    Menandai dibaca...
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={
                  styles.notifCloseBtn
                }
                onPress={() =>
                  setNotifModalVisible(
                    false
                  )
                }
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close"
                  size={19}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>

            {/* LOADING */}
            {notifLoading ? (
              <View
                style={
                  styles.notifLoadingBox
                }
              >
                <ActivityIndicator
                  color="#a855f7"
                />

                <Text
                  style={
                    styles.notifLoadingText
                  }
                >
                  Memuat notifikasi...
                </Text>
              </View>
            ) : notifList.length ===
              0 ? (
              /* EMPTY */
              <View
                style={
                  styles.notifEmptyBox
                }
              >
                <View
                  style={
                    styles.notifEmptyIconWrap
                  }
                >
                  <Ionicons
                    name="notifications-off-outline"
                    size={27}
                    color="#4b5563"
                  />
                </View>

                <Text
                  style={
                    styles.notifEmptyTitle
                  }
                >
                  Belum ada notifikasi
                </Text>

                <Text
                  style={
                    styles.notifEmptySub
                  }
                >
                  Kabar terbaru soal konser
                  kamu bakal muncul di sini.
                </Text>
              </View>
            ) : (
              /* LIST */
              <FlatList
                data={notifList}
                keyExtractor={(item) =>
                  String(item.id)
                }
                style={{
                  maxHeight: 460,
                }}
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={{
                  paddingBottom: 4,
                }}
                renderItem={({
                  item,
                }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.notifItem,
                      !item.is_read &&
                        styles.notifItemUnread,
                    ]}
                    onPress={() => {
                      setNotifModalVisible(
                        false
                      );

                      if (
                        item.concert_id
                      ) {
                        navigation.navigate(
                          'ConcertDetail',
                          {
                            id: item.concert_id,
                          }
                        );
                      }
                    }}
                  >
                    {/* THUMBNAIL */}
                    {item.concert_banner ? (
                      <Image
                        source={{
                          uri: getImageUrl(
                            item.concert_banner
                          ),
                        }}
                        style={
                          styles.notifThumb
                        }
                      />
                    ) : (
                      <View
                        style={
                          styles.notifThumbPlaceholder
                        }
                      >
                        <Ionicons
                          name="musical-notes"
                          size={17}
                          color="#6b7280"
                        />
                      </View>
                    )}

                    <View
                      style={
                        styles.notifContent
                      }
                    >
                      {/* CONCERT BADGE */}
                      {item.concert_title && (
                        <View
                          style={
                            styles.concertBadge
                          }
                        >
                          <Ionicons
                            name="musical-note"
                            size={10}
                            color="#a855f7"
                          />

                          <Text
                            style={
                              styles.concertBadgeText
                            }
                            numberOfLines={1}
                          >
                            {
                              item.concert_title
                            }
                          </Text>
                        </View>
                      )}

                      {/* TITLE */}
                      <View
                        style={
                          styles.notifTitleRow
                        }
                      >
                        {!item.is_read && (
                          <View
                            style={
                              styles.notifDot
                            }
                          />
                        )}

                        <Text
                          style={
                            styles.notifTitle
                          }
                          numberOfLines={1}
                        >
                          {item.title ||
                            'Notifikasi'}
                        </Text>
                      </View>

                      {/* MESSAGE */}
                      <Text
                        style={
                          styles.notifMessage
                        }
                        numberOfLines={3}
                      >
                        {item.message}
                      </Text>

                      {/* DATE */}
                      <Text
                        style={
                          styles.notifDate
                        }
                      >
                        {formatNotifDate(
                          item.created_at
                        )}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#4b5563"
                    />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => (
                  <View
                    style={
                      styles.notifSeparator
                    }
                  />
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0b13',
  },

  safeArea: {
    flex: 1,
  },

  // =====================================================
  // LOADING
  // =====================================================

  loadingRoot: {
    flex: 1,
    backgroundColor: '#0b0b13',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor:
      'rgba(168,85,247,0.10)',
    borderWidth: 1,
    borderColor:
      'rgba(168,85,247,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingSpinner: {
    marginTop: 18,
  },

  loadingText: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 9,
  },

  // =====================================================
  // HEADER
  // =====================================================

  headerRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  locationLabel: {
    color: '#8b8b95',
    fontSize: 11,
    fontWeight: '500',
  },

  locationValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },

  locationValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#15151f',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0b0b13',
  },

  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor:
      'rgba(168,85,247,0.35)',
  },

  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#181820',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // =====================================================
  // SEARCH
  // =====================================================

  searchRow: {
    paddingHorizontal: 20,
    marginTop: 20,
  },

  searchBox: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15151f',
    borderRadius: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor:
      'rgba(168,85,247,0.10)',
  },

  searchInput: {
    flex: 1,
    color: '#ffffff',
    paddingVertical: 0,
    paddingHorizontal: 10,
    fontSize: 13,
  },

  // =====================================================
  // SECTION
  // =====================================================

  sectionHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 27,
    marginBottom: 13,
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  sectionSubtitle: {
    color: '#62626c',
    fontSize: 10,
    marginTop: 4,
  },

  sectionLink: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '700',
  },

  // =====================================================
  // FEATURED
  // =====================================================

  featuredCard: {
    marginHorizontal: 20,
    height: 225,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#181820',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.05)',
  },

  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  featuredOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor:
      'rgba(0,0,0,0.36)',
  },

  trendingBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor:
      'rgba(168,85,247,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  trendingText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  featuredContent: {
    position: 'absolute',
    left: 17,
    right: 15,
    bottom: 15,
  },

  featuredTitle: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  featuredMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },

  featuredMeta: {
    color: '#d1d5db',
    fontSize: 11,
    flex: 1,
  },

  featuredBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginTop: 9,
  },

  featuredPrice: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  featuredArrow: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor:
      'rgba(168,85,247,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // =====================================================
  // POPULAR
  // =====================================================

  searchFeaturedWrapper: {
    marginTop: 18,
  },

  popularList: {
    paddingHorizontal: 20,
    gap: 11,
  },

  popularCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#141420',
    borderRadius: 17,
    padding: 10,
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.04)',
  },

  popularImage: {
    width: 68,
    height: 68,
    borderRadius: 13,
    backgroundColor: '#1c1c28',
  },

  popularContent: {
    flex: 1,
    minWidth: 0,
  },

  popularTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  popularVenue: {
    color: '#858590',
    fontSize: 11,
    flex: 1,
  },

  popularBottomRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  popularPrice: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '800',
  },

  soldText: {
    color: '#5f5f6a',
    fontSize: 10,
  },

  // =====================================================
  // EMPTY
  // =====================================================

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#15151f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  emptyTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  emptyText: {
    color: '#64646e',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 17,
  },

  // =====================================================
  // BOTTOM NAV
  // =====================================================

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 82,
    flexDirection: 'row',
    justifyContent:
      'space-around',
    alignItems: 'flex-start',
    backgroundColor: '#101018',
    borderTopWidth: 1,
    borderTopColor:
      'rgba(255,255,255,0.05)',
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
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor:
      'rgba(168,85,247,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navLabel: {
    color: '#62626c',
    fontSize: 10,
    marginTop: 2,
  },

  navLabelActive: {
    color: '#a855f7',
    fontWeight: '800',
  },

  // =====================================================
  // NOTIFICATION MODAL
  // =====================================================

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.68)',
    justifyContent: 'flex-end',
  },

  notifCard: {
    backgroundColor: '#141420',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '82%',
    borderTopWidth: 1,
    borderColor:
      'rgba(168,85,247,0.10)',
  },

  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor:
      'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 15,
  },

  notifHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      'rgba(255,255,255,0.07)',
  },

  notifHeaderTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },

  notifHeaderSub: {
    color: '#a78bfa',
    fontSize: 10,
    marginTop: 3,
  },

  notifCloseBtn: {
    width: 33,
    height: 33,
    borderRadius: 17,
    backgroundColor: '#1c1c28',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notifLoadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  notifLoadingText: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 10,
  },

  notifEmptyBox: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
  },

  notifEmptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1c1c28',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  notifEmptyTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  notifEmptySub: {
    color: '#6b7280',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 17,
  },

  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
  },

  notifItemUnread: {
    backgroundColor:
      'rgba(168,85,247,0.08)',
  },

  notifThumb: {
    width: 47,
    height: 47,
    borderRadius: 12,
    backgroundColor: '#1c1c28',
  },

  notifThumbPlaceholder: {
    width: 47,
    height: 47,
    borderRadius: 12,
    backgroundColor: '#1c1c28',
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
    backgroundColor:
      'rgba(168,85,247,0.13)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 4,
    maxWidth: '100%',
  },

  concertBadgeText: {
    color: '#c4b5fd',
    fontSize: 9,
    fontWeight: '700',
  },

  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  notifDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#a855f7',
  },

  notifTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },

  notifMessage: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },

  notifDate: {
    color: '#62626c',
    fontSize: 9,
    marginTop: 4,
  },

  notifSeparator: {
    height: 1,
    backgroundColor:
      'rgba(255,255,255,0.04)',
  },
});