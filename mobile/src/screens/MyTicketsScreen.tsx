
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

const API_URL = "http://localhost:3000/api";

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
  icon: any;
};

type StatusConfigMap = {
  pending: StatusConfigItem;
  paid: StatusConfigItem;
  cancelled: StatusConfigItem;
  expired: StatusConfigItem;
};

const STATUS_CONFIG: StatusConfigMap = {
  pending: {
    label: "Menunggu Pembayaran",
    color: "#fbbf24",
    bg: "#3f2d0d",
    icon: "time",
  },
  paid: {
    label: "Sudah Dibayar",
    color: "#4ade80",
    bg: "#14321f",
    icon: "checkmark-circle",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "#f87171",
    bg: "#3f1414",
    icon: "close-circle",
  },
  expired: {
    label: "Kedaluwarsa",
    color: "#9ca3af",
    bg: "#1f2937",
    icon: "alert-circle",
  },
};

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

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#000", "#0a0a0f", "#000"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color="#fff"
              />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.title}>Tiket Saya</Text>
              <Text style={styles.subtitle}>
                Riwayat pemesanan tiket kamu
              </Text>
            </View>
          </View>
        </View>

        {/* FILTER TABS */}
        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ORDER LIST */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#a855f7"
            />
          }
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="ticket-outline" size={48} color="#33333d" />
              <Text style={styles.emptyText}>
                Belum ada tiket di kategori ini
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status];

              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.card}
                  onPress={() => handlePressOrder(order)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.orderCode}>
                      {order.order_code}
                    </Text>

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
                        style={[
                          styles.statusText,
                          { color: statusConfig.color },
                        ]}
                      >
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.date}>
                    {formatDate(order.created_at)}
                  </Text>

                  <View style={styles.cardBottomRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalPrice}>
                      IDR {order.total_price.toLocaleString("id-ID")}
                    </Text>
                  </View>

                  {order.status === "pending" && (
                    <View style={styles.actionRow}>
                      <Ionicons
                        name="card-outline"
                        size={14}
                        color="#a78bfa"
                      />
                      <Text style={styles.actionText}>
                        Ketuk untuk bayar sekarang
                      </Text>
                    </View>
                  )}

                  {order.status === "paid" && (
                    <View style={styles.actionRow}>
                      <Ionicons
                        name="eye-outline"
                        size={14}
                        color="#6b7280"
                      />
                      <Text
                        style={[styles.actionText, { color: "#6b7280" }]}
                      >
                        Ketuk untuk lihat detail tiket
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {/* SPACE FOR BOTTOM NAV */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        {/* HOME */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons
              name="home-outline"
              size={20}
              color="#6b7280"
            />
          </View>
          <Text style={styles.navLabel}>Beranda</Text>
        </TouchableOpacity>

        {/* EXPLORE */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Explore")}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons
              name="compass-outline"
              size={21}
              color="#6b7280"
            />
          </View>
          <Text style={styles.navLabel}>Eksplor</Text>
        </TouchableOpacity>

        {/* MY TICKETS */}
        <TouchableOpacity
          style={styles.navItem}
          activeOpacity={0.7}
        >
          <View style={styles.activeNavIcon}>
            <Ionicons
              name="ticket"
              size={21}
              color="#a855f7"
            />
          </View>
          <Text style={[styles.navLabel, styles.navLabelActive]}>
            Tiket Saya
          </Text>
        </TouchableOpacity>

        {/* PROFILE */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.7}
        >
          <View style={styles.navIcon}>
            <Ionicons
              name="person-outline"
              size={21}
              color="#6b7280"
            />
          </View>
          <Text style={styles.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },

  loadingRoot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  safe: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#141420",
    borderWidth: 1,
    borderColor: "#1f1f28",
    justifyContent: "center",
    alignItems: "center",
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },

  subtitle: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 2,
  },

  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },

  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#141420",
    borderWidth: 1,
    borderColor: "#1f1f28",
  },

  tabBtnActive: {
    backgroundColor: "#2a1a4d",
    borderColor: "#7c3aed",
  },

  tabText: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },

  tabTextActive: {
    color: "#c4b5fd",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },

  emptyText: {
    color: "#6b7280",
    fontSize: 13,
  },

  card: {
    backgroundColor: "#141420",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1f1f28",
  },

  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  orderCode: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
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

  date: {
    color: "#6b7280",
    fontSize: 12,
    marginBottom: 14,
  },

  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1f1f28",
  },

  totalLabel: {
    color: "#6b7280",
    fontSize: 12,
  },

  totalPrice: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },

  actionText: {
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: "600",
  },

  // BOTTOM NAV
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 82,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    backgroundColor: "#101018",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
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
    backgroundColor: "rgba(168,85,247,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  navLabel: {
    color: "#62626c",
    fontSize: 10,
    marginTop: 2,
  },

  navLabelActive: {
    color: "#a855f7",
    fontWeight: "800",
  },
});
