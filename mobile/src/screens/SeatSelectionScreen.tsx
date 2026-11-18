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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_URL = "http://localhost:3000/api";

type SeatStatus = "available" | "locked" | "booked";

type Seat = {
  seat_id: number;
  code: string;
  status: SeatStatus;
  price: number;
};

// category_name -> prefix -> seats
type SeatMap = Record<string, Record<string, Seat[]>>;

type OrderItem = {
  id: number;
  ticket_category_id: number;
  ticket_category: string;
  seat_type: "seated" | "standing";
  quantity: number;
  price: number;
  subtotal: number;
};

export default function SeatSelectionScreen({ navigation, route }: any) {
  const { orderId, concertId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [seatMap, setSeatMap] = useState<SeatMap>({});
  // order_item_id -> seat_id[]
  const [selected, setSelected] = useState<Record<number, number[]>>({});

  useEffect(() => {
    loadData();
  }, []);

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

      setOrderItems(orderRes.data.data.items || []);
      setSeatMap(seatRes.data.data || {});
    } catch (err) {
      Alert.alert("Error", "Gagal mengambil data kursi");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Cuma item yang tipe "seated" yang perlu pilih kursi
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
        return { ...prev, [item.id]: current.filter((id) => id !== seat.seat_id) };
      }

      if (current.length >= item.quantity) {
        return prev; // sudah penuh sesuai quantity, abaikan tap
      }

      return { ...prev, [item.id]: [...current, seat.seat_id] };
    });
  };

  const allComplete = useMemo(
    () =>
      seatedItems.length > 0 &&
      seatedItems.every((item) => (selected[item.id]?.length || 0) === item.quantity),
    [seatedItems, selected]
  );

  const submit = async () => {
    if (!allComplete || submitting) return;

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");

      for (const item of seatedItems) {
        await axios.post(
          `${API_URL}/order-items/${item.id}/seats`,
          { seat_ids: selected[item.id] },
          { headers: { Authorization: `Bearer ${token}` } }
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
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#000", "#0a0a0f", "#000"]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" color="#fff" size={22} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Pilih Kursi</Text>
            <Text style={styles.subtitle}>Sesuaikan jumlah kursi dengan tiket kamu</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {seatedItems.map((item) => {
            const categoryMap = seatMap[item.ticket_category] || {};
            const prefixes = Object.keys(categoryMap).sort();
            const selectedCount = selected[item.id]?.length || 0;
            const isFull = selectedCount >= item.quantity;

            return (
              <View key={item.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{item.ticket_category}</Text>
                  <Text
                    style={[
                      styles.sectionCount,
                      selectedCount === item.quantity && styles.sectionCountDone,
                    ]}
                  >
                    {selectedCount}/{item.quantity} dipilih
                  </Text>
                </View>

                {prefixes.length === 0 && (
                  <Text style={styles.emptyText}>Belum ada kursi untuk kategori ini</Text>
                )}

                {prefixes.map((prefix) => (
                  <View key={prefix} style={styles.prefixBlock}>
                    <Text style={styles.prefixLabel}>Baris {prefix}</Text>
                    <View style={styles.seatGrid}>
                      {categoryMap[prefix].map((seat) => {
                        const isSelected = (selected[item.id] || []).includes(
                          seat.seat_id
                        );
                        const isDisabled =
                          seat.status !== "available" || (isFull && !isSelected);

                        return (
                          <TouchableOpacity
                            key={seat.seat_id}
                            disabled={isDisabled}
                            onPress={() => toggleSeat(item, seat)}
                            style={[
                              styles.seat,
                              seat.status === "locked" && styles.seatLocked,
                              seat.status === "booked" && styles.seatBooked,
                              isSelected && styles.seatSelected,
                              isDisabled && !isSelected && styles.seatDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.seatText,
                                isSelected && styles.seatTextSelected,
                              ]}
                            >
                              {seat.code}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            );
          })}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#1f1f28" }]} />
              <Text style={styles.legendText}>Tersedia</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#7c3aed" }]} />
              <Text style={styles.legendText}>Dipilih</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#78350f" }]} />
              <Text style={styles.legendText}>Terkunci</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#7f1d1d" }]} />
              <Text style={styles.legendText}>Terisi</Text>
            </View>
          </View>
        </ScrollView>

        <LinearGradient colors={["transparent", "#0b0b13"]} style={styles.bottomBarWrap}>
          <View style={styles.bottomBar}>
            <TouchableOpacity
              disabled={!allComplete || submitting}
              onPress={submit}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={["#a855f7", "#7c3aed"]}
                style={[
                  styles.lanjutBtn,
                  (!allComplete || submitting) && styles.lanjutBtnDisabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.lanjutText}>Lanjut ke Pembayaran</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color="#fff"
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#141420",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  section: {
    backgroundColor: "#141420",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#1f1f28",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  sectionCount: { color: "#9ca3af", fontSize: 12, fontWeight: "600" },
  sectionCountDone: { color: "#a78bfa" },
  emptyText: { color: "#6b7280", fontSize: 13, textAlign: "center", paddingVertical: 10 },
  prefixBlock: { marginBottom: 14 },
  prefixLabel: { color: "#9ca3af", fontSize: 12, fontWeight: "700", marginBottom: 8 },
  seatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  seat: {
    width: 44,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1f1f28",
    borderWidth: 1,
    borderColor: "#33333d",
    justifyContent: "center",
    alignItems: "center",
  },
  seatSelected: { backgroundColor: "#7c3aed", borderColor: "#a855f7" },
  seatLocked: { backgroundColor: "#3f2d0d", borderColor: "#78350f" },
  seatBooked: { backgroundColor: "#3f1414", borderColor: "#7f1d1d" },
  seatDisabled: { opacity: 0.5 },
  seatText: { color: "#9ca3af", fontSize: 11, fontWeight: "700" },
  seatTextSelected: { color: "#fff" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { color: "#6b7280", fontSize: 12 },
  bottomBarWrap: { paddingTop: 20 },
  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: "#1f1f28",
  },
  lanjutBtn: {
    flexDirection: "row",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#a855f7",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  lanjutBtnDisabled: { opacity: 0.4 },
  lanjutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});