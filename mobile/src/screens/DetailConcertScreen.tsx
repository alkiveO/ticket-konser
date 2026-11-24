import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  StatusBar,
  Share,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, themes } from '../context/ThemeContext';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

const HERO_HEIGHT = 440;

const PURPLE = '#a855f7';
const PURPLE_DARK = '#7c3aed';

interface Artist {
  id: number;
  name: string;
  photo: string;
  description: string;
  genre: string;
}

interface TicketCategory {
  id: number;
  name: string;
  price: number;
  quota: number;
  remaining_quota: number;
  tickets_sold: number;
}

interface Concert {
  id: number;
  title: string;
  description: string;
  banner: string;
  seat_map: string;
  location: string;
  concert_date: string;
  concert_time: string;
  concert_type: string;
  artists: Artist[];
  ticket_categories: TicketCategory[];
}

const getBadgeStyles = (isDark: boolean) =>
  ({
    PREMIUM: {
      bg: isDark ? 'rgba(245,158,11,0.16)' : 'rgba(245,158,11,0.18)',
      text: isDark ? '#fbbf24' : '#b45309',
      icon: 'diamond',
      accent: ['#fbbf24', '#f59e0b'] as [string, string],
    },
    TERLARIS: {
      bg: isDark ? 'rgba(168,85,247,0.18)' : 'rgba(168,85,247,0.14)',
      text: isDark ? '#c4b5fd' : '#6d28d9',
      icon: 'flame',
      accent: ['#c084fc', '#7c3aed'] as [string, string],
    },
    REGULER: {
      bg: isDark ? 'rgba(107,114,128,0.2)' : 'rgba(107,114,128,0.14)',
      text: isDark ? '#9ca3af' : '#4b5563',
      icon: 'ticket',
      accent: ['#9ca3af', '#6b7280'] as [string, string],
    },
  } as Record<
    string,
    { bg: string; text: string; icon: any; accent: [string, string] }
  >);

const getBadgeLabel = (
  ticket: TicketCategory,
  allTickets: TicketCategory[],
) => {
  const highestPrice = Math.max(
    ...allTickets.map((item) => Number(item.price)),
  );

  // Harga paling mahal mendapatkan badge PREMIUM.
  if (Number(ticket.price) === highestPrice) {
    return 'PREMIUM';
  }

  // Badge TERLARIS ditentukan dari penjualan tertinggi
  // di antara kategori selain PREMIUM.
  const otherTickets = allTickets.filter(
    (item) => Number(item.price) !== highestPrice,
  );

  const highestSold = Math.max(
    ...otherTickets.map((item) => Number(item.tickets_sold || 0)),
  );

  if (
    Number(ticket.tickets_sold || 0) === highestSold &&
    highestSold > 0
  ) {
    return 'TERLARIS';
  }

  return 'REGULER';
};

