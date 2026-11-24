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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useTheme, themes } from "../context/ThemeContext";

const API_URL = "http://localhost:3000/api";

const PURPLE = "#a855f7";
const PURPLE_DARK = "#7c3aed";
const ANDROID_TOP = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

type TicketCategory = {
  id: string | number;
  name: string;
  seat_type: "seated" | "standing";
  price: number;
  remaining_quota: number;
  badge?: string;
  benefits?: string[];
};

type SelectedTicket = {
  item: TicketCategory;
  qty: number;
};

type BadgeStyle = {
  bg: string;
  text: string;
  icon: any;
  accent: [string, string];
};

const getBadgeStyles = (isDark: boolean): Record<string, BadgeStyle> => ({
  PREMIUM: {
    bg: isDark ? "rgba(245,158,11,0.16)" : "rgba(245,158,11,0.18)",
    text: isDark ? "#fbbf24" : "#b45309",
    icon: "diamond",
    accent: ["#fbbf24", "#f59e0b"],
  },
  TERLARIS: {
    bg: isDark ? "rgba(168,85,247,0.18)" : "rgba(168,85,247,0.14)",
    text: isDark ? "#c4b5fd" : "#6d28d9",
    icon: "flame",
    accent: ["#c084fc", "#7c3aed"],
  },
  REGULER: {
    bg: isDark ? "rgba(107,114,128,0.2)" : "rgba(107,114,128,0.14)",
    text: isDark ? "#9ca3af" : "#4b5563",
    icon: "ticket",
    accent: ["#9ca3af", "#6b7280"],
  },
});

const getBadgeLabel = (item: TicketCategory, index: number) => {
  if (item.badge) return String(item.badge).toUpperCase();
  if (index === 0) return "PREMIUM";
  if (index === 1) return "TERLARIS";
  return "REGULER";
};

// String key biar gak ada mismatch number vs string
// antara item.id (dari API) dan ticketCategoryId (dari route.params)
const keyOf = (id: string | number) => String(id);

