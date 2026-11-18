import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import api from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

type NotificationItem = {
  id: number;
  type: "reminder" | "reschedule";
  title: string;
  message: string;
  created_at: string;
  is_read: number;
  concert_id: number;
  concert_title: string;
  admin_name: string;
};

export default function NotificationScreen({ navigation }: any) {
  const [data, setData] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await api.get("/notifications/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data.data || []);
    } catch (err) {
      console.log("Gagal ambil notifikasi", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const openNotif = async (item: NotificationItem) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await api.put(`/notifications/${item.id}/read`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: 1 } : n))
      );
    } catch (err) {
      console.log("Gagal update read", err);
    }

    navigation.navigate("ConcertDetail", { id: item.concert_id });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifikasi</Text>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: "#6b7280" }}>Belum ada notifikasi</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openNotif(item)}
            style={[styles.card, !item.is_read && styles.cardUnread]}
          >
            <View style={styles.cardHeader}>
              <Text
                style={[
                  styles.badge,
                  item.type === "reschedule" ? styles.badgeReschedule : styles.badgeReminder,
                ]}
              >
                {item.type === "reschedule" ? "PENGUNDURAN" : "REMINDER"}
              </Text>
              {!item.is_read && <View style={styles.dot} />}
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>

            <Text style={styles.footer}>
              Dari Admin {item.admin_name} · {item.concert_title}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b13" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "700" },
  card: {
    backgroundColor: "#141420",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  cardUnread: { borderColor: "#7c3aed" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: "hidden",
  },
  badgeReminder: { backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  badgeReschedule: { backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#7c3aed" },
  title: { color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 4 },
  message: { color: "#9ca3af", fontSize: 13, lineHeight: 18 },
  footer: { color: "#6b7280", fontSize: 11, marginTop: 10 },
});