// Parse tanggal sebagai tanggal lokal (YYYY-MM-DD tidak digeser UTC)
const parseDate = (value?: string) => {
  if (!value) return null;
  const str = String(value).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function DetailConcertScreen({ navigation, route }: any) {
  const { id } = route.params;
  const { colors } = useTheme();
  const isDark = colors.statusBar === 'light';
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const styles = createStyles(colors, isDark, insets);
  const BADGES = getBadgeStyles(isDark);

  const [concert, setConcert] = useState<Concert | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchConcert();
  }, [id]);

  const fetchConcert = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/concerts/${id}`);
      setConcert(res.data.data);
    } catch (err) {
      console.log('Fetch concert error:', err);
    } finally {
      setLoading(false);
    }
  };

  const imageUrl = (path?: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}${path}`;
  };

  const artistPhotoUrl = (filename?: string) => {
    if (!filename) return undefined;
    if (filename.startsWith('http')) return filename;
    return `${BASE_URL}/uploads/artists/${filename}`;
  };

  const formatPrice = (price: number) =>
    Number(price).toLocaleString('id-ID');

  const formatDate = (date: string) => {
    const d = parseDate(date);
    if (!d) return date;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDay = (date: string) => {
    const d = parseDate(date);
    return d ? d.toLocaleDateString('id-ID', { day: '2-digit' }) : '--';
  };

  const getMonth = (date: string) => {
    const d = parseDate(date);
    return d
      ? d.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase()
      : '';
  };

  const getYear = (date: string) => {
    const d = parseDate(date);
    return d ? String(d.getFullYear()) : '';
  };

  const handleShare = async () => {
    if (!concert) return;
    try {
      await Share.share({
        message: `${concert.title}\n${formatDate(concert.concert_date)} • ${concert.concert_time}\n${concert.location}`,
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <View style={styles.loading}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <LinearGradient
          colors={['rgba(168,85,247,0.25)', 'rgba(124,58,237,0.08)']}
          style={styles.loadingIcon}
        >
          <Ionicons name="ticket" size={30} color={PURPLE} />
        </LinearGradient>
        <ActivityIndicator
          size="small"
          color={PURPLE}
          style={styles.loadingSpinner}
        />
        <Text style={styles.loadingText}>Memuat detail konser...</Text>
      </View>
    );
  }

  /* ---------------- ERROR ---------------- */
  if (!concert) {
    return (
      <View style={styles.loading}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle-outline" size={32} color={PURPLE} />
        </View>
        <Text style={styles.errorTitle}>Konser tidak ditemukan</Text>
        <Text style={styles.errorSub}>
          Data konser mungkin sudah dihapus atau koneksi bermasalah.
        </Text>

        <View style={{ flexDirection: 'row', marginTop: 20 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.ghostButton}
          >
            <Text style={styles.ghostButtonText}>Kembali</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={fetchConcert} style={styles.backHomeButton}>
            <Text style={styles.backHomeText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const cheapest =
    concert.ticket_categories.length > 0
      ? [...concert.ticket_categories].sort((a, b) => a.price - b.price)[0]
      : null;

  const availableTickets = concert.ticket_categories.reduce(
    (total, ticket) => total + Number(ticket.remaining_quota || 0),
    0,
  );

  const totalSold = concert.ticket_categories.reduce(
    (total, ticket) => total + Number(ticket.tickets_sold || 0),
    0,
  );

  const totalCapacity = totalSold + availableTickets;
  const overallProgress =
    totalCapacity > 0 ? Math.min(totalSold / totalCapacity, 1) : 0;

  const noTickets = concert.ticket_categories.length === 0;

  // genre unik dari line up untuk chip di hero
  const genres = Array.from(
    new Set(
      concert.artists
        .map((a) => String(a.genre || '').trim())
        .filter(Boolean),
    ),
  ).slice(0, 3);

  /* ---------------- ANIMATIONS ---------------- */
  const bannerTranslate = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.35],
    extrapolate: 'clamp',
  });

  const bannerScale = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0],
    outputRange: [2, 1],
    extrapolate: 'clamp',
  });

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 200, HERO_HEIGHT - 120],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const heroContentOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const stubWidth = width * 0.62;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ================= FLOATING HEADER ================= */}
      <View style={styles.headerWrap} pointerEvents="box-none">
        <Animated.View
          style={[styles.headerBg, { opacity: headerBgOpacity }]}
          pointerEvents="none"
        />

        <View style={styles.headerRow} pointerEvents="box-none">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>

          <Animated.Text
            numberOfLines={1}
            style={[styles.headerTitle, { opacity: headerBgOpacity }]}
          >
            {concert.title}
          </Animated.Text>

          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={handleShare}
              style={[styles.headerButton, { marginRight: 8 }]}
              activeOpacity={0.75}
            >
              <Ionicons name="share-outline" size={20} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFavorite(!favorite)}
              style={styles.headerButton}
              activeOpacity={0.75}
            >
              <Ionicons
                name={favorite ? 'heart' : 'heart-outline'}
                size={20}
                color={favorite ? '#f472b6' : '#ffffff'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        {/* ================= HERO ================= */}
        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.bannerWrap,
              {
                transform: [
                  { translateY: bannerTranslate },
                  { scale: bannerScale },
                ],
              },
            ]}
          >
            {concert.banner ? (
              <Image
                source={{ uri: imageUrl(concert.banner) }}
                style={styles.banner}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#3b1a78', '#150a2e', '#08080d']}
                style={styles.banner}
              />
            )}
          </Animated.View>

          <LinearGradient
            colors={[
              'rgba(0,0,0,0.5)',
              'transparent',
              'rgba(5,5,10,0.55)',
              colors.background,
            ]}
            locations={[0, 0.26, 0.68, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <Animated.View
            style={[styles.heroContent, { opacity: heroContentOpacity }]}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.typeBadge}>
                <View style={styles.badgeDot} />
                <Text style={styles.typeBadgeText}>
                  {concert.concert_type?.toUpperCase() || 'CONCERT'}
                </Text>
              </View>

              {genres.map((g) => (
                <View key={g} style={styles.genreChip}>
                  <Text style={styles.genreChipText}>{g.toUpperCase()}</Text>
                </View>
              ))}

              {availableTickets > 0 && availableTickets <= 50 && (
                <View style={styles.hotBadge}>
                  <Ionicons name="flame" size={11} color="#fbbf24" />
                  <Text style={styles.hotBadgeText}>Hampir habis</Text>
                </View>
              )}
            </View>

            <Text style={styles.title}>{concert.title}</Text>

            <View style={styles.heroLocation}>
              <Ionicons name="location" size={14} color="#c4b5fd" />
              <Text style={styles.heroLocationText} numberOfLines={2}>
                {concert.location}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* ================= INFO CARD ================= */}
        <View style={styles.infoCard}>
          <View style={styles.infoTop}>
            <LinearGradient
              colors={[PURPLE, PURPLE_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dateBlock}
            >
              <Text style={styles.dateMonth}>
                {getMonth(concert.concert_date)}
              </Text>
              <Text style={styles.dateDay}>{getDay(concert.concert_date)}</Text>
              <Text style={styles.dateYear}>
                {getYear(concert.concert_date)}
              </Text>
            </LinearGradient>

            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Tanggal</Text>
              <Text style={styles.infoValue}>
                {formatDate(concert.concert_date)}
              </Text>

              <View style={styles.infoInline}>
                <Ionicons
                  name="time"
                  size={13}
                  color={isDark ? '#a78bfa' : PURPLE_DARK}
                />
                <Text style={styles.infoInlineText}>
                  {concert.concert_time}
                </Text>
              </View>

              <View style={styles.infoInline}>
                <Ionicons
                  name="location"
                  size={13}
                  color={isDark ? '#a78bfa' : PURPLE_DARK}
                />
                <Text style={styles.infoInlineText} numberOfLines={2}>
                  {concert.location}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{concert.artists.length}</Text>
              <Text style={styles.statLabel}>Artis</Text>
            </View>

            <View style={styles.statLine} />

            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {concert.ticket_categories.length}
              </Text>
              <Text style={styles.statLabel}>Kategori</Text>
            </View>

            <View style={styles.statLine} />

            <View style={styles.stat}>
              <Text style={styles.statValue}>{availableTickets}</Text>
              <Text style={styles.statLabel}>Tersedia</Text>
            </View>
          </View>

          {totalCapacity > 0 && (
            <View style={styles.overallWrap}>
              <View style={styles.overallTrack}>
                <LinearGradient
                  colors={[PURPLE, PURPLE_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.overallFill,
                    { width: `${overallProgress * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.overallText}>
                {totalSold} dari {totalCapacity} tiket terjual
              </Text>
            </View>
          )}
        </View>

        {/* ================= ABOUT ================= */}
        <View style={styles.section}>
          <SectionHeader
            styles={styles}
            title="Tentang Konser"
            subtitle="Informasi acara"
          />

          <View style={styles.aboutCard}>
            <Text
              numberOfLines={expanded ? undefined : 4}
              style={styles.description}
            >
              {concert.description || 'Tidak ada deskripsi untuk konser ini.'}
            </Text>

            {!!concert.description && concert.description.length > 180 && (
              <TouchableOpacity
                onPress={() => setExpanded(!expanded)}
                style={styles.readMoreButton}
                activeOpacity={0.7}
              >
                <Text style={styles.readMore}>
                  {expanded ? 'Tampilkan lebih sedikit' : 'Baca selengkapnya'}
                </Text>
                <Ionicons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={isDark ? PURPLE : PURPLE_DARK}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ================= LINE UP ================= */}
        {concert.artists.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              styles={styles}
              title="Line Up"
              subtitle="Artis yang akan tampil"
              right={
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>
                    {concert.artists.length}
                  </Text>
                  <Text style={styles.countPillLabel}>Artis</Text>
                </View>
              }
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.artistScroll}
              style={{ marginHorizontal: -20 }}
              decelerationRate="fast"
              snapToInterval={174}
              snapToAlignment="start"
            >
              {concert.artists.map((artist) => (
                <View key={artist.id} style={styles.artistCard}>
                  {artist.photo ? (
                    <Image
                      source={{ uri: artistPhotoUrl(artist.photo) }}
                      style={styles.artistImage}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#4c1d95', '#18181b']}
                      style={styles.artistImage}
                    >
                      <Ionicons
                        name="person"
                        size={44}
                        color="rgba(255,255,255,0.8)"
                      />
                    </LinearGradient>
                  )}

                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.9)']}
                    locations={[0.35, 1]}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />

                  <View style={styles.artistIcon}>
                    <Ionicons name="musical-notes" size={12} color="#ffffff" />
                  </View>

                  <View style={styles.artistInfo}>
                    <View style={styles.artistGenrePill}>
                      <Text style={styles.artistGenre} numberOfLines={1}>
                        {artist.genre || 'Music Artist'}
                      </Text>
                    </View>

                    <Text style={styles.artistName} numberOfLines={1}>
                      {artist.name}
                    </Text>

                    {!!artist.description && (
                      <Text style={styles.artistDescription} numberOfLines={2}>
                        {artist.description}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ================= SEAT MAP ================= */}
        {concert.seat_map ? (
          <View style={styles.section}>
            <SectionHeader
              styles={styles}
              title="Denah Lokasi"
              subtitle="Ketuk untuk memperbesar"
              right={
                <View style={styles.mapIcon}>
                  <Ionicons
                    name="expand-outline"
                    size={17}
                    color={isDark ? PURPLE : PURPLE_DARK}
                  />
                </View>
              }
            />

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setMapVisible(true)}
              style={styles.mapCard}
            >
              <Image
                source={{ uri: imageUrl(concert.seat_map) }}
                style={styles.seatMap}
                resizeMode="contain"
              />

              <View style={styles.mapHint}>
                <Ionicons name="search" size={12} color="#ffffff" />
                <Text style={styles.mapHintText}>Perbesar</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ================= TICKETS ================= */}
        <View style={styles.section}>
          <SectionHeader
            styles={styles}
            title="Pilihan Tiket"
            subtitle="Pilih tiket sesuai kebutuhanmu"
          />

          {noTickets ? (
            <View style={styles.emptyTicket}>
              <Ionicons name="ticket-outline" size={34} color={colors.subText} />
              <Text style={styles.emptyTicketText}>Tiket belum tersedia</Text>
            </View>
          ) : (
            concert.ticket_categories.map((ticket) => {
              const badgeLabel = getBadgeLabel(ticket, concert.ticket_categories);
              const badgeStyle = BADGES[badgeLabel];

              const soldOut = ticket.remaining_quota <= 0;
              const almostSoldOut =
                ticket.remaining_quota > 0 && ticket.remaining_quota <= 10;

              const totalQuota =
                Number(ticket.quota) ||
                Number(ticket.tickets_sold || 0) +
                  Number(ticket.remaining_quota || 0);

              const progress =
                totalQuota > 0
                  ? Math.min(
                      Math.max(Number(ticket.tickets_sold || 0) / totalQuota, 0),
                      1,
                    )
                  : 0;

              const stockColor = soldOut
                ? colors.subText
                : almostSoldOut
                ? '#f59e0b'
                : PURPLE;

              return (
                <View
                  key={ticket.id}
                  style={[styles.ticketCard, soldOut && styles.ticketCardSoldOut]}
                >
                  <LinearGradient
                    colors={soldOut ? [colors.border, colors.border] : badgeStyle.accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ticketAccent}
                  />

                  <View style={styles.ticketBody}>
                    <View style={styles.ticketTop}>
                      <View
                        style={[styles.miniBadge, { backgroundColor: badgeStyle.bg }]}
                      >
                        <Ionicons
                          name={badgeStyle.icon}
                          size={11}
                          color={badgeStyle.text}
                        />
                        <Text
                          style={[styles.miniBadgeText, { color: badgeStyle.text }]}
                        >
                          {badgeLabel}
                        </Text>
                      </View>

                      <Text style={styles.ticketSold}>
                        {ticket.tickets_sold} terjual
                      </Text>
                    </View>

                    <Text style={styles.ticketName}>{ticket.name}</Text>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress * 100}%`,
                            backgroundColor: stockColor,
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.ticketStockRow}>
                      <Ionicons
                        name={soldOut ? 'close-circle' : 'ticket-outline'}
                        size={13}
                        color={stockColor}
                      />
                      <Text
                        style={[
                          styles.ticketStock,
                          almostSoldOut && styles.almostSoldText,
                        ]}
                      >
                        {soldOut
                          ? 'Tiket habis'
                          : almostSoldOut
                          ? `Tinggal ${ticket.remaining_quota} tiket lagi!`
                          : `Tersisa ${ticket.remaining_quota} tiket`}
                      </Text>
                    </View>

                    {/* garis sobekan */}
                    <View style={styles.tearRow}>
                      <View style={[styles.notch, styles.notchLeft]} />
                      <View style={styles.tearLine} />
                      <View style={[styles.notch, styles.notchRight]} />
                    </View>

                    <View style={styles.ticketBottom}>
                      <View>
                        <Text style={styles.ticketPriceLabel}>Harga / tiket</Text>
                        <Text style={styles.ticketPrice}>
                          Rp {formatPrice(ticket.price)}
                        </Text>
                      </View>

                      <TouchableOpacity
                        disabled={soldOut}
                        activeOpacity={0.8}
                        onPress={() =>
                          navigation.navigate('SelectTicket', {
                            concertId: concert.id,
                            ticketCategoryId: ticket.id,
                          })
                        }
                      >
                        <LinearGradient
                          colors={
                            soldOut
                              ? [colors.border, colors.border]
                              : [PURPLE, PURPLE_DARK]
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.chooseButton}
                        >
                          <Text
                            style={[
                              styles.chooseText,
                              soldOut && { color: colors.subText },
                            ]}
                          >
                            {soldOut ? 'Habis' : 'Pilih'}
                          </Text>
                          {!soldOut && (
                            <Ionicons
                              name="arrow-forward"
                              size={14}
                              color="#ffffff"
                            />
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 130 + insets.bottom }} />
      </Animated.ScrollView>

      {/* ================= BOTTOM BAR ================= */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomLabel}>Harga mulai dari</Text>

          <View style={styles.bottomPriceRow}>
            <Text style={styles.bottomCurrency}>Rp</Text>
            <Text style={styles.bottomPrice}>
              {cheapest ? formatPrice(cheapest.price) : '-'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={noTickets}
          onPress={() =>
            navigation.navigate('SelectTicket', { concertId: concert.id })
          }
        >
          <LinearGradient
            colors={noTickets ? [colors.border, colors.border] : [PURPLE, PURPLE_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.bookButton, !noTickets && styles.bookButtonActive]}
          >
            <Ionicons
              name="ticket-outline"
              size={18}
              color={noTickets ? colors.subText : '#ffffff'}
            />
            <Text style={[styles.bookText, noTickets && { color: colors.subText }]}>
              Pesan Tiket
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ================= MAP VIEWER ================= */}
      <Modal
        visible={mapVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMapVisible(false)}
      >
        <View style={styles.mapModal}>
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
            contentContainerStyle={styles.mapModalContent}
          >
            <Image
              source={{ uri: imageUrl(concert.seat_map) }}
              style={{ width, height: height * 0.7 }}
              resizeMode="contain"
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.mapClose, { top: insets.top + 12 }]}
            onPress={() => setMapVisible(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

/* ========================================= */
/* SMALL COMPONENTS */
/* ========================================= */

function SectionHeader({
  styles,
  title,
  subtitle,
  right,
}: {
  styles: any;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <View style={styles.sectionBar} />
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {right}
    </View>
  );
}

/* ========================================= */
/* STYLES */
/* ========================================= */

const createStyles = (
  colors: typeof themes.dark,
  isDark: boolean,
  insets: { top: number; bottom: number },
) => {
  const accentText = isDark ? '#c4b5fd' : PURPLE_DARK;
  const softBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    scrollContent: {
      paddingBottom: 20,
    },

    /* ---------- STATES ---------- */
    loading: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: 30,
    },
    loadingIcon: {
      width: 70,
      height: 70,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(168,85,247,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingSpinner: { marginTop: 22 },
    loadingText: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 10,
    },
    errorIcon: {
      width: 70,
      height: 70,
      borderRadius: 24,
      backgroundColor: 'rgba(168,85,247,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    errorTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    errorSub: {
      color: colors.subText,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 19,
    },
    backHomeButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: PURPLE_DARK,
    },
    backHomeText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
    ghostButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 10,
    },
    ghostButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },

    /* ---------- FLOATING HEADER ---------- */
    headerWrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
    },
    headerBg: {
      ...StyleSheet.absoluteFill,
      backgroundColor: isDark ? 'rgba(10,10,17,0.95)' : 'rgba(255,255,255,0.96)',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: insets.top + 6,
      paddingBottom: 10,
    },
    headerTitle: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
      marginHorizontal: 12,
    },
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    /* ---------- HERO ---------- */
    hero: {
      height: HERO_HEIGHT,
      position: 'relative',
      overflow: 'hidden',
    },
    bannerWrap: {
      ...StyleSheet.absoluteFill,
    },
    banner: {
      width: '100%',
      height: '100%',
    },
    heroContent: {
      position: 'absolute',
      left: 20,
      right: 20,
      bottom: 62,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: 'rgba(124,58,237,0.88)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
    },
    badgeDot: {
      width: 6,
      height: 6,
      borderRadius: 99,
      backgroundColor: '#ffffff',
      marginRight: 7,
    },
    typeBadgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    genreChip: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    genreChipText: {
      color: '#f5f3ff',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
    hotBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1,
      borderColor: 'rgba(251,191,36,0.4)',
    },
    hotBadgeText: {
      color: '#fbbf24',
      fontSize: 10,
      fontWeight: '800',
      marginLeft: 4,
    },
    title: {
      color: '#ffffff',
      fontSize: 33,
      lineHeight: 39,
      fontWeight: '900',
      letterSpacing: -0.9,
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    heroLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    heroLocationText: {
      color: '#e4e4e7',
      fontSize: 13,
      fontWeight: '600',
      flex: 1,
      lineHeight: 18,
    },

    /* ---------- INFO CARD ---------- */
    infoCard: {
      marginHorizontal: 20,
      marginTop: -38,
      padding: 18,
      borderRadius: 26,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 5,
      shadowColor: PURPLE_DARK,
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    infoTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    dateBlock: {
      width: 66,
      paddingVertical: 10,
      borderRadius: 18,
      alignItems: 'center',
    },
    dateMonth: {
      color: '#ede9fe',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    dateDay: {
      color: '#ffffff',
      fontSize: 26,
      fontWeight: '900',
      lineHeight: 30,
    },
    dateYear: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 9,
      fontWeight: '700',
    },
    infoLabel: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
    },
    infoValue: {
      color: colors.text,
      fontSize: 14.5,
      fontWeight: '800',
      marginTop: 2,
      lineHeight: 20,
    },
    infoInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    infoInlineText: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    infoDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stat: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '900',
    },
    statLabel: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 2,
    },
    statLine: {
      width: 1,
      height: 28,
      backgroundColor: colors.border,
    },
    overallWrap: {
      marginTop: 16,
    },
    overallTrack: {
      height: 6,
      borderRadius: 6,
      backgroundColor: softBg,
      overflow: 'hidden',
    },
    overallFill: {
      height: '100%',
      borderRadius: 6,
    },
    overallText: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 7,
      textAlign: 'center',
    },

    /* ---------- SECTIONS ---------- */
    section: {
      marginTop: 32,
      paddingHorizontal: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
    },
    sectionTitleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
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
      fontSize: 19,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    sectionSubtitle: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 3,
    },
    countPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(168,85,247,0.12)',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    countPillText: {
      color: accentText,
      fontSize: 12,
      fontWeight: '800',
      marginRight: 4,
    },
    countPillLabel: {
      color: colors.subText,
      fontSize: 10,
    },

    /* ---------- ABOUT ---------- */
    aboutCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    description: {
      color: colors.subText,
      fontSize: 14,
      lineHeight: 24,
    },
    readMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 12,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: 'rgba(168,85,247,0.12)',
    },
    readMore: {
      color: accentText,
      fontSize: 12,
      fontWeight: '700',
      marginRight: 5,
    },

    /* ---------- ARTISTS ---------- */
    artistScroll: {
      paddingHorizontal: 20,
    },
    artistCard: {
      width: 160,
      height: 220,
      borderRadius: 24,
      marginRight: 14,
      overflow: 'hidden',
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    artistImage: {
      ...StyleSheet.absoluteFill,
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    artistIcon: {
      position: 'absolute',
      right: 10,
      top: 10,
      width: 28,
      height: 28,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    artistInfo: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 12,
    },
    artistGenrePill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor: 'rgba(168,85,247,0.45)',
      marginBottom: 6,
    },
    artistGenre: {
      color: '#f3e8ff',
      fontSize: 10,
      fontWeight: '700',
    },
    artistName: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '800',
    },
    artistDescription: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: 10.5,
      lineHeight: 15,
      marginTop: 3,
    },

    /* ---------- MAP ---------- */
    mapIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: 'rgba(168,85,247,0.12)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    mapCard: {
      height: 250,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      justifyContent: 'center',
      padding: 6,
    },
    seatMap: {
      width: '100%',
      height: '100%',
      borderRadius: 16,
    },
    mapHint: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(0,0,0,0.6)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    mapHintText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: '800',
    },
    mapModal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.94)',
      justifyContent: 'center',
    },
    mapModalContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mapClose: {
      position: 'absolute',
      right: 16,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* ---------- TICKETS ---------- */
    ticketCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    ticketCardSoldOut: {
      opacity: 0.6,
    },
    ticketAccent: {
      height: 6,
      borderTopLeftRadius: 23,
      borderTopRightRadius: 23,
    },
    ticketBody: {
      padding: 16,
    },
    ticketTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    miniBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
    },
    miniBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      marginLeft: 4,
      letterSpacing: 0.5,
    },
    ticketSold: {
      color: colors.subText,
      fontSize: 10,
    },
    ticketName: {
      color: colors.text,
      fontSize: 19,
      fontWeight: '900',
      marginTop: 10,
      letterSpacing: -0.2,
    },
    progressTrack: {
      height: 5,
      borderRadius: 5,
      backgroundColor: softBg,
      marginTop: 12,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 5,
    },
    ticketStockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    ticketStock: {
      color: colors.subText,
      fontSize: 11,
      marginLeft: 5,
    },
    almostSoldText: {
      color: '#f59e0b',
      fontWeight: '700',
    },
    tearRow: {
      height: 22,
      marginHorizontal: -16,
      marginVertical: 12,
      justifyContent: 'center',
    },
    tearLine: {
      marginHorizontal: 22,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    notch: {
      position: 'absolute',
      top: 0,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notchLeft: { left: -12 },
    notchRight: { right: -12 },
    ticketBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    ticketPriceLabel: {
      color: colors.subText,
      fontSize: 10,
      marginBottom: 2,
    },
    ticketPrice: {
      color: isDark ? '#a78bfa' : PURPLE_DARK,
      fontSize: 19,
      fontWeight: '900',
    },
    chooseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 96,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 14,
      gap: 5,
    },
    chooseText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '800',
    },
    emptyTicket: {
      minHeight: 150,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyTicketText: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 10,
    },

    /* ---------- BOTTOM BAR ---------- */
    bottomBar: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: Math.max(insets.bottom, 12),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingLeft: 20,
      paddingRight: 12,
      borderRadius: 26,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.45 : 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    bottomInfo: { flex: 1 },
    bottomLabel: {
      color: colors.subText,
      fontSize: 10,
    },
    bottomPriceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginTop: 2,
    },
    bottomCurrency: {
      color: isDark ? '#a78bfa' : PURPLE_DARK,
      fontSize: 13,
      fontWeight: '700',
      marginRight: 4,
    },
    bottomPrice: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
    },
    bookButton: {
      height: 52,
      borderRadius: 18,
      paddingHorizontal: 22,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookButtonActive: {
      shadowColor: PURPLE,
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    bookText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '800',
      marginLeft: 8,
    },
  });
};