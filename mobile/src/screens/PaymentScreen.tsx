import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";

const API_URL = "http://localhost:3000/api";

type OrderStatus = "pending" | "paid" | "cancelled" | "expired";

type OrderDetail = {
  id: number;
  order_code: string;
  total_price: number;
  status: OrderStatus;
};

export default function PaymentScreen({ navigation, route }: any) {
  const { orderId } = route.params;

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);

  useEffect(() => {
    createPayment();
  }, []);

  const getToken = () => AsyncStorage.getItem("token");

  const createPayment = async () => {
    try {
      setLoading(true);

      const token = await getToken();

      const res = await axios.post(
        `${API_URL}/payments/${orderId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const paymentUrl = res.data.redirect_url;

      await WebBrowser.openBrowserAsync(paymentUrl);

      // Setelah browser Midtrans ditutup (user kembali ke app),
      // langsung cek status order-nya ke backend.
      await checkOrderStatus();
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Gagal membuat pembayaran"
      );
    } finally {
      setLoading(false);
    }
  };

  const checkOrderStatus = async () => {
    try {
      setCheckingStatus(true);

      const token = await getToken();

      const res = await axios.get(`${API_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const order: OrderDetail = res.data.data;
      setOrderDetail(order);

      if (order.status === "paid") {
        setSuccessModalVisible(true);
      } else if (order.status === "expired" || order.status === "cancelled") {
        Alert.alert(
          "Pembayaran Gagal",
          order.status === "expired"
            ? "Waktu pembayaran sudah habis"
            : "Order ini sudah dibatalkan"
        );
        navigation.goBack();
      } else {
        // masih pending
        Alert.alert(
          "Belum Terkonfirmasi",
          "Pembayaran kamu belum terkonfirmasi. Cek lagi jika kamu sudah menyelesaikan pembayaran.",
          [
            { text: "Cek Lagi", onPress: checkOrderStatus },
            { text: "Kembali", style: "cancel", onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Gagal mengecek status pembayaran"
      );
    } finally {
      setCheckingStatus(false);
    }
  };

  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
    navigation.navigate("MyTickets");
  };

  const cancelOrder = async () => {
    Alert.alert(
      "Batalkan Pesanan",
      "Yakin mau batalin pesanan ini?",
      [
        { text: "Tidak", style: "cancel" },
        {
          text: "Ya, Batalkan",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const token = await getToken();
              await axios.put(
                `${API_URL}/orders/${orderId}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              Alert.alert("Berhasil", "Pesanan berhasil dibatalkan");
              navigation.navigate("Home");
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Gagal membatalkan pesanan"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#000", "#0a0a0f", "#000"]}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Ionicons name="card" size={70} color="#a855f7" />

          <Text style={styles.title}>Payment</Text>

          <Text style={styles.subtitle}>
            {checkingStatus
              ? "Mengecek status pembayaran..."
              : "Redirecting to Midtrans Sandbox..."}
          </Text>

          {(loading || checkingStatus) && (
            <ActivityIndicator
              color="#a855f7"
              size="large"
              style={{ marginTop: 30 }}
            />
          )}

          {!loading && !checkingStatus && (
            <>
              <TouchableOpacity style={styles.retryBtn} onPress={checkOrderStatus}>
                <Ionicons name="refresh" size={16} color="#a78bfa" />
                <Text style={styles.retryText}>Cek Status Pembayaran</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={cancelOrder}>
                <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.cancelText}>Batalkan Pesanan</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>

      {/* POPUP PEMBAYARAN BERHASIL */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={72} color="#22c55e" />
            </View>

            <Text style={styles.modalTitle}>Pembayaran Berhasil!</Text>
            <Text style={styles.modalSubtitle}>
              Tiket kamu sudah aktif. Terima kasih sudah melakukan pemesanan.
            </Text>

            {orderDetail && (
              <View style={styles.orderInfoBox}>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoLabel}>Kode Order</Text>
                  <Text style={styles.orderInfoValue}>{orderDetail.order_code}</Text>
                </View>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoLabel}>Total Bayar</Text>
                  <Text style={styles.orderInfoValue}>
                    IDR {orderDetail.total_price.toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity onPress={closeSuccessModal} style={{ width: "100%" }}>
              <LinearGradient
                colors={["#a855f7", "#7c3aed"]}
                style={styles.modalBtn}
              >
                <Text style={styles.modalBtnText}>Lihat Tiket Saya</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.popToTop();
              }}
              style={{ marginTop: 10 }}
            >
              <Text style={styles.modalSecondaryText}>Kembali ke Beranda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },

  safe: {
    flex: 1,
  },

  back: {
    marginTop: 10,
    marginLeft: 20,
    width: 40,
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 20,
  },

  subtitle: {
    color: "#9ca3af",
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },

  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    backgroundColor: "#141420",
    borderWidth: 1,
    borderColor: "#33333d",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  retryText: { color: "#a78bfa", fontSize: 14, fontWeight: "700" },

  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 8,
  },
  cancelText: { color: "#ef4444", fontSize: 13, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#141420",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#22c55e33",
  },
  successIconWrap: { marginBottom: 16 },
  modalTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  modalSubtitle: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  orderInfoBox: {
    width: "100%",
    backgroundColor: "#0d0d14",
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    marginBottom: 22,
  },
  orderInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  orderInfoLabel: { color: "#6b7280", fontSize: 12 },
  orderInfoValue: { color: "#fff", fontSize: 12, fontWeight: "700" },
  modalBtn: {
    width: "100%",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  modalSecondaryText: { color: "#6b7280", fontSize: 13, fontWeight: "600" },
});