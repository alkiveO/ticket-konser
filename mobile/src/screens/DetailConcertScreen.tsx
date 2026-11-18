import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const BASE_URL =
  'http://localhost:3000';

const API_URL = `${BASE_URL}/api`;

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

const BADGE_STYLE: Record<
  string,
  {
    bg: string;
    text: string;
    icon: any;
  }
> = {
  PREMIUM: {
    bg: 'rgba(245,158,11,0.15)',
    text: '#fbbf24',
    icon: 'diamond',
  },
  TERLARIS: {
    bg: 'rgba(168,85,247,0.18)',
    text: '#c4b5fd',
    icon: 'flame',
  },
  REGULER: {
    bg: 'rgba(107,114,128,0.18)',
    text: '#9ca3af',
    icon: 'ticket',
  },
};

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

export default function DetailConcertScreen({
  navigation,
  route,
}: any) {
  const { id } = route.params;

  const [concert, setConcert] =
    useState<Concert | null>(null);

  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    fetchConcert();
  }, []);

  const fetchConcert = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/concerts/${id}`,
      );

      setConcert(res.data.data);
    } catch (err) {
      console.log('Fetch concert error:', err);
    } finally {
      setLoading(false);
    }
  };

  const imageUrl = (path?: string) => {
    if (!path) return undefined;

    if (path.startsWith('http')) {
      return path;
    }

    return `${BASE_URL}${path}`;
  };

  const artistPhotoUrl = (filename?: string) => {
    if (!filename) return undefined;

    if (filename.startsWith('http')) {
      return filename;
    }

    return `${BASE_URL}/uploads/artists/${filename}`;
  };

  const formatPrice = (price: number) => {
    return Number(price).toLocaleString('id-ID');
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString(
        'id-ID',
        {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      );
    } catch {
      return date;
    }
  };

  const formatDateShort = (date: string) => {
    try {
      return new Date(date).toLocaleDateString(
        'id-ID',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
      );
    } catch {
      return date;
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <View style={styles.loadingIcon}>
          <Ionicons
            name="ticket"
            size={28}
            color="#a855f7"
          />
        </View>

        <ActivityIndicator
          size="small"
          color="#a855f7"
          style={styles.loadingSpinner}
        />

        <Text style={styles.loadingText}>
          Memuat detail konser...
        </Text>
      </View>
    );
  }

  if (!concert) {
    return (
      <View style={styles.loading}>
        <View style={styles.errorIcon}>
          <Ionicons
            name="alert-circle-outline"
            size={30}
            color="#a855f7"
          />
        </View>

        <Text style={styles.errorTitle}>
          Konser tidak ditemukan
        </Text>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backHomeButton}
        >
          <Text style={styles.backHomeText}>
            Kembali
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cheapest =
    concert.ticket_categories.length > 0
      ? [...concert.ticket_categories].sort(
          (a, b) => a.price - b.price,
        )[0]
      : null;

  const availableTickets =
    concert.ticket_categories.reduce(
      (total, ticket) =>
        total + Number(ticket.remaining_quota || 0),
      0,
    );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================= */}
        {/* HERO */}
        {/* ================================================= */}

        <View style={styles.hero}>
          {concert.banner ? (
            <Image
              source={{
                uri: imageUrl(concert.banner),
              }}
              style={styles.banner}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#21113d', '#08080d']}
              style={styles.banner}
            />
          )}

          <LinearGradient
            colors={[
              'rgba(0,0,0,0.25)',
              'transparent',
              'rgba(5,5,10,0.55)',
              '#0a0a11',
            ]}
            locations={[0, 0.3, 0.68, 1]}
            style={styles.overlay}
          />

          {/* Header */}
          <SafeAreaView style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerButton}
              activeOpacity={0.75}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color="#ffffff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setFavorite(!favorite)
              }
              style={styles.headerButton}
              activeOpacity={0.75}
            >
              <Ionicons
                name={
                  favorite
                    ? 'heart'
                    : 'heart-outline'
                }
                size={21}
                color={
                  favorite
                    ? '#c084fc'
                    : '#ffffff'
                }
              />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.typeBadge}>
              <View style={styles.badgeDot} />

              <Text style={styles.typeBadgeText}>
                {concert.concert_type?.toUpperCase() ||
                  'CONCERT'}
              </Text>
            </View>

            <Text style={styles.title}>
              {concert.title}
            </Text>

            <View style={styles.heroLocation}>
              <View style={styles.locationIcon}>
                <Ionicons
                  name="location"
                  size={14}
                  color="#c4b5fd"
                />
              </View>

              <Text
                style={styles.locationText}
                numberOfLines={2}
              >
                {concert.location}
              </Text>
            </View>
          </View>
        </View>

        {/* ================================================= */}
        {/* QUICK INFO */}
        {/* ================================================= */}

        <View style={styles.quickInfo}>
          <View style={styles.quickCard}>
            <View style={styles.quickIcon}>
              <Ionicons
                name="calendar-outline"
                size={19}
                color="#a855f7"
              />
            </View>

            <Text style={styles.quickLabel}>
              Tanggal
            </Text>

            <Text
              style={styles.quickValue}
              numberOfLines={2}
            >
              {formatDateShort(
                concert.concert_date,
              )}
            </Text>
          </View>

          <View style={styles.quickCard}>
            <View style={styles.quickIcon}>
              <Ionicons
                name="time-outline"
                size={19}
                color="#a855f7"
              />
            </View>

            <Text style={styles.quickLabel}>
              Waktu
            </Text>

            <Text
              style={styles.quickValue}
              numberOfLines={1}
            >
              {concert.concert_time}
            </Text>
          </View>

          <View style={styles.quickCard}>
            <View style={styles.quickIcon}>
              <Ionicons
                name="ticket-outline"
                size={19}
                color="#a855f7"
              />
            </View>

            <Text style={styles.quickLabel}>
              Tersedia
            </Text>

            <Text
              style={styles.quickValue}
              numberOfLines={1}
            >
              {availableTickets}
            </Text>
          </View>
        </View>

        {/* ================================================= */}
        {/* DATE & LOCATION */}
        {/* ================================================= */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Detail Acara
          </Text>

          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="calendar"
                  size={19}
                  color="#a855f7"
                />
              </View>

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  Tanggal Acara
                </Text>

                <Text style={styles.detailValue}>
                  {formatDate(
                    concert.concert_date,
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="time"
                  size={19}
                  color="#a855f7"
                />
              </View>

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  Waktu
                </Text>

                <Text style={styles.detailValue}>
                  {concert.concert_time}
                </Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="location"
                  size={19}
                  color="#a855f7"
                />
              </View>

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>
                  Lokasi
                </Text>

                <Text style={styles.detailValue}>
                  {concert.location}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================================================= */}
        {/* ABOUT */}
        {/* ================================================= */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Tentang Konser
              </Text>

              <Text style={styles.sectionSubtitle}>
                Informasi acara
              </Text>
            </View>
          </View>

          <Text
            numberOfLines={
              expanded ? undefined : 4
            }
            style={styles.description}
          >
            {concert.description ||
              'Tidak ada deskripsi untuk konser ini.'}
          </Text>

          {concert.description &&
            concert.description.length > 180 && (
              <TouchableOpacity
                onPress={() =>
                  setExpanded(!expanded)
                }
                style={styles.readMoreButton}
                activeOpacity={0.7}
              >
                <Text style={styles.readMore}>
                  {expanded
                    ? 'Tampilkan lebih sedikit'
                    : 'Baca selengkapnya'}
                </Text>

                <Ionicons
                  name={
                    expanded
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={14}
                  color="#a855f7"
                />
              </TouchableOpacity>
            )}
        </View>

        {/* ================================================= */}
        {/* LINE UP */}
        {/* ================================================= */}

        {concert.artists.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Line Up
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Artists yang akan tampil
                </Text>
              </View>

              <View style={styles.artistCount}>
                <Text style={styles.artistCountText}>
                  {concert.artists.length}
                </Text>

                <Text style={styles.artistCountLabel}>
                  Artists
                </Text>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={
                styles.artistScroll
              }
            >
              {concert.artists.map((artist) => (
                <View
                  key={artist.id}
                  style={styles.artistCard}
                >
                  <View style={styles.artistImageWrap}>
                    {artist.photo ? (
                      <Image
                        source={{
                          uri: artistPhotoUrl(
                            artist.photo,
                          ),
                        }}
                        style={styles.artistImage}
                      />
                    ) : (
                      <LinearGradient
                        colors={[
                          '#4c1d95',
                          '#18181b',
                        ]}
                        style={styles.artistImage}
                      >
                        <Ionicons
                          name="person"
                          size={40}
                          color="#ffffff"
                        />
                      </LinearGradient>
                    )}

                    <LinearGradient
                      colors={[
                        'transparent',
                        'rgba(0,0,0,0.8)',
                      ]}
                      style={styles.artistOverlay}
                    />

                    <View style={styles.artistIcon}>
                      <Ionicons
                        name="musical-notes"
                        size={12}
                        color="#ffffff"
                      />
                    </View>
                  </View>

                  <Text
                    style={styles.artistName}
                    numberOfLines={1}
                  >
                    {artist.name}
                  </Text>

                  <Text
                    style={styles.artistGenre}
                    numberOfLines={1}
                  >
                    {artist.genre ||
                      'Music Artist'}
                  </Text>

                  {!!artist.description && (
                    <Text
                      style={styles.artistDescription}
                      numberOfLines={2}
                    >
                      {artist.description}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ================================================= */}
        {/* SEAT MAP */}
        {/* ================================================= */}

        {concert.seat_map ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Denah Lokasi
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Area dan posisi tempat konser
                </Text>
              </View>

              <View style={styles.mapIcon}>
                <Ionicons
                  name="map-outline"
                  size={17}
                  color="#a855f7"
                />
              </View>
            </View>

            <View style={styles.mapCard}>
              <Image
                source={{
                  uri: imageUrl(
                    concert.seat_map,
                  ),
                }}
                style={styles.seatMap}
                resizeMode="contain"
              />
            </View>
          </View>
        ) : null}

        {/* ================================================= */}
        {/* TICKETS */}
        {/* ================================================= */}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Pilihan Tiket
              </Text>

              <Text style={styles.sectionSubtitle}>
                Pilih tiket sesuai kebutuhanmu
              </Text>
            </View>
          </View>

          {concert.ticket_categories.length ===
          0 ? (
            <View style={styles.emptyTicket}>
              <Ionicons
                name="ticket-outline"
                size={32}
                color="#52525b"
              />

              <Text style={styles.emptyTicketText}>
                Tiket belum tersedia
              </Text>
            </View>
          ) : (
            concert.ticket_categories.map(
              (ticket) => {
                const badgeLabel = getBadgeLabel(
                  ticket,
                  concert.ticket_categories,
                );

                const badgeStyle =
                  BADGE_STYLE[badgeLabel];

                const soldOut =
                  ticket.remaining_quota <= 0;

                const almostSoldOut =
                  ticket.remaining_quota > 0 &&
                  ticket.remaining_quota <= 10;

                return (
                  <View
                    key={ticket.id}
                    style={[
                      styles.ticketCard,
                      soldOut &&
                        styles.ticketCardSoldOut,
                    ]}
                  >
                    {/* Ticket Left */}
                    <View
                      style={
                        styles.ticketLeft
                      }
                    >
                      <View
                        style={[
                          styles.miniBadge,
                          {
                            backgroundColor:
                              badgeStyle.bg,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            badgeStyle.icon
                          }
                          size={11}
                          color={
                            badgeStyle.text
                          }
                        />

                        <Text
                          style={[
                            styles.miniBadgeText,
                            {
                              color:
                                badgeStyle.text,
                            },
                          ]}
                        >
                          {badgeLabel}
                        </Text>
                      </View>

                      <Text
                        style={styles.ticketName}
                      >
                        {ticket.name}
                      </Text>

                      <View
                        style={
                          styles.ticketStockRow
                        }
                      >
                        <Ionicons
                          name="ticket-outline"
                          size={13}
                          color={
                            soldOut
                              ? '#71717a'
                              : almostSoldOut
                              ? '#fbbf24'
                              : '#8b5cf6'
                          }
                        />

                        <Text
                          style={[
                            styles.ticketStock,
                            soldOut &&
                              styles.soldOutText,
                            almostSoldOut &&
                              styles.almostSoldText,
                          ]}
                        >
                          {soldOut
                            ? 'Tiket habis'
                            : almostSoldOut
                            ? `Tersisa ${ticket.remaining_quota} tiket`
                            : `Tersisa ${ticket.remaining_quota} tiket`}
                        </Text>
                      </View>

                      <Text
                        style={styles.ticketSold}
                      >
                        {ticket.tickets_sold}{' '}
                        tiket terjual
                      </Text>
                    </View>

                    {/* Ticket Right */}
                    <View
                      style={
                        styles.ticketRight
                      }
                    >
                      <Text
                        style={styles.ticketPriceLabel}
                      >
                        Mulai dari
                      </Text>

                      <Text
                        style={styles.ticketPrice}
                      >
                        Rp{' '}
                        {formatPrice(
                          ticket.price,
                        )}
                      </Text>

                      <TouchableOpacity
                        disabled={soldOut}
                        activeOpacity={0.8}
                        onPress={() =>
                          navigation.navigate(
                            'SelectTicket',
                            {
                              concertId:
                                concert.id,
                              ticketCategoryId:
                                ticket.id,
                            },
                          )
                        }
                      >
                        <LinearGradient
                          colors={
                            soldOut
                              ? [
                                  '#29292f',
                                  '#29292f',
                                ]
                              : [
                                  '#a855f7',
                                  '#7c3aed',
                                ]
                          }
                          start={{
                            x: 0,
                            y: 0,
                          }}
                          end={{
                            x: 1,
                            y: 0,
                          }}
                          style={
                            styles.chooseButton
                          }
                        >
                          <Text
                            style={
                              styles.chooseText
                            }
                          >
                            {soldOut
                              ? 'Habis'
                              : 'Pilih'}
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
                );
              },
            )
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 125 }} />
      </ScrollView>

      {/* ================================================= */}
      {/* BOTTOM BOOKING BAR */}
      {/* ================================================= */}

      <LinearGradient
        colors={[
          'rgba(15,15,24,0.96)',
          '#09090f',
        ]}
        style={styles.bottomBar}
      >
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomLabel}>
            Harga mulai dari
          </Text>

          <View style={styles.bottomPriceRow}>
            <Text style={styles.bottomCurrency}>
              Rp
            </Text>

            <Text style={styles.bottomPrice}>
              {cheapest
                ? formatPrice(
                    cheapest.price,
                  )
                : '-'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={
            concert.ticket_categories.length ===
            0
          }
          onPress={() =>
            navigation.navigate(
              'SelectTicket',
              {
                concertId: concert.id,
              },
            )
          }
        >
          <LinearGradient
            colors={
              concert.ticket_categories.length ===
              0
                ? ['#33333d', '#33333d']
                : ['#a855f7', '#7c3aed']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookButton}
          >
            <Ionicons
              name="ticket-outline"
              size={18}
              color="#ffffff"
            />

            <Text style={styles.bookText}>
              Pesan Tiket
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ========================================= */
  /* BASE */
  /* ========================================= */

  container: {
    flex: 1,
    backgroundColor: '#0a0a11',
  },

  scrollContent: {
    paddingBottom: 20,
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a11',
    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor:
      'rgba(168,85,247,0.12)',
    borderWidth: 1,
    borderColor:
      'rgba(168,85,247,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingSpinner: {
    marginTop: 20,
  },

  loadingText: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 10,
  },

  errorIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor:
      'rgba(168,85,247,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  errorTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },

  backHomeButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
  },

  backHomeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* ========================================= */
  /* HERO */
  /* ========================================= */

  hero: {
    height: 410,
    position: 'relative',
  },

  banner: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },

  overlay: {
    ...StyleSheet.absoluteFill,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor:
      'rgba(0,0,0,0.42)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
  },

  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor:
      'rgba(124,58,237,0.82)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.12)',
    marginBottom: 12,
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

  title: {
    color: '#ffffff',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -0.7,
  },

  heroLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  locationIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor:
      'rgba(168,85,247,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },

  locationText: {
    color: '#d4d4d8',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },

  /* ========================================= */
  /* QUICK INFO */
  /* ========================================= */

  quickInfo: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -25,
    zIndex: 5,
  },

  quickCard: {
    flex: 1,
    minHeight: 116,
    backgroundColor: '#14141d',
    borderRadius: 17,
    marginHorizontal: 4,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.055)',
  },

  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor:
      'rgba(168,85,247,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickLabel: {
    color: '#71717a',
    fontSize: 10,
    marginTop: 8,
  },

  quickValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  /* ========================================= */
  /* SECTIONS */
  /* ========================================= */

  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },

  sectionTitle: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  sectionSubtitle: {
    color: '#62626c',
    fontSize: 11,
    marginTop: 4,
  },

  /* ========================================= */
  /* DETAIL CARD */
  /* ========================================= */

  detailCard: {
    backgroundColor: '#111118',
    borderRadius: 19,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.055)',
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },

  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor:
      'rgba(168,85,247,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  detailContent: {
    flex: 1,
  },

  detailLabel: {
    color: '#666671',
    fontSize: 11,
    marginBottom: 4,
  },

  detailValue: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },

  detailDivider: {
    height: 1,
    backgroundColor:
      'rgba(255,255,255,0.05)',
    marginLeft: 53,
  },

  /* ========================================= */
  /* DESCRIPTION */
  /* ========================================= */

  description: {
    color: '#9696a1',
    fontSize: 14,
    lineHeight: 23,
  },

  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 11,
  },

  readMore: {
    color: '#a855f7',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 5,
  },

  /* ========================================= */
  /* ARTISTS */
  /* ========================================= */

  artistCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      'rgba(168,85,247,0.09)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  artistCountText: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: '800',
    marginRight: 4,
  },

  artistCountLabel: {
    color: '#71717a',
    fontSize: 10,
  },

  artistScroll: {
    paddingRight: 20,
  },

  artistCard: {
    width: 145,
    marginRight: 14,
  },

  artistImageWrap: {
    width: 145,
    height: 175,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#18181f',
    position: 'relative',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.06)',
  },

  artistImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  artistOverlay: {
    ...StyleSheet.absoluteFill,
  },

  artistIcon: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor:
      'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  artistName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 9,
  },

  artistGenre: {
    color: '#a855f7',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },

  artistDescription: {
    color: '#64646e',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  /* ========================================= */
  /* MAP */
  /* ========================================= */

  mapIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor:
      'rgba(168,85,247,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  mapCard: {
    height: 240,
    borderRadius: 19,
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.055)',
    overflow: 'hidden',
    justifyContent: 'center',
  },

  seatMap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111118',
  },

  /* ========================================= */
  /* TICKETS */
  /* ========================================= */

  ticketCard: {
    backgroundColor: '#14141d',
    borderRadius: 19,
    padding: 17,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.055)',
  },

  ticketCardSoldOut: {
    opacity: 0.62,
  },

  ticketLeft: {
    flex: 1,
    paddingRight: 10,
  },

  ticketRight: {
    alignItems: 'flex-end',
    minWidth: 118,
  },

  miniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    marginBottom: 9,
  },

  miniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 4,
    letterSpacing: 0.4,
  },

  ticketName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },

  ticketStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },

  ticketStock: {
    color: '#8b8b95',
    fontSize: 11,
    marginLeft: 5,
  },

  almostSoldText: {
    color: '#fbbf24',
  },

  soldOutText: {
    color: '#71717a',
  },

  ticketSold: {
    color: '#55555f',
    fontSize: 10,
    marginTop: 4,
  },

  ticketPriceLabel: {
    color: '#60606b',
    fontSize: 9,
    marginBottom: 2,
  },

  ticketPrice: {
    color: '#c4b5fd',
    fontSize: 16,
    fontWeight: '800',
  },

  chooseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    marginTop: 9,
  },

  chooseText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    marginRight: 4,
  },

  emptyTicket: {
    minHeight: 150,
    borderRadius: 19,
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.055)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyTicketText: {
    color: '#71717a',
    fontSize: 13,
    marginTop: 10,
  },

  /* ========================================= */
  /* BOTTOM BAR */
  /* ========================================= */

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 94,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor:
      'rgba(255,255,255,0.07)',
  },

  bottomInfo: {
    flex: 1,
  },

  bottomLabel: {
    color: '#62626c',
    fontSize: 10,
  },

  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },

  bottomCurrency: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },

  bottomPrice: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '800',
  },

  bookButton: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 6,
  },

  bookText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 7,
  },
});

