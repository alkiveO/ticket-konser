
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
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import { useTheme, themes } from "../context/ThemeContext";

const API_URL = "http://localhost:3000/api";

const PURPLE = "#a855f7";
const PURPLE_DARK = "#7c3aed";
const ANDROID_TOP =
  Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

type OrderStatus = "pending" | "paid" | "cancelled" | "expired";

type OrderDetail = {
  id: number;
  order_code: string;
  total_price: number;
  status: OrderStatus;
};

export default function PaymentScreen({ navigation, route }: any) {
  const { orderId } = route.params;

  const { colors } = useTheme();
  const isDark = colors.statusBar === "light";
  const styles = createStyles(colors, isDark);

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
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

      if (!paymentUrl) {
        throw new Error("URL pembayaran tidak ditemukan");
      }

      await WebBrowser.openBrowserAsync(paymentUrl);

      // Setelah browser Midtrans ditutup, cek status order.
      await checkOrderStatus();
    } catch (err: any) {
      console.log(
        "Create payment error:",
        err.response?.data || err.message
      );

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const order: OrderDetail = res.data.data;
      setOrderDetail(order);

      if (order.status === "paid") {
        setSuccessModalVisible(true);
      } else if (
        order.status === "expired" ||
        order.status === "cancelled"
      ) {
        Alert.alert(
          "Pembayaran Gagal",
          order.status === "expired"
            ? "Waktu pembayaran sudah habis"
            : "Order ini sudah dibatalkan"
        );

        navigation.goBack();
      } else {
        Alert.alert(
          "Belum Terkonfirmasi",
          "Pembayaran kamu belum terkonfirmasi. Cek lagi jika kamu sudah menyelesaikan pembayaran.",
          [
            {
              text: "Cek Lagi",
              onPress: checkOrderStatus,
            },
            {
              text: "Kembali",
              style: "cancel",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err: any) {
      console.log(
        "Check payment status error:",
        err.response?.data || err.message
      );

      Alert.alert(
        "Error",
        err.response?.data?.message ||
          "Gagal mengecek status pembayaran"
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
    if (loading) return;

    try {
      setLoading(true);

      const token = await getToken();

      await axios.put(
        `${API_URL}/orders/${orderId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCancelModalVisible(false);

      Alert.alert("Berhasil", "Pesanan berhasil dibatalkan");

      navigation.navigate("Home");
    } catch (err: any) {
      console.log(
        "Cancel order error:",
        err.response?.data || err.message
      );

      Alert.alert(
        "Gagal Membatalkan",
        err.response?.data?.message ||
          "Pesanan gagal dibatalkan. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="card" size={48} color={PURPLE} />
          </View>

          <Text style={styles.title}>Payment</Text>

          <Text style={styles.subtitle}>
            {checkingStatus
              ? "Mengecek status pembayaran..."
              : "Redirecting to Midtrans Sandbox..."}
          </Text>

          {(loading || checkingStatus) && (
            <ActivityIndicator
              color={PURPLE}
              size="large"
              style={{ marginTop: 30 }}
            />
          )}

          {!loading && !checkingStatus && (
            <>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={checkOrderStatus}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="refresh"
                  size={16}
                  color={isDark ? "#a78bfa" : PURPLE_DARK}
                />
                <Text style={styles.retryText}>
                  Cek Status Pembayaran
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCancelModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color="#ef4444"
                />
                <Text style={styles.cancelText}>
                  Batalkan Pesanan
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>

      {/* MODAL PEMBAYARAN BERHASIL */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIconWrap}>
              <Ionicons
                name="checkmark-circle"
                size={72}
                color="#22c55e"
              />
            </View>

            <Text style={styles.modalTitle}>
              Pembayaran Berhasil!
            </Text>

            <Text style={styles.modalSubtitle}>
              Tiket kamu sudah aktif. Terima kasih sudah melakukan
              pemesanan.
            </Text>

            {orderDetail && (
              <View style={styles.orderInfoBox}>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoLabel}>
                    Kode Order
                  </Text>

                  <Text style={styles.orderInfoValue}>
                    {orderDetail.order_code}
                  </Text>
                </View>

                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoLabel}>
                    Total Bayar
                  </Text>

                  <Text style={styles.orderInfoValue}>
                    IDR{" "}
                    {Number(orderDetail.total_price).toLocaleString(
                      "id-ID"
                    )}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={closeSuccessModal}
              style={{ width: "100%" }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[PURPLE, PURPLE_DARK]}
                style={styles.modalBtn}
              >
                <Text style={styles.modalBtnText}>
                  Lihat Tiket Saya
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.popToTop();
              }}
              style={{ marginTop: 12 }}
            >
              <Text style={styles.modalSecondaryText}>
                Kembali ke Beranda
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL KONFIRMASI PEMBATALAN */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loading) {
            setCancelModalVisible(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.cancelIconWrap}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color="#ef4444"
              />
            </View>

            <Text style={styles.modalTitle}>
              Batalkan Pesanan?
            </Text>

            <Text style={styles.modalSubtitle}>
              Kamu yakin ingin membatalkan pesanan ini? Tindakan ini
              tidak dapat dibatalkan.
            </Text>

            <TouchableOpacity
              disabled={loading}
              onPress={cancelOrder}
              activeOpacity={0.85}
              style={{ width: "100%", marginTop: 24 }}
            >
              <View style={styles.confirmCancelBtn}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmCancelText}>
                    Ya, Batalkan Pesanan
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={loading}
              onPress={() => setCancelModalVisible(false)}
              style={{ marginTop: 16 }}
            >
              <Text style={styles.modalSecondaryText}>
                Tidak, Kembali
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ========================================= */
/* STYLES */
/* ========================================= */

const createStyles = (
  colors: typeof themes.dark,
  isDark: boolean
) => {
  const accentText = isDark ? "#a78bfa" : PURPLE_DARK;

  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    safe: {
      flex: 1,
      paddingTop: ANDROID_TOP,
    },

    back: {
      marginTop: 10,
      marginLeft: 20,
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },

    content: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 30,
    },

    iconWrap: {
      width: 90,
      height: 90,
      borderRadius: 28,
      backgroundColor: "rgba(168,85,247,0.12)",
      borderWidth: 1,
      borderColor: "rgba(168,85,247,0.25)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },

    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "800",
      marginTop: 16,
      letterSpacing: -0.4,
    },

    subtitle: {
      color: colors.subText,
      fontSize: 15,
      textAlign: "center",
      marginTop: 10,
      lineHeight: 22,
    },

    retryBtn: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 30,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 30,
      gap: 8,
    },

    retryText: {
      color: accentText,
      fontSize: 14,
      fontWeight: "700",
    },

    cancelBtn: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 14,
      paddingHorizontal: 18,
      paddingVertical: 10,
      gap: 8,
    },

    cancelText: {
      color: "#ef4444",
      fontSize: 13,
      fontWeight: "700",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: isDark
        ? "rgba(0,0,0,0.75)"
        : "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },

    modalCard: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },

    successIconWrap: {
      marginBottom: 16,
    },

    cancelIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: "rgba(239,68,68,0.12)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },

    modalTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "800",
      textAlign: "center",
    },

    modalSubtitle: {
      color: colors.subText,
      fontSize: 13,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 20,
    },

    orderInfoBox: {
      width: "100%",
      backgroundColor: isDark
        ? "#0d0d14"
        : "rgba(0,0,0,0.04)",
      borderRadius: 14,
      padding: 14,
      marginTop: 20,
      marginBottom: 22,
      borderWidth: 1,
      borderColor: colors.border,
    },

    orderInfoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
    },

    orderInfoLabel: {
      color: colors.subText,
      fontSize: 12,
    },

    orderInfoValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700",
    },

    modalBtn: {
      width: "100%",
      borderRadius: 30,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    modalBtnText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: 15,
    },

    confirmCancelBtn: {
      width: "100%",
      backgroundColor: "#ef4444",
      borderRadius: 30,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },

    confirmCancelText: {
      color: "#ffffff",
      fontWeight: "800",
      fontSize: 14,
    },

    modalSecondaryText: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: "600",
    },
  });
};
