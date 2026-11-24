import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Share,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";
import { useTheme, themes } from "../context/ThemeContext";

const API_URL = "http://localhost:3000/api";

const PURPLE = "#a855f7";
const PURPLE_DARK = "#7c3aed";
const ANDROID_TOP = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

type OrderItem = {
  id: number;
  order_id: number;
  ticket_category_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  ticket_category: string;
  seat_type?: string | null;
  concert_id: number;
  concert_title: string;
  concert_banner?: string | null;
  concert_location?: string | null;
  concert_date?: string | null;
  concert_time?: string | null;
};

type TicketOrder = {
  id: number;
  order_code: string;
  total_price: number;
  status: "pending" | "paid" | "cancelled" | "expired";
  created_at: string;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  transaction_id?: string | null;
  items: OrderItem[];
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "-";

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getDay = (dateStr?: string | null) => {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("id-ID", { day: "2-digit" });
};

const getMonth = (dateStr?: string | null) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", { month: "short" }).toUpperCase();
};

const formatCurrency = (amount: number | string) => {
  return `Rp${Number(amount || 0).toLocaleString("id-ID")}`;
};

export default function TicketDetailScreen({ route, navigation }: any) {
  const { orderId } = route.params || {};
  const { colors } = useTheme();
  const isDark = colors.statusBar === "light";
  const styles = createStyles(colors, isDark);

  const [order, setOrder] = useState<TicketOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");

      const res = await axios.get(`${API_URL}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: TicketOrder = res.data.data;

      if (data.status !== "paid") {
        Alert.alert(
          "Tiket Belum Tersedia",
          "QR Code hanya tersedia untuk tiket yang sudah dibayar."
        );

        navigation.goBack();
        return;
      }

      setOrder(data);
    } catch (error) {
      console.log("Gagal mengambil detail tiket:", error);

      Alert.alert("Error", "Gagal mengambil detail tiket.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [orderId])
  );

  const handleShare = async () => {
    if (!order) return;

    try {
      const concertNames = [
        ...new Set(order.items.map((item) => item.concert_title)),
      ];

      await Share.share({
        message:
          `Tiket konser: ${concertNames.join(", ")}\n` +
          `Kode pesanan: ${order.order_code}\n` +
          `Total pembayaran: ${formatCurrency(order.total_price)}\n` +
          `Status: Sudah Dibayar`,
      });
    } catch (error) {
      console.log("Gagal membagikan tiket:", error);
    }
  };

  const handleShareCode = async () => {
    if (!order) return;
    try {
      await Share.share({ message: order.order_code });
    } catch (error) {
      console.log("Gagal membagikan kode:", error);
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
          <Ionicons name="qr-code" size={28} color={PURPLE} />
        </LinearGradient>
        <ActivityIndicator size="small" color={PURPLE} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Memuat detail tiket...</Text>
      </View>
    );
  }

  /* ---------------- EMPTY ---------------- */
  if (!order) {
    return (
      <View style={styles.loadingRoot}>
        <Ionicons name="ticket-outline" size={45} color={colors.subText} />
        <Text style={styles.emptyText}>Tiket tidak ditemukan</Text>
      </View>
    );
  }

  // Mengelompokkan item berdasarkan konser.
  const concerts = Array.from(
    new Map(order.items.map((item) => [item.concert_id, item])).values()
  );

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
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Detail Tiket</Text>

          <TouchableOpacity
            onPress={handleShare}
            style={styles.headerButton}
            activeOpacity={0.75}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ================= PAYMENT STATUS ================= */}
          <View style={styles.paidBadge}>
            <Ionicons name="checkmark-circle" size={15} color={styles.paidText.color} />
            <Text style={[styles.paidBadgeText, styles.paidText]}>
              Pembayaran Berhasil
            </Text>
          </View>

          {/* ================= ORDER CODE ================= */}
          <View style={styles.orderCodeCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>KODE PESANAN</Text>
              <Text style={styles.orderCode} selectable>
                {order.order_code}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleShareCode}
              style={styles.copyButton}
              activeOpacity={0.75}
            >
              <Ionicons name="copy-outline" size={16} color={PURPLE} />
            </TouchableOpacity>
          </View>

          {/* ================= CONCERT INFO ================= */}
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Konser yang Dibeli</Text>
          </View>

          {concerts.map((concert) => {
            const concertItems = order.items.filter(
              (item) => item.concert_id === concert.concert_id
            );

            const totalQuantity = concertItems.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0
            );

            return (
              <View key={concert.concert_id} style={styles.concertCard}>
                <LinearGradient
                  colors={isDark ? ["#2a1a4d", "#141420"] : ["#7c3aed", "#a855f7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.concertHeader}
                >
                  <View style={styles.concertIcon}>
                    <Ionicons name="musical-notes" size={25} color="#ede9fe" />
                  </View>

                  <View style={styles.concertTitleContainer}>
                    <Text style={styles.concertLabel}>KONSER</Text>
                    <Text style={styles.concertName}>
                      {concert.concert_title || "Nama Konser"}
                    </Text>
                  </View>

                  <View style={styles.dateBlock}>
                    <Text style={styles.dateMonth}>
                      {getMonth(concert.concert_date)}
                    </Text>
                    <Text style={styles.dateDay}>
                      {getDay(concert.concert_date)}
                    </Text>
                  </View>
                </LinearGradient>

                <View style={styles.concertInfo}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="calendar-outline" size={16} color={styles.infoIconColor.color} />
                    </View>
                    <Text style={styles.infoText}>
                      {formatDate(concert.concert_date)}
                    </Text>
                  </View>

                  {!!concert.concert_time && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoIcon}>
                        <Ionicons name="time-outline" size={16} color={styles.infoIconColor.color} />
                      </View>
                      <Text style={styles.infoText}>
                        {String(concert.concert_time).slice(0, 5)}
                      </Text>
                    </View>
                  )}

                  {!!concert.concert_location && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoIcon}>
                        <Ionicons name="location-outline" size={16} color={styles.infoIconColor.color} />
                      </View>
                      <Text style={styles.infoText}>
                        {concert.concert_location}
                      </Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="ticket-outline" size={16} color={styles.infoIconColor.color} />
                    </View>
                    <Text style={styles.infoText}>
                      {totalQuantity} tiket dibeli
                    </Text>
                  </View>
                </View>

                {/* TICKET CATEGORIES */}
                <View style={styles.categorySection}>
                  <Text style={styles.categoryHeading}>Detail Tiket</Text>

                  {concertItems.map((item) => (
                    <View key={item.id} style={styles.categoryItem}>
                      <View style={styles.categoryLeft}>
                        <Text style={styles.categoryName}>
                          {item.ticket_category}
                        </Text>

                        {!!item.seat_type && (
                          <View style={styles.seatTypePill}>
                            <Text style={styles.seatType}>{item.seat_type}</Text>
                          </View>
                        )}

                        <Text style={styles.categoryQuantity}>
                          {item.quantity} tiket x {formatCurrency(item.price)}
                        </Text>
                      </View>

                      <Text style={styles.categorySubtotal}>
                        {formatCurrency(item.subtotal)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}

          {/* ================= QR CODE ================= */}
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>QR Code Tiket</Text>
          </View>

          <View style={styles.ticketWrap}>
            <View style={styles.ticketCard}>
              {/* lubang sobekan kiri-kanan */}
              <View style={[styles.notch, styles.notchLeft]} />
              <View style={[styles.notch, styles.notchRight]} />

              <View style={styles.ticketTop}>
                <Ionicons name="ticket" size={16} color={PURPLE} />
                <Text style={styles.ticketTopText}>E-TICKET</Text>
              </View>

              <View style={styles.ticketDashed} />

              <View style={styles.qrSection}>
                <View style={styles.qrBox}>
                  <QRCode
                    value={order.order_code}
                    size={180}
                    backgroundColor="#ffffff"
                    color="#000000"
                  />
                </View>

                <Text style={styles.qrOrderCode}>{order.order_code}</Text>

                <Text style={styles.qrHint}>
                  Tunjukkan QR Code ini kepada petugas saat memasuki lokasi
                  konser.
                </Text>
              </View>
            </View>
          </View>

          {/* ================= PAYMENT ================= */}
          <View style={styles.sectionTitleWrap}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Informasi Pembayaran</Text>
          </View>

          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Total Pembayaran</Text>
              <Text style={styles.totalPrice}>
                {formatCurrency(order.total_price)}
              </Text>
            </View>

            <View style={styles.paymentDivider} />

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Metode Pembayaran</Text>
              <Text style={styles.paymentValue}>
                {order.payment_method || "-"}
              </Text>
            </View>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status</Text>
              <View style={styles.statusPill}>
                <Text style={styles.paymentStatus}>LUNAS</Text>
              </View>
            </View>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Tanggal Pembayaran</Text>
              <Text style={styles.paymentValue}>{formatDate(order.paid_at)}</Text>
            </View>
          </View>

          {/* ================= NOTE ================= */}
          <View style={styles.noteBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={isDark ? "#a78bfa" : PURPLE_DARK}
            />
            <Text style={styles.noteText}>
              Simpan tiket ini dengan baik. QR Code digunakan sebagai bukti
              tiket saat masuk ke lokasi konser.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ========================================= */
/* STYLES */
/* ========================================= */

const createStyles = (colors: typeof themes.dark, isDark: boolean) => {
  const accentText = isDark ? "#c4b5fd" : PURPLE_DARK;
  const green = isDark ? "#4ade80" : "#15803d";
  const greenBg = isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.14)";

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    safe: { flex: 1, paddingTop: ANDROID_TOP },

    /* ---------- STATES ---------- */
    loadingRoot: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
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
      fontSize: 12,
    },
    emptyText: {
      color: colors.subText,
      fontSize: 13,
    },

    /* ---------- HEADER ---------- */
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 16,
    },
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },

    /* ---------- PAID BADGE ---------- */
    paidBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: greenBg,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 7,
      marginBottom: 18,
    },
    paidBadgeText: {
      fontSize: 12,
      fontWeight: "800",
    },
    paidText: { color: green },

    /* ---------- ORDER CODE ---------- */
    orderCodeCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 17,
      marginBottom: 26,
    },
    sectionLabel: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.5,
      marginBottom: 6,
    },
    orderCode: {
      color: accentText,
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: 1.5,
    },
    copyButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: "rgba(168,85,247,0.12)",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 10,
    },

    /* ---------- SECTION TITLE ---------- */
    sectionTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      marginTop: 4,
    },
    sectionBar: {
      width: 4,
      height: 20,
      borderRadius: 4,
      backgroundColor: PURPLE,
      marginRight: 10,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: -0.2,
    },

    /* ---------- CONCERT CARD ---------- */
    concertCard: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 24,
    },
    concertHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 18,
      gap: 13,
    },
    concertIcon: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor: "rgba(255,255,255,0.15)",
      justifyContent: "center",
      alignItems: "center",
    },
    concertTitleContainer: {
      flex: 1,
    },
    concertLabel: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 9,
      fontWeight: "900",
      letterSpacing: 1.5,
      marginBottom: 5,
    },
    concertName: {
      color: "#ffffff",
      fontSize: 17,
      fontWeight: "900",
    },
    dateBlock: {
      width: 52,
      paddingVertical: 7,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.22)",
    },
    dateMonth: {
      color: "#ede9fe",
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1,
    },
    dateDay: {
      color: "#ffffff",
      fontSize: 20,
      fontWeight: "900",
      lineHeight: 24,
    },
    concertInfo: {
      padding: 18,
      gap: 13,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    infoIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: "rgba(168,85,247,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    infoIconColor: { color: isDark ? "#a78bfa" : PURPLE_DARK },
    infoText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
      flex: 1,
      lineHeight: 17,
    },

    /* ---------- CATEGORY ---------- */
    categorySection: {
      paddingHorizontal: 18,
      paddingBottom: 18,
    },
    categoryHeading: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 12,
    },
    categoryItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 13,
      gap: 10,
    },
    categoryLeft: {
      flex: 1,
    },
    categoryName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "800",
    },
    seatTypePill: {
      alignSelf: "flex-start",
      backgroundColor: "rgba(168,85,247,0.12)",
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
      marginTop: 5,
    },
    seatType: {
      color: isDark ? "#c4b5fd" : PURPLE_DARK,
      fontSize: 10,
      fontWeight: "700",
    },
    categoryQuantity: {
      color: colors.subText,
      fontSize: 10,
      marginTop: 5,
    },
    categorySubtotal: {
      color: accentText,
      fontSize: 12,
      fontWeight: "900",
    },

    /* ---------- QR TICKET ---------- */
    ticketWrap: {
      marginBottom: 24,
      shadowColor: PURPLE_DARK,
      shadowOpacity: isDark ? 0.25 : 0.15,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    ticketCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    notch: {
      position: "absolute",
      top: 46,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 2,
    },
    notchLeft: { left: -13 },
    notchRight: { right: -13 },
    ticketTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 18,
      paddingBottom: 16,
      gap: 7,
    },
    ticketTopText: {
      color: PURPLE,
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 2.5,
    },
    ticketDashed: {
      height: 1,
      marginHorizontal: 22,
      borderTopWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
    },
    qrSection: {
      alignItems: "center",
      padding: 24,
    },
    qrBox: {
      backgroundColor: "#ffffff",
      padding: 14,
      borderRadius: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDark ? "transparent" : "#e5e7eb",
    },
    qrOrderCode: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 1.5,
    },
    qrHint: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 9,
      textAlign: "center",
      lineHeight: 17,
    },

    /* ---------- PAYMENT ---------- */
    paymentCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 18,
      gap: 16,
    },
    paymentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    paymentLabel: {
      color: colors.subText,
      fontSize: 11,
      flex: 1,
    },
    paymentValue: {
      color: colors.text,
      fontSize: 11,
      fontWeight: "700",
      textAlign: "right",
      flex: 1,
    },
    totalPrice: {
      color: accentText,
      fontSize: 17,
      fontWeight: "900",
    },
    statusPill: {
      backgroundColor: greenBg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    paymentStatus: {
      color: green,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.5,
    },
    paymentDivider: {
      height: 1,
      backgroundColor: colors.border,
    },

    /* ---------- NOTE ---------- */
    noteBox: {
      flexDirection: "row",
      gap: 10,
      marginTop: 20,
      paddingHorizontal: 3,
    },
    noteText: {
      color: colors.subText,
      fontSize: 11,
      flex: 1,
      lineHeight: 17,
    },
  });
};