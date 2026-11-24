import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme, themes } from "../context/ThemeContext";

const API_URL = "http://localhost:3000/api";

const PURPLE = "#a855f7";
const PURPLE_DARK = "#7c3aed";
const ANDROID_TOP = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

type OrderStatus = "pending" | "paid" | "cancelled" | "expired";

type Order = {
  id: number;
  order_code: string;
  total_price: number;
  status: OrderStatus;
  created_at: string;
  paid_at?: string | null;
};

type TabKey = "all" | "unpaid" | "paid";

type StatusConfigItem = {
  label: string;
  color: string;
  bg: string;
  accent: [string, string];
  icon: any;
};

type StatusConfigMap = Record<OrderStatus, StatusConfigItem>;

const getStatusConfig = (isDark: boolean): StatusConfigMap => ({
  pending: {
    label: "Menunggu Pembayaran",
    color: isDark ? "#fbbf24" : "#b45309",
    bg: isDark ? "rgba(245,158,11,0.16)" : "rgba(245,158,11,0.18)",
    accent: ["#fbbf24", "#f59e0b"],
    icon: "time",
  },
  paid: {
    label: "Sudah Dibayar",
    color: isDark ? "#4ade80" : "#15803d",
    bg: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.14)",
    accent: ["#4ade80", "#16a34a"],
    icon: "checkmark-circle",
  },
  cancelled: {
    label: "Dibatalkan",
    color: isDark ? "#f87171" : "#b91c1c",
    bg: isDark ? "rgba(239,68,68,0.16)" : "rgba(239,68,68,0.12)",
    accent: ["#f87171", "#dc2626"],
    icon: "close-circle",
  },
  expired: {
    label: "Kedaluwarsa",
    color: isDark ? "#9ca3af" : "#4b5563",
    bg: isDark ? "rgba(107,114,128,0.2)" : "rgba(107,114,128,0.14)",
    accent: ["#9ca3af", "#6b7280"],
    icon: "alert-circle",
  },
});

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

