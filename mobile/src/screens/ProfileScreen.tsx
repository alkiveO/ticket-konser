
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { CommonActions } from "@react-navigation/native";

const BASE_URL = "http://localhost:3000";
const API_URL = `${BASE_URL}/api`;

type Profile = {
  id: number;
  full_name: string;
  email: string;
  avatar: string | null;
  role: string;
};

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const getToken = () => AsyncStorage.getItem("token");

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const res = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data: Profile = res.data.data;
      setProfile(data);
      setFullName(data.full_name);
      setEmail(data.email);
    } catch (err) {
      Alert.alert("Error", "Gagal mengambil data profil");
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (!profile?.avatar) return null;
    return `${BASE_URL}${profile.avatar}`;
  };

  // ======================
  // PICK AND UPLOAD AVATAR
  // ======================
  const pickAndUploadAvatar = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Izin Ditolak",
        "Aplikasi butuh akses galeri untuk mengganti foto profil"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      aspect: [1, 1],
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    try {
      setUploadingAvatar(true);

      const token = await getToken();

      const fileName =
        asset.fileName || `avatar-${Date.now()}.jpg`;

      const formData = new FormData();

      if (Platform.OS === "web") {
        // Khusus Expo Web: ubah URI menjadi Blob
        const response = await fetch(asset.uri);

        if (!response.ok) {
          throw new Error("Gagal membaca file foto");
        }

        const blob = await response.blob();

        formData.append("avatar", blob, fileName);
      } else {
        // Khusus Android/iOS: gunakan format React Native
        const extension = fileName.split(".").pop()?.toLowerCase();

        const mimeType =
          asset.mimeType ||
          (extension === "png"
            ? "image/png"
            : extension === "webp"
              ? "image/webp"
              : "image/jpeg");

        formData.append(
          "avatar",
          {
            uri: asset.uri,
            name: fileName,
            type: mimeType,
          } as any
        );
      }

      const res = await axios.post(
        `${API_URL}/auth/profile/avatar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProfile((prev) =>
        prev ? { ...prev, avatar: res.data.avatar } : prev
      );

      Alert.alert("Berhasil", "Foto profil berhasil diupdate");
    } catch (err: any) {
      console.error(
        "UPLOAD AVATAR ERROR:",
        err.response?.data || err.message
      );

      Alert.alert(
        "Error",
        err.response?.data?.message || "Gagal upload foto profil"
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const startEdit = () => {
    if (profile) {
      setFullName(profile.full_name);
      setEmail(profile.email);
    }
    setIsEditing(true);
  };

  const cancelEdit = () => {
    if (profile) {
      setFullName(profile.full_name);
      setEmail(profile.email);
    }
    setIsEditing(false);
  };

  const saveProfile = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert("Data belum lengkap", "Nama dan email wajib diisi");
      return;
    }

    try {
      setSavingProfile(true);
      const token = await getToken();

      const res = await axios.put(
        `${API_URL}/auth/profile`,
        {
          full_name: fullName.trim(),
          email: email.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setProfile(res.data.data);
      setIsEditing(false);

      Alert.alert("Berhasil", "Profil berhasil diupdate");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Gagal update profil"
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const openPasswordModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalVisible(true);
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        "Data belum lengkap",
        "Semua field password wajib diisi"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Tidak Cocok",
        "Konfirmasi password baru tidak sama"
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Terlalu Pendek",
        "Password baru minimal 6 karakter"
      );
      return;
    }

    try {
      setSavingPassword(true);
      const token = await getToken();

      await axios.put(
        `${API_URL}/auth/profile/password`,
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("Berhasil", "Password berhasil diupdate");

      setPasswordModalVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Gagal update password"
      );
    } finally {
      setSavingPassword(false);
    }
  };

const handleLogout = async () => {
  const confirmLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        })
      );
    } catch (error) {
      console.error("Gagal logout:", error);
      Alert.alert("Error", "Gagal keluar dari akun.");
    }
  };

  if (Platform.OS === "web") {
    const confirmed = window.confirm(
      "Yakin mau keluar dari akun ini?"
    );

    if (confirmed) {
      await confirmLogout();
    }
  } else {
    Alert.alert(
      "Keluar Akun",
      "Yakin mau keluar dari akun ini?",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Ya, Keluar",
          style: "destructive",
          onPress: confirmLogout,
        },
      ]
    );
  }
};

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  const avatarUrl = getAvatarUrl();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#000", "#0a0a0f", "#000"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" color="#fff" size={22} />
          </TouchableOpacity>

          <Text style={styles.title}>Profil Saya</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* AVATAR */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={pickAndUploadAvatar}
              disabled={uploadingAvatar}
            >
              <View style={styles.avatarWrap}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons
                      name="person"
                      size={40}
                      color="#6b7280"
                    />
                  </View>
                )}

                {uploadingAvatar ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : (
                  <View style={styles.avatarEditBadge}>
                    <Ionicons
                      name="camera"
                      size={14}
                      color="#fff"
                    />
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.userName}>
              {profile?.full_name}
            </Text>

            <Text style={styles.avatarHint}>
              Ketuk foto untuk mengganti
            </Text>
          </View>

          {/* INFORMASI AKUN */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Informasi Akun
              </Text>

              {!isEditing && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={startEdit}
                >
                  <Ionicons
                    name="create-outline"
                    size={14}
                    color="#a78bfa"
                  />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isEditing ? (
              <>
                {/* MODE LIHAT */}
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color="#a78bfa"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>
                      Nama Lengkap
                    </Text>
                    <Text style={styles.infoValue}>
                      {profile?.full_name}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Ionicons
                      name="mail-outline"
                      size={16}
                      color="#a78bfa"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>
                      {profile?.email}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.infoRow, { marginBottom: 0 }]}
                  onPress={openPasswordModal}
                  activeOpacity={0.7}
                >
                  <View style={styles.infoIconWrap}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color="#a78bfa"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>
                      Password
                    </Text>
                    <Text style={styles.infoValue}>
                      ••••••••
                    </Text>
                  </View>

                  <View style={styles.changePasswordLink}>
                    <Text style={styles.changePasswordText}>
                      Ubah
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#a78bfa"
                    />
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* MODE EDIT */}
                <Text style={styles.label}>
                  Nama Lengkap
                </Text>

                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nama lengkap"
                  placeholderTextColor="#6b7280"
                  style={styles.input}
                />

                <Text style={styles.label}>Email</Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#6b7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />

                <View style={styles.editActionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={cancelEdit}
                    disabled={savingProfile}
                  >
                    <Text style={styles.cancelBtnText}>
                      Batal
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={savingProfile}
                    onPress={saveProfile}
                    style={{ flex: 1 }}
                  >
                    <LinearGradient
                      colors={["#a855f7", "#7c3aed"]}
                      style={[
                        styles.saveBtn,
                        savingProfile && styles.saveBtnDisabled,
                      ]}
                    >
                      {savingProfile ? (
                        <ActivityIndicator
                          color="#fff"
                          size="small"
                        />
                      ) : (
                        <Text style={styles.saveBtnText}>
                          Simpan Perubahan
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* LOGOUT */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color="#f87171"
            />
            <Text style={styles.logoutBtnText}>
              Keluar Akun
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* MODAL GANTI PASSWORD */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Ubah Password
              </Text>

              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>
              Password Saat Ini
            </Text>

            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Password saat ini"
              placeholderTextColor="#6b7280"
              secureTextEntry
              style={styles.input}
            />

            <Text style={styles.label}>
              Password Baru
            </Text>

            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Password baru"
              placeholderTextColor="#6b7280"
              secureTextEntry
              style={styles.input}
            />

            <Text style={styles.label}>
              Konfirmasi Password Baru
            </Text>

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Ulangi password baru"
              placeholderTextColor="#6b7280"
              secureTextEntry
              style={styles.input}
            />

            <TouchableOpacity
              disabled={savingPassword}
              onPress={savePassword}
              style={{ marginTop: 8 }}
            >
              <LinearGradient
                colors={["#a855f7", "#7c3aed"]}
                style={[
                  styles.saveBtn,
                  savingPassword && styles.saveBtnDisabled,
                ]}
              >
                {savingPassword ? (
                  <ActivityIndicator
                    color="#fff"
                    size="small"
                  />
                ) : (
                  <Text style={styles.saveBtnText}>
                    Update Password
                  </Text>
                )}
              </LinearGradient>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
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
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    position: "relative",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#141420",
    borderWidth: 1,
    borderColor: "#33333d",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 48,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  userName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12,
  },
  avatarHint: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    backgroundColor: "#141420",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1f1f28",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2a1a4d",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#7c3aed",
  },
  editBtnText: {
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f28",
    marginBottom: 4,
  },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#0d0d14",
    justifyContent: "center",
    alignItems: "center",
  },
  infoLabel: {
    color: "#6b7280",
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  changePasswordLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  changePasswordText: {
    color: "#a78bfa",
    fontSize: 12,
    fontWeight: "700",
  },
  label: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#0d0d14",
    borderWidth: 1,
    borderColor: "#33333d",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    marginBottom: 8,
  },
  editActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    backgroundColor: "#0d0d14",
    borderWidth: 1,
    borderColor: "#33333d",
  },
  cancelBtnText: {
    color: "#9ca3af",
    fontWeight: "700",
    fontSize: 14,
  },
  saveBtn: {
    borderRadius: 30,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#141420",
    borderWidth: 1,
    borderColor: "#3f1414",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  logoutBtnText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "700",
  },
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
    padding: 22,
    borderWidth: 1,
    borderColor: "#1f1f28",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0d0d14",
    justifyContent: "center",
    alignItems: "center",
  },
});
