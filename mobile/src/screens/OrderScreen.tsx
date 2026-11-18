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

const MAX_TICKETS_PER_CONCERT = 10;

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

const BADGE_STYLE: Record<string, { bg: string; text: string; icon: any }> = {
  PREMIUM: { bg: "#3f2d0d", text: "#fbbf24", icon: "diamond" },
  TERLARIS: { bg: "#3b1f66", text: "#c4b5fd", icon: "flame" },
  REGULER: { bg: "#1f2937", text: "#9ca3af", icon: "ticket" },
};

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

      // Cap total tiket yang lagi dipilih (semua kategori) di 1 checkout ini
      const totalNow = Object.values(prev).reduce((sum, q) => sum + q, 0);
      if (totalNow >= MAX_TICKETS_PER_CONCERT) {
        Alert.alert(
          "Batas Maksimal",
          `Maksimal ${MAX_TICKETS_PER_CONCERT} tiket per akun untuk concert ini`
        );
        return prev;
      }

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

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
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
            <Text style={styles.title}>Pilih Kategori Tiket</Text>
            <Text style={styles.subtitle}>{concert.title}</Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {concert.ticket_categories.map((item: TicketCategory, index: number) => {
            const qty = quantities[keyOf(item.id)] || 0;
            const badgeLabel = getBadgeLabel(item, index);
            const badgeStyle = BADGE_STYLE[badgeLabel] || BADGE_STYLE.REGULER;
            const benefits: string[] = item.benefits || [];
            const isActive = qty > 0;

            return (
              <View
                key={item.id}
                style={[styles.ticketCard, isActive && styles.ticketCardActive]}
              >
                {isActive && (
                  <View style={styles.selectedTag}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}

                <View style={styles.cardTopRow}>
                  <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
                    <Ionicons name={badgeStyle.icon} size={11} color={badgeStyle.text} />
                    <Text style={[styles.badgeText, { color: badgeStyle.text }]}>
                      {badgeLabel}
                    </Text>
                  </View>

                  <Text style={styles.price}>
                    IDR {item.price.toLocaleString("id-ID")}
                  </Text>
                </View>

                <Text style={styles.ticketName}>{item.name}</Text>
                <Text style={styles.remaining}>
                  Sisa {item.remaining_quota} tiket lagi
                </Text>

                {benefits.length > 0 && (
                  <View style={styles.benefitList}>
                    {benefits.map((benefit: string, i: number) => (
                      <View key={i} style={styles.benefitRow}>
                        <Ionicons name="shield-checkmark" size={14} color="#a78bfa" />
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={[
                      styles.qtyBtn,
                      styles.qtyBtnMinus,
                      qty === 0 && styles.qtyBtnDisabled,
                    ]}
                    disabled={qty === 0}
                    onPress={() => decrease(item)}
                  >
                    <Ionicons name="remove" size={18} color="#9ca3af" />
                  </TouchableOpacity>

                  <Text style={styles.qty}>{qty}</Text>

                  <TouchableOpacity
                    disabled={qty >= item.remaining_quota}
                    onPress={() => increase(item)}
                  >
                    <LinearGradient
                      colors={
                        qty >= item.remaining_quota
                          ? ["#33333d", "#33333d"]
                          : ["#a855f7", "#7c3aed"]
                      }
                      style={styles.qtyBtn}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <LinearGradient colors={["transparent", "#0b0b13"]} style={styles.bottomBarWrap}>
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.totalLabel}>Total ({totalTickets} Tiket)</Text>
              <Text style={styles.totalPrice}>
                IDR {totalPrice.toLocaleString("id-ID")}
              </Text>
            </View>

            <TouchableOpacity disabled={checkoutLoading || totalTickets === 0} onPress={checkout}>
              <LinearGradient
                colors={["#a855f7", "#7c3aed"]}
                style={[styles.lanjutBtn, totalTickets === 0 && styles.lanjutBtnDisabled]}
              >
                {checkoutLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.lanjutText}>Lanjut</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
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
  ticketCard: {
    backgroundColor: "#141420",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  ticketCardActive: {
    borderColor: "#7c3aed",
    backgroundColor: "#1a1330",
    shadowColor: "#7c3aed",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  selectedTag: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3, marginLeft: 4 },
  price: { color: "#a78bfa", fontSize: 15, fontWeight: "800", textAlign: "right" },
  ticketName: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  remaining: { color: "#6b7280", fontSize: 13, marginBottom: 12 },
  benefitList: { marginBottom: 14 },
  benefitRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  benefitText: { color: "#9ca3af", fontSize: 13, marginLeft: 8 },
  qtyRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnMinus: {
    backgroundColor: "#1f1f28",
    borderWidth: 1,
    borderColor: "#33333d",
    marginRight: 18,
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qty: { color: "#fff", fontSize: 16, fontWeight: "700", minWidth: 16, textAlign: "center" },
  bottomBarWrap: { paddingTop: 20 },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: "#1f1f28",
  },
  totalLabel: { color: "#6b7280", fontSize: 12, marginBottom: 2 },
  totalPrice: { color: "#fff", fontSize: 20, fontWeight: "800" },
  lanjutBtn: {
    flexDirection: "row",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 32,
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