export default function MyTicketsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const isDark = colors.statusBar === "light";
  const styles = createStyles(colors, isDark);
  const STATUS_CONFIG = getStatusConfig(isDark);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const loadOrders = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await axios.get(`${API_URL}/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOrders(res.data.data || []);
    } catch (err) {
      Alert.alert("Error", "Gagal mengambil riwayat tiket");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "unpaid") return order.status === "pending";
    if (activeTab === "paid") return order.status === "paid";
    return true;
  });

  const countOf = (key: TabKey) => {
    if (key === "unpaid") return orders.filter((o) => o.status === "pending").length;
    if (key === "paid") return orders.filter((o) => o.status === "paid").length;
    return orders.length;
  };

  const handlePressOrder = (order: Order) => {
    if (order.status === "pending") {
      navigation.navigate("Payment", { orderId: order.id });
    } else if (order.status === "paid") {
      navigation.navigate("detailticket", { orderId: order.id });
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "Semua" },
    { key: "unpaid", label: "Belum Dibayar" },
    { key: "paid", label: "Sudah Dibayar" },
  ];

  const emptyMessage =
    activeTab === "unpaid"
      ? "Tidak ada tiket yang menunggu pembayaran"
      : activeTab === "paid"
      ? "Belum ada tiket yang sudah dibayar"
      : "Belum ada pemesanan tiket";

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
        <ActivityIndicator size="small" color={PURPLE} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Memuat tiket kamu...</Text>
      </View>
    );
  }

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
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>Tiket Saya</Text>
            <Text style={styles.subtitle}>Riwayat pemesanan tiket kamu</Text>
          </View>

          <View style={styles.headerCount}>
            <Ionicons name="ticket-outline" size={13} color={PURPLE} />
            <Text style={styles.headerCountText}>{orders.length}</Text>
          </View>
        </View>

        {/* ================= FILTER TABS ================= */}
        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
                  <Text
                    style={[
                      styles.tabCountText,
                      isActive && styles.tabCountTextActive,
                    ]}
                  >
                    {countOf(tab.key)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================= ORDER LIST ================= */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={PURPLE}
              colors={[PURPLE]}
            />
          }
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="ticket-outline" size={34} color={PURPLE} />
              </View>
              <Text style={styles.emptyTitle}>Belum ada tiket</Text>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status];
              const tappable =
                order.status === "pending" || order.status === "paid";

              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.card}
                  onPress={() => handlePressOrder(order)}
                  activeOpacity={tappable ? 0.8 : 1}
                >
                  {/* aksen kiri sesuai status */}
                  <LinearGradient
                    colors={statusConfig.accent}
                    style={styles.cardAccent}
                  />

                  <View style={styles.cardBody}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.codeWrap}>
                        <View style={styles.codeIcon}>
                          <Ionicons name="ticket" size={14} color={PURPLE} />
                        </View>
                        <Text style={styles.orderCode} numberOfLines={1}>
                          {order.order_code}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusConfig.bg },
                        ]}
                      >
                        <Ionicons
                          name={statusConfig.icon}
                          size={11}
                          color={statusConfig.color}
                        />
                        <Text
                          style={[styles.statusText, { color: statusConfig.color }]}
                        >
                          {statusConfig.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dateRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={12}
                        color={colors.subText}
                      />
                      <Text style={styles.date}>{formatDate(order.created_at)}</Text>
                    </View>

                    <View style={styles.cardBottomRow}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalPrice}>
                        IDR {Number(order.total_price || 0).toLocaleString("id-ID")}
                      </Text>
                    </View>

                    {order.status === "pending" && (
                      <View style={styles.actionBtnPending}>
                        <Ionicons name="card-outline" size={14} color="#ffffff" />
                        <Text style={styles.actionBtnPendingText}>
                          Bayar Sekarang
                        </Text>
                      </View>
                    )}

                    {order.status === "paid" && (
                      <View style={styles.actionBtnPaid}>
                        <Ionicons
                          name="qr-code-outline"
                          size={14}
                          color={isDark ? "#c4b5fd" : PURPLE_DARK}
                        />
                        <Text style={styles.actionBtnPaidText}>
                          Lihat Detail Tiket
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={13}
                          color={isDark ? "#c4b5fd" : PURPLE_DARK}
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* SPACE FOR BOTTOM NAV */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ================= BOTTOM NAVIGATION ================= */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="home-outline" size={20} color={colors.subText} />
          </View>
          <Text style={styles.navLabel}>Beranda</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Explore")}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="compass-outline" size={21} color={colors.subText} />
          </View>
          <Text style={styles.navLabel}>Eksplor</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} activeOpacity={0.7}>
          <View style={styles.activeNavIcon}>
            <Ionicons name="ticket" size={21} color={PURPLE} />
          </View>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Tiket Saya</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons name="person-outline" size={21} color={colors.subText} />
          </View>
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ========================================= */
/* STYLES */
/* ========================================= */

const createStyles = (colors: typeof themes.dark, isDark: boolean) => {
  const accentText = isDark ? "#c4b5fd" : PURPLE_DARK;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safe: {
      flex: 1,
      paddingTop: ANDROID_TOP,
    },

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
      paddingBottom: 16,
      gap: 13,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    headerText: {
      flex: 1,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "800",
      letterSpacing: -0.4,
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
    },
    headerCountText: {
      color: PURPLE,
      fontSize: 12,
      fontWeight: "800",
      marginLeft: 5,
    },

    /* ---------- TABS ---------- */
    tabRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 8,
      marginBottom: 16,
    },
    tabBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    tabBtnActive: {
      backgroundColor: isDark ? "#2a1a4d" : "#f3e8ff",
      borderColor: PURPLE_DARK,
    },
    tabText: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: "700",
    },
    tabTextActive: {
      color: accentText,
    },
    tabCount: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      alignItems: "center",
      justifyContent: "center",
    },
    tabCountActive: {
      backgroundColor: PURPLE_DARK,
    },
    tabCountText: {
      color: colors.subText,
      fontSize: 10,
      fontWeight: "800",
    },
    tabCountTextActive: {
      color: "#ffffff",
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 30,
    },

    /* ---------- EMPTY ---------- */
    emptyBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: "rgba(168,85,247,0.12)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    emptyText: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 6,
      textAlign: "center",
      paddingHorizontal: 30,
      lineHeight: 19,
    },

    /* ---------- CARD ---------- */
    card: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    cardAccent: {
      width: 5,
    },
    cardBody: {
      flex: 1,
      padding: 16,
    },
    cardTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    codeWrap: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    codeIcon: {
      width: 26,
      height: 26,
      borderRadius: 9,
      backgroundColor: "rgba(168,85,247,0.12)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    orderCode: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "800",
      flex: 1,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
      gap: 4,
    },
    statusText: {
      fontSize: 10,
      fontWeight: "700",
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 14,
    },
    date: {
      color: colors.subText,
      fontSize: 12,
    },
    cardBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    totalLabel: {
      color: colors.subText,
      fontSize: 12,
    },
    totalPrice: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "900",
    },

    /* ---------- ACTION ---------- */
    actionBtnPending: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: PURPLE_DARK,
    },
    actionBtnPendingText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "800",
    },
    actionBtnPaid: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: "rgba(168,85,247,0.12)",
    },
    actionBtnPaidText: {
      color: accentText,
      fontSize: 12,
      fontWeight: "800",
    },

    /* ---------- BOTTOM NAV ---------- */
    bottomNav: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 82,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "flex-start",
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 9,
      paddingBottom: 12,
    },
    navItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    navIcon: {
      width: 35,
      height: 35,
      alignItems: "center",
      justifyContent: "center",
    },
    activeNavIcon: {
      width: 35,
      height: 35,
      borderRadius: 12,
      backgroundColor: "rgba(168,85,247,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },
    navLabel: {
      color: colors.subText,
      fontSize: 10,
      marginTop: 2,
    },
    navLabelActive: {
      color: PURPLE,
      fontWeight: "800",
    },
  });
};