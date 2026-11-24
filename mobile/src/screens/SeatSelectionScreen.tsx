
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useTheme, themes } from "../context/ThemeContext";

const API_URL = "http://localhost:3000/api";
const API_BASE_URL = API_URL.replace(/\/api\/?$/, "");

const PURPLE = "#a855f7";
const PURPLE_DARK = "#7c3aed";
const ANDROID_TOP =
  Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

type SeatStatus = "available" | "locked" | "booked";

type Seat = {
  seat_id: number;
  seat_prefix_id?: number;
  code: string;
  status: SeatStatus;
  price: number;
};

type SeatMap = Record<string, Record<string, Seat[]>>;

type SeatLayout = {
  id: number;
  prefix: string;
  max_number: number;
  pos_x: number | string;
  pos_y: number | string;
  ticket_category_id: number;
  category_name: string;
};

type OrderItem = {
  id: number;
  ticket_category_id: number;
  ticket_category: string;
  seat_type: "seated" | "standing";
  quantity: number;
  price: number;
  subtotal: number;
};

type PrefixSize = {
  width: number;
  height: number;
};

export default function SeatSelectionScreen({ navigation, route }: any) {
  const { orderId, concertId } = route.params;
  const { colors } = useTheme();
  const isDark = colors.statusBar === "light";
  const styles = createStyles(colors, isDark);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [seatMap, setSeatMap] = useState<SeatMap>({});
  const [seatMapImage, setSeatMapImage] = useState<string | null>(null);
  const [seatLayout, setSeatLayout] = useState<SeatLayout[]>([]);

  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [activePrefix, setActivePrefix] = useState<Record<number, string>>({});
  const [imageRatio, setImageRatio] = useState(16 / 9);

  // Menyimpan ukuran setiap kotak prefix agar koordinatnya
  // dapat ditempatkan tepat di bagian tengah kotak.
  const [prefixSizes, setPrefixSizes] = useState<
    Record<number, PrefixSize>
  >({});

  useEffect(() => {
    loadData();
  }, []);

  const getImageUrl = (path: string | null) => {
    if (!path) return null;

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return `${API_BASE_URL}${normalizedPath}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");

      const [orderRes, seatRes] = await Promise.all([
        axios.get(`${API_URL}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/concerts/${concertId}/seats`),
      ]);

      const items: OrderItem[] = orderRes.data.data.items || [];
      const responseData = seatRes.data;

      setOrderItems(items);
      setSeatMap(responseData.data || {});
      setSeatLayout(responseData.layout || []);
      setSeatMapImage(getImageUrl(responseData.seat_map));
      setPrefixSizes({});

      const initialPrefixes: Record<number, string> = {};

      items
        .filter((item) => item.seat_type === "seated")
        .forEach((item) => {
          const categoryMap =
            responseData.data?.[item.ticket_category] || {};

          const prefixes = Object.keys(categoryMap).sort();

          const categoryLayout = (responseData.layout || [])
            .filter(
              (layout: SeatLayout) =>
                Number(layout.ticket_category_id) ===
                Number(item.ticket_category_id)
            )
            .sort((a: SeatLayout, b: SeatLayout) =>
              a.prefix.localeCompare(b.prefix)
            );

          if (categoryLayout.length > 0) {
            initialPrefixes[item.id] = categoryLayout[0].prefix;
          } else if (prefixes.length > 0) {
            initialPrefixes[item.id] = prefixes[0];
          }
        });

      setActivePrefix(initialPrefixes);
    } catch (err) {
      console.log("Load seat selection error:", err);
      Alert.alert("Error", "Gagal mengambil data kursi");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const seatedItems = useMemo(
    () => orderItems.filter((item) => item.seat_type === "seated"),
    [orderItems]
  );

  const toggleSeat = (item: OrderItem, seat: Seat) => {
    if (seat.status !== "available") return;

    setSelected((prev) => {
      const current = prev[item.id] || [];
      const isSelected = current.includes(seat.seat_id);

      if (isSelected) {
        return {
          ...prev,
          [item.id]: current.filter((id) => id !== seat.seat_id),
        };
      }

      if (current.length >= item.quantity) {
        return prev;
      }

      return {
        ...prev,
        [item.id]: [...current, seat.seat_id],
      };
    });
  };

  const selectPrefix = (itemId: number, prefix: string) => {
    setActivePrefix((prev) => ({
      ...prev,
      [itemId]: prefix,
    }));
  };

  const handlePrefixLayout = (
    layoutId: number,
    width: number,
    height: number
  ) => {
    setPrefixSizes((prev) => {
      const current = prev[layoutId];

      if (
        current &&
        current.width === width &&
        current.height === height
      ) {
        return prev;
      }

      return {
        ...prev,
        [layoutId]: { width, height },
      };
    });
  };

  const allComplete = useMemo(
    () =>
      seatedItems.length > 0 &&
      seatedItems.every(
        (item) => (selected[item.id]?.length || 0) === item.quantity
      ),
    [seatedItems, selected]
  );

  const totalNeeded = useMemo(
    () => seatedItems.reduce((sum, item) => sum + item.quantity, 0),
    [seatedItems]
  );

  const totalSelected = useMemo(
    () =>
      seatedItems.reduce(
        (sum, item) => sum + (selected[item.id]?.length || 0),
        0
      ),
    [seatedItems, selected]
  );

  const formatPrice = (price: number) =>
    Number(price || 0).toLocaleString("id-ID");

  const submit = async () => {
    if (!allComplete || submitting) return;

    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem("token");

      for (const item of seatedItems) {
        await axios.post(
          `${API_URL}/order-items/${item.id}/seats`,
          { seat_ids: selected[item.id] },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      navigation.navigate("Payment", { orderId });
    } catch (err: any) {
      Alert.alert(
        "Kursi tidak tersedia",
        err.response?.data?.message ||
          "Ada kursi yang sudah diambil orang lain, silakan pilih ulang"
      );

      setSelected({});
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={styles.loadingText}>Memuat denah kursi...</Text>
      </View>
    );
  }

  const disabledSubmit = !allComplete || submitting;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" color={colors.text} size={22} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Pilih Kursi</Text>
            <Text style={styles.subtitle}>
              Pilih area dan kursi sesuai tiket kamu
            </Text>
          </View>

          <View style={styles.headerCount}>
            <Ionicons name="ticket-outline" size={13} color={PURPLE} />
            <Text style={styles.headerCountText}>
              {totalSelected}/{totalNeeded}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {seatedItems.map((item) => {
            const categoryMap = seatMap[item.ticket_category] || {};
            const prefixes = Object.keys(categoryMap).sort();

            const categoryLayout = seatLayout
              .filter(
                (layout) =>
                  Number(layout.ticket_category_id) ===
                  Number(item.ticket_category_id)
              )
              .sort((a, b) => a.prefix.localeCompare(b.prefix));

            const selectedCount = selected[item.id]?.length || 0;
            const isDone = selectedCount === item.quantity;
            const currentPrefix =
              activePrefix[item.id] || prefixes[0] || "";

            const currentSeats = categoryMap[currentPrefix] || [];

            return (
              <View key={item.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleWrap}>
                    <View style={styles.sectionBar} />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.sectionTitle}>
                        {item.ticket_category}
                      </Text>
                      <Text style={styles.sectionPrice}>
                        Rp {formatPrice(item.price)} / kursi
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.countBadge,
                      isDone && styles.countBadgeDone,
                    ]}
                  >
                    {isDone && (
                      <Ionicons
                        name="checkmark-circle"
                        size={13}
                        color={styles.countTextDone.color}
                        style={{ marginRight: 4 }}
                      />
                    )}

                    <Text
                      style={[
                        styles.countText,
                        isDone && styles.countTextDone,
                      ]}
                    >
                      {selectedCount}/{item.quantity} dipilih
                    </Text>
                  </View>
                </View>

                <View style={styles.mapHeading}>
                  <Ionicons name="map-outline" size={17} color={PURPLE} />
                  <Text style={styles.mapHeadingText}>
                    Denah Lokasi Kursi
                  </Text>
                </View>

                {seatMapImage ? (
                  <View
                    style={[
                      styles.mapContainer,
                      { aspectRatio: imageRatio },
                    ]}
                  >
                    <Image
                      source={{ uri: seatMapImage }}
                      style={styles.mapImage}
                      resizeMode="stretch"
                      onLoad={() => {
                        setImageRatio(1.5);
                      }}
                      onError={() => {
                        console.log(
                          "Gagal memuat gambar denah:",
                          seatMapImage
                        );
                      }}
                    />

                    {categoryLayout.map((layout) => {
                      const isActive = currentPrefix === layout.prefix;

                      const left =
                        `${Number(layout.pos_x) || 0}%` as `${number}%`;

                      const top =
                        `${Number(layout.pos_y) || 0}%` as `${number}%`;

                      const prefixSize = prefixSizes[layout.id];

                      return (
                        <View
                          key={layout.id}
                          pointerEvents="box-none"
                          style={[
                            styles.mapPrefixPosition,
                            {
                              left,
                              top,
                              transform: [
                                {
                                  translateX:
                                    -(prefixSize?.width || 0) / 2,
                                },
                                {
                                  translateY:
                                    -(prefixSize?.height || 0) / 2,
                                },
                              ],
                            },
                          ]}
                        >
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() =>
                              selectPrefix(item.id, layout.prefix)
                            }
                            onLayout={(event) => {
                              const { width, height } =
                                event.nativeEvent.layout;

                              handlePrefixLayout(
                                layout.id,
                                width,
                                height
                              );
                            }}
                            style={[
                              styles.mapPrefix,
                              isActive && styles.mapPrefixActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.mapPrefixText,
                                isActive && styles.mapPrefixTextActive,
                              ]}
                            >
                              {layout.prefix}
                            </Text>

                            <Text
                              style={[
                                styles.mapPrefixCategory,
                                isActive && styles.mapPrefixTextActive,
                              ]}
                              numberOfLines={1}
                            >
                              {layout.category_name}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noMap}>
                    <Ionicons
                      name="image-outline"
                      size={32}
                      color={colors.subText}
                    />
                    <Text style={styles.noMapTitle}>
                      Denah belum tersedia
                    </Text>
                    <Text style={styles.noMapText}>
                      Admin belum mengunggah gambar denah untuk konser ini.
                    </Text>
                  </View>
                )}

                <View style={styles.areaHeading}>
                  <Text style={styles.areaTitle}>Pilih Area</Text>
                  <Text style={styles.areaSubtitle}>
                    Tekan area pada denah atau pilih di bawah
                  </Text>
                </View>

                {prefixes.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons
                      name="grid-outline"
                      size={26}
                      color={colors.subText}
                    />
                    <Text style={styles.emptyText}>
                      Belum ada kursi untuk kategori ini
                    </Text>
                  </View>
                ) : (
                  <View style={styles.areaList}>
                    {prefixes.map((prefix) => {
                      const isActive = currentPrefix === prefix;
                      const areaSeats = categoryMap[prefix] || [];

                      const availableCount = areaSeats.filter(
                        (seat) => seat.status === "available"
                      ).length;

                      return (
                        <TouchableOpacity
                          key={prefix}
                          activeOpacity={0.8}
                          onPress={() => selectPrefix(item.id, prefix)}
                          style={[
                            styles.areaButton,
                            isActive && styles.areaButtonActive,
                          ]}
                        >
                          <View
                            style={[
                              styles.areaLetter,
                              isActive && styles.areaLetterActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.areaLetterText,
                                isActive && styles.areaLetterTextActive,
                              ]}
                            >
                              {prefix}
                            </Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.areaButtonTitle,
                                isActive && styles.areaButtonTitleActive,
                              ]}
                            >
                              Area {prefix}
                            </Text>

                            <Text style={styles.areaButtonSubtitle}>
                              {availableCount} kursi tersedia
                            </Text>
                          </View>

                          {isActive ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={21}
                              color={PURPLE}
                            />
                          ) : (
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color={colors.subText}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {currentPrefix !== "" && (
                  <View style={styles.seatArea}>
                    <View style={styles.seatAreaHeader}>
                      <View>
                        <Text style={styles.seatAreaTitle}>
                          Kursi Area {currentPrefix}
                        </Text>
                        <Text style={styles.seatAreaSubtitle}>
                          Pilih {item.quantity} kursi untuk kategori ini
                        </Text>
                      </View>

                      <View style={styles.prefixBadge}>
                        <Text style={styles.prefixBadgeText}>
                          {currentPrefix}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.seatGrid}>
                      {currentSeats.map((seat) => {
                        const isSelected = (
                          selected[item.id] || []
                        ).includes(seat.seat_id);

                        const isFull = selectedCount >= item.quantity;

                        const isDisabled =
                          seat.status !== "available" ||
                          (isFull && !isSelected);

                        const seatStyles = [
                          styles.seat,
                          seat.status === "locked" && styles.seatLocked,
                          seat.status === "booked" && styles.seatBooked,
                          isSelected && styles.seatSelected,
                          isDisabled &&
                            !isSelected &&
                            styles.seatDisabled,
                        ];

                        return (
                          <TouchableOpacity
                            key={seat.seat_id}
                            disabled={isDisabled}
                            activeOpacity={0.75}
                            onPress={() => toggleSeat(item, seat)}
                            style={seatStyles}
                          >
                            {isSelected ? (
                              <LinearGradient
                                colors={[PURPLE, PURPLE_DARK]}
                                style={styles.seatGradient}
                              >
                                <Text style={styles.seatTextSelected}>
                                  {seat.code}
                                </Text>
                              </LinearGradient>
                            ) : seat.status === "booked" ? (
                              <Ionicons
                                name="close"
                                size={14}
                                color={styles.seatBookedIcon.color}
                              />
                            ) : seat.status === "locked" ? (
                              <Ionicons
                                name="lock-closed"
                                size={12}
                                color={styles.seatLockedIcon.color}
                              />
                            ) : (
                              <Text style={styles.seatText}>
                                {seat.code}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {currentSeats.length === 0 && (
                      <Text style={styles.emptyText}>
                        Belum ada kursi di area ini.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {seatedItems.length === 0 && (
            <View style={styles.emptyCard}>
              <Ionicons
                name="ticket-outline"
                size={32}
                color={colors.subText}
              />
              <Text style={styles.emptyText}>
                Tiket kamu tidak membutuhkan pemilihan kursi
              </Text>
            </View>
          )}

          {seatedItems.length > 0 && (
            <View style={styles.legendCard}>
              <Text style={styles.legendTitle}>Keterangan Kursi</Text>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, styles.legendAvailable]}
                  />
                  <Text style={styles.legendText}>Tersedia</Text>
                </View>

                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, styles.legendSelected]}
                  />
                  <Text style={styles.legendText}>Dipilih</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendLocked]} />
                  <Text style={styles.legendText}>Terkunci</Text>
                </View>

                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendBooked]} />
                  <Text style={styles.legendText}>Terisi</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        <LinearGradient
          colors={
            isDark
              ? ["rgba(11,11,19,0)", "#0b0b13"]
              : ["rgba(255,255,255,0)", colors.card]
          }
          style={styles.bottomBarWrap}
          pointerEvents="box-none"
        >
          <View style={styles.bottomBar}>
            <View style={styles.bottomInfo}>
              <Text style={styles.bottomLabel}>Kursi dipilih</Text>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomValue}>{totalSelected}</Text>
                <Text style={styles.bottomTotal}>/{totalNeeded}</Text>
              </View>
            </View>

            <TouchableOpacity
              disabled={disabledSubmit}
              onPress={submit}
              activeOpacity={0.85}
              style={{ flex: 1.6 }}
            >
              <LinearGradient
                colors={
                  disabledSubmit
                    ? [colors.border, colors.border]
                    : [PURPLE, PURPLE_DARK]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.lanjutBtn,
                  !disabledSubmit && styles.lanjutBtnActive,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.lanjutText,
                        disabledSubmit && {
                          color: colors.subText,
                        },
                      ]}
                    >
                      Lanjut ke Pembayaran
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={disabledSubmit ? colors.subText : "#ffffff"}
                      style={{ marginLeft: 6 }}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

/* ========================================= */
/* STYLES */
/* ========================================= */

const createStyles = (colors: typeof themes.dark, isDark: boolean) => {
  const seat = isDark
    ? {
        availableBg: "#1f1f28",
        availableBorder: "#33333d",
        availableText: "#9ca3af",
        lockedBg: "#3f2d0d",
        lockedBorder: "#78350f",
        lockedIcon: "#fbbf24",
        bookedBg: "#3f1414",
        bookedBorder: "#7f1d1d",
        bookedIcon: "#f87171",
      }
    : {
        availableBg: "#f4f4f8",
        availableBorder: "#d4d4dc",
        availableText: "#52525b",
        lockedBg: "#fef3c7",
        lockedBorder: "#fcd34d",
        lockedIcon: "#b45309",
        bookedBg: "#fee2e2",
        bookedBorder: "#fca5a5",
        bookedIcon: "#b91c1c",
      };

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    safe: {
      flex: 1,
      paddingTop: ANDROID_TOP,
    },

    loadingRoot: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },

    loadingText: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 12,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 18,
    },

    back: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },

    title: {
      color: colors.text,
      fontSize: 21,
      fontWeight: "800",
      letterSpacing: -0.3,
    },

    subtitle: {
      color: colors.subText,
      fontSize: 12,
      marginTop: 2,
    },

    headerCount: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(168,85,247,0.12)",
      borderRadius: 11,
      paddingHorizontal: 10,
      paddingVertical: 7,
      marginLeft: 10,
    },

    headerCountText: {
      color: PURPLE,
      fontSize: 12,
      fontWeight: "800",
      marginLeft: 5,
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },

    section: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },

    sectionTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      paddingRight: 8,
    },

    sectionBar: {
      width: 4,
      height: 32,
      borderRadius: 4,
      backgroundColor: PURPLE,
      marginRight: 11,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },

    sectionPrice: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 2,
    },

    countBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(0,0,0,0.05)",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    countBadgeDone: {
      backgroundColor: isDark
        ? "rgba(34,197,94,0.15)"
        : "rgba(34,197,94,0.14)",
    },

    countText: {
      color: colors.subText,
      fontSize: 11,
      fontWeight: "700",
    },

    countTextDone: {
      color: isDark ? "#4ade80" : "#15803d",
    },

    mapHeading: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },

    mapHeadingText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
      marginLeft: 7,
    },

    mapContainer: {
      width: "100%",
      backgroundColor: isDark ? "#171721" : "#f1f1f5",
      borderRadius: 14,
      overflow: "hidden",
      position: "relative",
      borderWidth: 1,
      borderColor: colors.border,
    },

    mapImage: {
      ...StyleSheet.absoluteFill,
      width: "100%",
      height: "100%",
    },

    // Wrapper untuk titik koordinat prefix.
    // Titik left/top menjadi titik tengah kotak.
    mapPrefixPosition: {
      position: "absolute",
    },

    // Kotak prefix tidak lagi menggunakan position absolute.
    // Posisi absolut diatur oleh mapPrefixPosition.
    mapPrefix: {
      minWidth: 42,
      maxWidth: 95,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 9,
      backgroundColor: "rgba(255,255,255,0.92)",
      borderWidth: 1.5,
      borderColor: PURPLE,
      elevation: 3,
    },

    mapPrefixActive: {
      backgroundColor: PURPLE_DARK,
      borderColor: "#ffffff",
      borderWidth: 2,
      elevation: 7,
    },

    mapPrefixText: {
      color: PURPLE_DARK,
      fontSize: 13,
      fontWeight: "900",
    },

    mapPrefixTextActive: {
      color: "#ffffff",
    },

    mapPrefixCategory: {
      color: "#52525b",
      fontSize: 8,
      fontWeight: "700",
      marginTop: 1,
      maxWidth: 78,
    },

    noMap: {
      width: "100%",
      minHeight: 170,
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      backgroundColor: isDark ? "#171721" : "#f7f7fa",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },

    noMapTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 10,
    },

    noMapText: {
      color: colors.subText,
      fontSize: 11,
      textAlign: "center",
      marginTop: 5,
    },

    areaHeading: {
      marginTop: 20,
      marginBottom: 12,
    },

    areaTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
    },

    areaSubtitle: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 3,
    },

    areaList: {
      gap: 9,
    },

    areaButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 11,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },

    areaButtonActive: {
      borderColor: PURPLE,
      backgroundColor: "rgba(168,85,247,0.09)",
    },

    areaLetter: {
      width: 37,
      height: 37,
      borderRadius: 11,
      backgroundColor: isDark ? "#292333" : "#f1e7ff",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    areaLetterActive: {
      backgroundColor: PURPLE_DARK,
    },

    areaLetterText: {
      color: PURPLE,
      fontSize: 14,
      fontWeight: "900",
    },

    areaLetterTextActive: {
      color: "#ffffff",
    },

    areaButtonTitle: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800",
    },

    areaButtonTitleActive: {
      color: PURPLE,
    },

    areaButtonSubtitle: {
      color: colors.subText,
      fontSize: 10,
      marginTop: 3,
    },

    seatArea: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    seatAreaHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },

    seatAreaTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
    },

    seatAreaSubtitle: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 3,
    },

    prefixBadge: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: "rgba(168,85,247,0.14)",
      justifyContent: "center",
      alignItems: "center",
    },

    prefixBadgeText: {
      color: PURPLE,
      fontSize: 14,
      fontWeight: "900",
    },

    seatGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    seat: {
      width: 46,
      height: 42,
      borderRadius: 11,
      backgroundColor: seat.availableBg,
      borderWidth: 1,
      borderColor: seat.availableBorder,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },

    seatGradient: {
      ...StyleSheet.absoluteFill,
      justifyContent: "center",
      alignItems: "center",
    },

    seatSelected: {
      borderColor: PURPLE,
      shadowColor: PURPLE,
      shadowOpacity: 0.45,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },

    seatLocked: {
      backgroundColor: seat.lockedBg,
      borderColor: seat.lockedBorder,
    },

    seatBooked: {
      backgroundColor: seat.bookedBg,
      borderColor: seat.bookedBorder,
    },

    seatDisabled: {
      opacity: 0.5,
    },

    seatText: {
      color: seat.availableText,
      fontSize: 11,
      fontWeight: "700",
    },

    seatTextSelected: {
      color: "#ffffff",
      fontSize: 11,
      fontWeight: "800",
    },

    seatLockedIcon: {
      color: seat.lockedIcon,
    },

    seatBookedIcon: {
      color: seat.bookedIcon,
    },

    emptyWrap: {
      alignItems: "center",
      paddingVertical: 14,
    },

    emptyCard: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      paddingVertical: 36,
      marginBottom: 16,
    },

    emptyText: {
      color: colors.subText,
      fontSize: 13,
      textAlign: "center",
      marginTop: 8,
    },

    legendCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },

    legendTitle: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 12,
    },

    legendRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
    },

    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    legendDot: {
      width: 14,
      height: 14,
      borderRadius: 5,
      borderWidth: 1,
    },

    legendAvailable: {
      backgroundColor: seat.availableBg,
      borderColor: seat.availableBorder,
    },

    legendSelected: {
      backgroundColor: PURPLE_DARK,
      borderColor: PURPLE,
    },

    legendLocked: {
      backgroundColor: seat.lockedBg,
      borderColor: seat.lockedBorder,
    },

    legendBooked: {
      backgroundColor: seat.bookedBg,
      borderColor: seat.bookedBorder,
    },

    legendText: {
      color: colors.subText,
      fontSize: 12,
    },

    bottomBarWrap: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingTop: 24,
    },

    bottomBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    bottomInfo: {
      flex: 1,
    },

    bottomLabel: {
      color: colors.subText,
      fontSize: 10,
    },

    bottomRow: {
      flexDirection: "row",
      alignItems: "baseline",
      marginTop: 2,
    },

    bottomValue: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "900",
    },

    bottomTotal: {
      color: colors.subText,
      fontSize: 14,
      fontWeight: "700",
    },

    lanjutBtn: {
      flexDirection: "row",
      borderRadius: 18,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
    },

    lanjutBtnActive: {
      shadowColor: PURPLE,
      shadowOpacity: 0.4,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },

    lanjutText: {
      color: "#ffffff",
      fontWeight: "800",
      fontSize: 14,
    },
  });
};