export default function OrderScreen({ navigation, route }: any) {
  const { concertId, ticketCategoryId } = route.params;
  const { colors } = useTheme();
  const isDark = colors.statusBar === "light";
  const styles = createStyles(colors, isDark);
  const BADGES = getBadgeStyles(isDark);

  const [concert, setConcert] = useState<any>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    getConcert();
  }, []);

  const getConcert = async () => {
    try {
      const res = await axios.get(`${API_URL}/concerts/${concertId}`);
      const data = res.data.data;
      setConcert(data);

      // Kalau dateng dari tombol "Pilih" di halaman detail (bawa
      // ticketCategoryId spesifik), langsung isi qty tiket itu jadi 1
      // biar harga yang muncul beneran punya tiket yang dipilih.
      if (ticketCategoryId) {
        const selected = data.ticket_categories.find(
          (t: TicketCategory) => keyOf(t.id) === keyOf(ticketCategoryId)
        );

        if (selected && selected.remaining_quota > 0) {
          setQuantities({ [keyOf(selected.id)]: 1 });
        }
      }
    } catch (err) {
      Alert.alert("Error", "Gagal mengambil data concert");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const decrease = (item: TicketCategory) => {
    setQuantities((prev) => {
      const key = keyOf(item.id);
      const current = prev[key] || 0;
      if (current <= 0) return prev;
      return { ...prev, [key]: current - 1 };
    });
  };

  const increase = (item: TicketCategory) => {
    setQuantities((prev) => {
      const key = keyOf(item.id);
      const current = prev[key] || 0;
      if (current >= item.remaining_quota) return prev;
      return { ...prev, [key]: current + 1 };
    });
  };

  const selectedItems = useMemo<SelectedTicket[]>(() => {
    if (!concert) return [];
    return concert.ticket_categories
      .map((item: TicketCategory) => ({
        item,
        qty: quantities[keyOf(item.id)] || 0,
      }))
      .filter(({ qty }: SelectedTicket) => qty > 0);
  }, [concert, quantities]);

  const totalTickets = useMemo(
    () => selectedItems.reduce((sum: number, { qty }: SelectedTicket) => sum + qty, 0),
    [selectedItems]
  );

  const totalPrice = useMemo(
    () =>
      selectedItems.reduce(
        (sum: number, { item, qty }: SelectedTicket) => sum + item.price * qty,
        0
      ),
    [selectedItems]
  );

  const formatPrice = (price: number) => Number(price).toLocaleString("id-ID");

  const checkout = async () => {
    if (totalTickets === 0) return;

    try {
      setCheckoutLoading(true);

      const token = await AsyncStorage.getItem("token");

      const res = await axios.post(
        `${API_URL}/orders`,
        {
          items: selectedItems.map(({ item, qty }: SelectedTicket) => ({
            ticket_category_id: item.id,
            quantity: qty,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const orderId = res.data.data?.id ?? res.data.id;

      // Cek dulu: ada tiket yang butuh pilih kursi (seated)?
      // Kalau semua yang dibeli tipe standing, skip halaman pilih kursi.
      const needsSeatSelection = selectedItems.some(
        ({ item }: SelectedTicket) => item.seat_type === "seated"
      );

      if (needsSeatSelection) {
        navigation.navigate("SeatSelection", { orderId, concertId });
      } else {
        navigation.navigate("Payment", { orderId });
      }
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.message || "Checkout gagal");
    } finally {
      setCheckoutLoading(false);
    }
  };

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <LinearGradient
          colors={["rgba(168,85,247,0.25)", "rgba(124,58,237,0.08)"]}
          style={styles.loadingIcon}
        >
          <Ionicons name="ticket" size={28} color={PURPLE} />
        </LinearGradient>
        <ActivityIndicator
          size="small"
          color={PURPLE}
          style={{ marginTop: 20 }}
        />
        <Text style={styles.loadingText}>Memuat kategori tiket...</Text>
      </View>
    );
  }

  const disabledCheckout = checkoutLoading || totalTickets === 0;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <SafeAreaView style={styles.safe}>
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" color={colors.text} size={22} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Pilih Kategori Tiket</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {concert.title}
            </Text>
          </View>

          <View style={styles.headerCount}>
            <Ionicons name="ticket-outline" size={13} color={PURPLE} />
            <Text style={styles.headerCountText}>{totalTickets}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ================= TICKET LIST ================= */}
          {concert.ticket_categories.map((item: TicketCategory, index: number) => {
            const qty = quantities[keyOf(item.id)] || 0;
            const badgeLabel = getBadgeLabel(item, index);
            const badgeStyle = BADGES[badgeLabel] || BADGES.REGULER;
            const benefits: string[] = item.benefits || [];
            const isActive = qty > 0;

            const soldOut = item.remaining_quota <= 0;
            const almostSoldOut =
              item.remaining_quota > 0 && item.remaining_quota <= 10;
            const maxReached = qty >= item.remaining_quota;

            const stockColor = soldOut
              ? colors.subText
              : almostSoldOut
              ? "#f59e0b"
              : PURPLE;

            return (
              <View
                key={item.id}
                style={[
                  styles.ticketCard,
                  isActive && styles.ticketCardActive,
                  soldOut && styles.ticketCardSoldOut,
                ]}
              >
                {/* aksen kiri */}
                <LinearGradient
                  colors={soldOut ? [colors.border, colors.border] : badgeStyle.accent}
                  style={styles.ticketAccent}
                />

                {isActive && (
                  <View style={styles.selectedTag}>
                    <Ionicons name="checkmark" size={13} color="#ffffff" />
                  </View>
                )}

                <View style={styles.ticketBody}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
                      <Ionicons name={badgeStyle.icon} size={11} color={badgeStyle.text} />
                      <Text style={[styles.badgeText, { color: badgeStyle.text }]}>
                        {badgeLabel}
                      </Text>
                    </View>

                    <View style={styles.typePill}>
                      <Ionicons
                        name={item.seat_type === "seated" ? "grid-outline" : "walk-outline"}
                        size={11}
                        color={colors.subText}
                      />
                      <Text style={styles.typePillText}>
                        {item.seat_type === "seated" ? "Bernomor kursi" : "Standing"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ticketName}>{item.name}</Text>

                  <View style={styles.stockRow}>
                    <Ionicons
                      name={soldOut ? "close-circle" : "ticket-outline"}
                      size={13}
                      color={stockColor}
                    />
                    <Text
                      style={[
                        styles.remaining,
                        almostSoldOut && styles.remainingWarn,
                        soldOut && styles.remainingSoldOut,
                      ]}
                    >
                      {soldOut
                        ? "Tiket habis"
                        : almostSoldOut
                        ? `Tinggal ${item.remaining_quota} tiket lagi!`
                        : `Sisa ${item.remaining_quota} tiket lagi`}
                    </Text>
                  </View>

                  {benefits.length > 0 && (
                    <View style={styles.benefitList}>
                      {benefits.map((benefit: string, i: number) => (
                        <View key={i} style={styles.benefitRow}>
                          <Ionicons
                            name="shield-checkmark"
                            size={14}
                            color={isDark ? "#a78bfa" : PURPLE_DARK}
                          />
                          <Text style={styles.benefitText}>{benefit}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.dashed} />

                  <View style={styles.cardBottomRow}>
                    <View>
                      <Text style={styles.priceLabel}>Harga / tiket</Text>
                      <Text style={styles.price}>IDR {formatPrice(item.price)}</Text>
                    </View>

                    {soldOut ? (
                      <View style={styles.soldOutPill}>
                        <Text style={styles.soldOutPillText}>Habis</Text>
                      </View>
                    ) : (
                      <View style={styles.qtyRow}>
                        <TouchableOpacity
                          style={[
                            styles.qtyBtn,
                            styles.qtyBtnMinus,
                            qty === 0 && styles.qtyBtnDisabled,
                          ]}
                          disabled={qty === 0}
                          activeOpacity={0.7}
                          onPress={() => decrease(item)}
                        >
                          <Ionicons name="remove" size={18} color={colors.text} />
                        </TouchableOpacity>

                        <Text style={styles.qty}>{qty}</Text>

                        <TouchableOpacity
                          disabled={maxReached}
                          activeOpacity={0.8}
                          onPress={() => increase(item)}
                        >
                          <LinearGradient
                            colors={
                              maxReached
                                ? [colors.border, colors.border]
                                : [PURPLE, PURPLE_DARK]
                            }
                            style={styles.qtyBtn}
                          >
                            <Ionicons
                              name="add"
                              size={18}
                              color={maxReached ? colors.subText : "#ffffff"}
                            />
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ================= BOTTOM BAR ================= */}
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
              <Text style={styles.totalLabel}>Total ({totalTickets} Tiket)</Text>
              <View style={styles.totalRow}>
                <Text style={styles.totalCurrency}>IDR</Text>
                <Text style={styles.totalPrice}>{formatPrice(totalPrice)}</Text>
              </View>
            </View>

            <TouchableOpacity
              disabled={disabledCheckout}
              onPress={checkout}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  disabledCheckout && !checkoutLoading
                    ? [colors.border, colors.border]
                    : [PURPLE, PURPLE_DARK]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.lanjutBtn, !disabledCheckout && styles.lanjutBtnActive]}
              >
                {checkoutLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text
                      style={[
                        styles.lanjutText,
                        disabledCheckout && { color: colors.subText },
                      ]}
                    >
                      Lanjut
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={disabledCheckout ? colors.subText : "#ffffff"}
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

const createStyles = (colors: typeof themes.dark, isDark: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    safe: { flex: 1, paddingTop: ANDROID_TOP },

    /* ---------- LOADING ---------- */
    loadingRoot: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingIcon: {
      width: 66,
      height: 66,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "rgba(168,85,247,0.25)",
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 10,
    },

    /* ---------- HEADER ---------- */
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

    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

    /* ---------- TICKET CARD ---------- */
    ticketCard: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 22,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    ticketCardActive: {
      borderColor: PURPLE_DARK,
      backgroundColor: isDark ? "#1a1330" : "#f5f0ff",
      shadowColor: PURPLE_DARK,
      shadowOpacity: isDark ? 0.3 : 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    ticketCardSoldOut: {
      opacity: 0.6,
    },
    ticketAccent: {
      width: 6,
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
    },
    ticketBody: {
      flex: 1,
      padding: 16,
    },
    selectedTag: {
      position: "absolute",
      top: -9,
      right: -9,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: PURPLE_DARK,
      borderWidth: 2,
      borderColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    cardTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
      marginLeft: 4,
    },
    typePill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    typePillText: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: "600",
      marginLeft: 4,
    },
    ticketName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 6,
    },
    stockRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    remaining: {
      color: colors.subText,
      fontSize: 12,
      marginLeft: 5,
    },
    remainingWarn: {
      color: "#f59e0b",
      fontWeight: "700",
    },
    remainingSoldOut: {
      color: colors.subText,
    },
    benefitList: { marginBottom: 4 },
    benefitRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 7,
    },
    benefitText: {
      color: colors.subText,
      fontSize: 13,
      marginLeft: 8,
      flex: 1,
    },
    dashed: {
      height: 1,
      marginVertical: 14,
      borderTopWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
    },
    cardBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    priceLabel: {
      color: colors.subText,
      fontSize: 10,
      marginBottom: 2,
    },
    price: {
      color: isDark ? "#a78bfa" : PURPLE_DARK,
      fontSize: 16,
      fontWeight: "900",
    },

    /* ---------- QTY ---------- */
    qtyRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    qtyBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    qtyBtnMinus: {
      backgroundColor: isDark ? "#1f1f28" : "#f4f4f8",
      borderWidth: 1,
      borderColor: colors.border,
    },
    qtyBtnDisabled: { opacity: 0.4 },
    qty: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      minWidth: 38,
      textAlign: "center",
    },
    soldOutPill: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor: colors.border,
    },
    soldOutPillText: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: "800",
    },

    /* ---------- BOTTOM BAR ---------- */
    bottomBarWrap: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingTop: 24,
    },
    bottomBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    bottomInfo: { flex: 1, paddingRight: 12 },
    totalLabel: {
      color: colors.subText,
      fontSize: 11,
      marginBottom: 2,
    },
    totalRow: {
      flexDirection: "row",
      alignItems: "baseline",
    },
    totalCurrency: {
      color: isDark ? "#a78bfa" : PURPLE_DARK,
      fontSize: 12,
      fontWeight: "700",
      marginRight: 4,
    },
    totalPrice: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "900",
    },
    lanjutBtn: {
      flexDirection: "row",
      borderRadius: 18,
      height: 54,
      paddingHorizontal: 30,
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
      fontSize: 15,
    },
  });