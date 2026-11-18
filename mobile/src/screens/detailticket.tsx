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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";

// NOTE: install the QR dependency if it's not already in the project:
//   npx expo install react-native-svg
//   npm install react-native-qrcode-svg

const API_URL = "http://localhost:3000/api";

type TicketOrder = {
  id: number;
  order_code: string;
  total_price: number;
  status: "pending" | "paid" | "cancelled" | "expired";
  created_at: string;
  paid_at?: string | null;
  // Assumed event-related fields — adjust the keys below to match your
  // actual API response shape.
  event_name?: string;
  event_date?: string;
  event_location?: string;
  ticket_type?: string;
  quantity?: number;
  holder_name?: string;
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

export default function TicketDetailScreen({ route, navigation }: any) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState<TicketOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await axios.get(`${API_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: TicketOrder = res.data.data;

      if (data.status !== "paid") {
        Alert.alert(
          "Tiket Belum Tersedia",
          "Barcode hanya tersedia untuk tiket yang sudah dibayar."
        );
        navigation.goBack();
        return;
      }

      setOrder(data);
    } catch (err) {
      Alert.alert("Error", "Gagal mengambil detail tiket");
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
      await Share.share({
        message: `Tiket ${order.event_name ?? ""} - Kode: ${order.order_code}`,
      });
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.emptyText}>Tiket tidak ditemukan</Text>
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
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Detail Tiket</Text>
          <TouchableOpacity onPress={handleShare} style={styles.backBtn}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Paid badge */}
          <View style={styles.paidBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#4ade80" />
            <Text style={styles.paidBadgeText}>Sudah Dibayar</Text>
          </View>

          {/* Ticket card */}
          <View style={styles.ticketCard}>
            <LinearGradient
              colors={["#2a1a4d", "#141420"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ticketTopSection}
            >
              <Text style={styles.eventName} numberOfLines={2}>
                {order.event_name ?? "Tiket Acara"}
              </Text>
              {!!order.event_date && (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={14} color="#c4b5fd" />
                  <Text style={styles.infoText}>{formatDate(order.event_date)}</Text>
                </View>
              )}
              {!!order.event_location && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color="#c4b5fd" />
                  <Text style={styles.infoText}>{order.event_location}</Text>
                </View>
              )}
            </LinearGradient>

            {/* Perforated divider */}
            <View style={styles.perforationRow}>
              <View style={styles.notchLeft} />
              <View style={styles.dashLine} />
              <View style={styles.notchRight} />
            </View>

            <View style={styles.ticketBottomSection}>
              <View style={styles.qrWrap}>
                <View style={styles.qrBox}>
                  <QRCode
                    value={order.order_code}
                    size={180}
                    backgroundColor="#fff"
                    color="#000"
                  />
                </View>
                <Text style={styles.orderCode}>{order.order_code}</Text>
                <Text style={styles.qrHint}>
                  Tunjukkan barcode ini di lokasi acara
                </Text>
              </View>

              <View style={styles.detailsGrid}>
                {!!order.holder_name && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Nama</Text>
                    <Text style={styles.detailValue}>{order.holder_name}</Text>
                  </View>
                )}
                {!!order.ticket_type && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Jenis Tiket</Text>
                    <Text style={styles.detailValue}>{order.ticket_type}</Text>
                  </View>
                )}
                {!!order.quantity && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Jumlah</Text>
                    <Text style={styles.detailValue}>{order.quantity} tiket</Text>
                  </View>
                )}
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Total Bayar</Text>
                  <Text style={styles.detailValue}>
                    IDR {order.total_price.toLocaleString("id-ID")}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Dibayar Pada</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(order.paid_at)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.noteBox}>
            <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
            <Text style={styles.noteText}>
              Simpan tiket ini dengan baik. Barcode hanya bisa digunakan satu
              kali untuk masuk ke lokasi acara.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  loadingRoot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#141420",
    borderWidth: 1,
    borderColor: "#1f1f28",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "800" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyText: { color: "#6b7280", fontSize: 13 },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#14321f",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 18,
  },
  paidBadgeText: { color: "#4ade80", fontSize: 12, fontWeight: "700" },
  ticketCard: {
    backgroundColor: "#141420",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#1f1f28",
    overflow: "hidden",
  },
  ticketTopSection: { padding: 20, gap: 8 },
  eventName: { color: "#fff", fontSize: 19, fontWeight: "800" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { color: "#c4b5fd", fontSize: 12.5 },
  perforationRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 0,
  },
  notchLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#000",
    marginLeft: -10,
    zIndex: 2,
  },
  notchRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#000",
    marginRight: -10,
    zIndex: 2,
  },
  dashLine: {
    flex: 1,
    height: 1,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#2a2a35",
    marginHorizontal: 4,
  },
  ticketBottomSection: { padding: 20, paddingTop: 26 },
  qrWrap: { alignItems: "center", marginBottom: 22 },
  qrBox: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  orderCode: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  qrHint: {
    color: "#6b7280",
    fontSize: 11.5,
    marginTop: 6,
    textAlign: "center",
  },
  detailsGrid: { gap: 14 },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f28",
  },
  detailLabel: { color: "#6b7280", fontSize: 12.5 },
  detailValue: { color: "#fff", fontSize: 13, fontWeight: "700" },
  noteBox: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 4,
  },
  noteText: { color: "#6b7280", fontSize: 11.5, flex: 1, lineHeight: 17 },
});