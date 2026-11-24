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
  StatusBar,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { CommonActions } from "@react-navigation/native";
import { useTheme, themes } from "../context/ThemeContext";

const BASE_URL = "http://localhost:3000";
const API_URL = `${BASE_URL}/api`;

const PURPLE = "#a855f7";
const PURPLE_DARK = "#7c3aed";
const ANDROID_TOP = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

type Profile = {
  id: number;
  full_name: string;
  email: string;
  avatar: string | null;
  role: string;
};

const getPasswordStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
};

export default function ProfileScreen({ navigation }: any) {
  const { colors } = useTheme();
  const isDark = colors.statusBar === "light";
  const styles = createStyles(colors, isDark);

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
  const [showPassword, setShowPassword] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

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

      const fileName = asset.fileName || `avatar-${Date.now()}.jpg`;

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

        formData.append("avatar", {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        } as any);
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
    setShowPassword(false);
    setPasswordModalVisible(true);
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Data belum lengkap", "Semua field password wajib diisi");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Tidak Cocok", "Konfirmasi password baru tidak sama");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Terlalu Pendek", "Password baru minimal 6 karakter");
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
      const confirmed = window.confirm("Yakin mau keluar dari akun ini?");

      if (confirmed) {
        await confirmLogout();
      }
    } else {
      Alert.alert("Keluar Akun", "Yakin mau keluar dari akun ini?", [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Ya, Keluar",
          style: "destructive",
          onPress: confirmLogout,
        },
      ]);
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
          <Ionicons name="person" size={28} color={PURPLE} />
        </LinearGradient>
        <ActivityIndicator size="small" color={PURPLE} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Memuat profil...</Text>
      </View>
    );
  }

  const avatarUrl = getAvatarUrl();
  const strength = getPasswordStrength(newPassword);
  const strengthLabel = ["", "Lemah", "Cukup", "Kuat", "Sangat kuat"][strength];
  const strengthColor = ["#6b7280", "#ef4444", "#f59e0b", "#22c55e", "#16a34a"][
    strength
  ];
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const passwordValid =
    !!currentPassword &&
    newPassword.length >= 6 &&
    newPassword === confirmPassword;

  const inputStyle = (key: string) => [
    styles.input,
    focused === key && styles.inputFocused,
  ];

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
            style={styles.back}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" color={colors.text} size={22} />
          </TouchableOpacity>

          <Text style={styles.title}>Profil Saya</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ================= AVATAR ================= */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={pickAndUploadAvatar}
              disabled={uploadingAvatar}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[PURPLE, PURPLE_DARK, "#4c1d95"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}
              >
                <View style={styles.avatarInner}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={42} color={colors.subText} />
                    </View>
                  )}

                  {uploadingAvatar && (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator color="#ffffff" size="small" />
                    </View>
                  )}
                </View>
              </LinearGradient>

              {!uploadingAvatar && (
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={14} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.userName}>{profile?.full_name}</Text>
            <Text style={styles.userEmail}>{profile?.email}</Text>

            {!!profile?.role && (
              <View style={styles.roleBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={11}
                  color={isDark ? "#c4b5fd" : PURPLE_DARK}
                />
                <Text style={styles.roleText}>{profile.role.toUpperCase()}</Text>
              </View>
            )}

            <Text style={styles.avatarHint}>Ketuk foto untuk mengganti</Text>
          </View>

          {/* ================= INFORMASI AKUN ================= */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionBar} />
                <Text style={styles.sectionTitle}>Informasi Akun</Text>
              </View>

              {!isEditing && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={startEdit}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="create-outline"
                    size={14}
                    color={isDark ? "#a78bfa" : PURPLE_DARK}
                  />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isEditing ? (
              <>
                {/* MODE LIHAT */}
                <View style={styles.infoRow}>
                  <LinearGradient
                    colors={["rgba(168,85,247,0.22)", "rgba(124,58,237,0.06)"]}
                    style={styles.infoIconWrap}
                  >
                    <Ionicons name="person-outline" size={16} color={PURPLE} />
                  </LinearGradient>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Nama Lengkap</Text>
                    <Text style={styles.infoValue}>{profile?.full_name}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <LinearGradient
                    colors={["rgba(168,85,247,0.22)", "rgba(124,58,237,0.06)"]}
                    style={styles.infoIconWrap}
                  >
                    <Ionicons name="mail-outline" size={16} color={PURPLE} />
                  </LinearGradient>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{profile?.email}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.infoRow, styles.infoRowLast]}
                  onPress={openPasswordModal}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={["rgba(168,85,247,0.22)", "rgba(124,58,237,0.06)"]}
                    style={styles.infoIconWrap}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color={PURPLE}
                    />
                  </LinearGradient>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Password</Text>
                    <Text style={styles.infoValue}>••••••••</Text>
                  </View>

                  <View style={styles.changePasswordLink}>
                    <Text style={styles.changePasswordText}>Ubah</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={isDark ? "#a78bfa" : PURPLE_DARK}
                    />
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* MODE EDIT */}
                <Text style={styles.label}>Nama Lengkap</Text>

                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nama lengkap"
                  placeholderTextColor={colors.subText}
                  style={inputStyle("name")}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                />

                <Text style={styles.label}>Email</Text>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor={colors.subText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={inputStyle("email")}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                />

                <View style={styles.editActionRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={cancelEdit}
                    disabled={savingProfile}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={savingProfile}
                    onPress={saveProfile}
                    activeOpacity={0.85}
                    style={{ flex: 1 }}
                  >
                    <LinearGradient
                      colors={[PURPLE, PURPLE_DARK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.saveBtn,
                        savingProfile && styles.saveBtnDisabled,
                      ]}
                    >
                      {savingProfile ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* ================= LOGOUT ================= */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color={styles.logoutText.color} />
            <Text style={styles.logoutText}>Keluar Akun</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ================= MODAL GANTI PASSWORD ================= */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setPasswordModalVisible(false)}
            />

            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalTitleWrap}>
                  <View style={styles.modalIcon}>
                    <Ionicons name="lock-closed" size={16} color={PURPLE} />
                  </View>
                  <Text style={styles.modalTitle}>Ubah Password</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setPasswordModalVisible(false)}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={18} color={colors.subText} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Password Saat Ini</Text>

              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Password saat ini"
                placeholderTextColor={colors.subText}
                secureTextEntry={!showPassword}
                style={inputStyle("current")}
                onFocus={() => setFocused("current")}
                onBlur={() => setFocused(null)}
              />

              <Text style={styles.label}>Password Baru</Text>

              <View style={styles.passwordWrap}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Password baru"
                  placeholderTextColor={colors.subText}
                  secureTextEntry={!showPassword}
                  style={[
                    ...inputStyle("new"),
                    { paddingRight: 44, marginBottom: 0 },
                  ]}
                  onFocus={() => setFocused("new")}
                  onBlur={() => setFocused(null)}
                />

                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={colors.subText}
                  />
                </TouchableOpacity>
              </View>

              {newPassword.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthBar,
                          i <= strength && { backgroundColor: strengthColor },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthText, { color: strengthColor }]}>
                    {strengthLabel}
                  </Text>
                </View>
              )}

              <Text style={[styles.label, { marginTop: 12 }]}>
                Konfirmasi Password Baru
              </Text>

              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Ulangi password baru"
                placeholderTextColor={colors.subText}
                secureTextEntry={!showPassword}
                style={[
                  ...inputStyle("confirm"),
                  passwordMismatch && styles.inputError,
                ]}
                onFocus={() => setFocused("confirm")}
                onBlur={() => setFocused(null)}
              />

              {passwordMismatch && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={13} color="#ef4444" />
                  <Text style={styles.errorText}>
                    Konfirmasi password tidak sama
                  </Text>
                </View>
              )}

              <TouchableOpacity
                disabled={savingPassword}
                onPress={savePassword}
                activeOpacity={0.85}
                style={{ marginTop: 14 }}
              >
                <LinearGradient
                  colors={
                    passwordValid || savingPassword
                      ? [PURPLE, PURPLE_DARK]
                      : [colors.border, colors.border]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.saveBtn, savingPassword && styles.saveBtnDisabled]}
                >
                  {savingPassword ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.saveBtnText,
                        !passwordValid && { color: colors.subText },
                      ]}
                    >
                      Update Password
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ========================================= */
/* STYLES */
/* ========================================= */

const createStyles = (colors: typeof themes.dark, isDark: boolean) => {
  const accentText = isDark ? "#c4b5fd" : PURPLE_DARK;
  const inputBg = isDark ? "#0d0d14" : "#f4f4f8";
  const danger = isDark ? "#f87171" : "#dc2626";

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    safe: { flex: 1, paddingTop: ANDROID_TOP },

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
    },
    back: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    title: {
      color: colors.text,
      fontSize: 21,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },

    /* ---------- AVATAR ---------- */
    avatarSection: {
      alignItems: "center",
      marginBottom: 26,
      marginTop: 4,
    },
    avatarRing: {
      width: 108,
      height: 108,
      borderRadius: 54,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: PURPLE,
      shadowOpacity: 0.4,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    avatarInner: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatar: {
      width: 94,
      height: 94,
      borderRadius: 47,
    },
    avatarPlaceholder: {
      width: 94,
      height: 94,
      borderRadius: 47,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarEditBadge: {
      position: "absolute",
      bottom: 2,
      right: 2,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: PURPLE_DARK,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
      borderColor: colors.background,
    },
    userName: {
      color: colors.text,
      fontSize: 19,
      fontWeight: "800",
      marginTop: 14,
      letterSpacing: -0.2,
    },
    userEmail: {
      color: colors.subText,
      fontSize: 13,
      marginTop: 3,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "rgba(168,85,247,0.14)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      marginTop: 10,
    },
    roleText: {
      color: accentText,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
    },
    avatarHint: {
      color: colors.subText,
      fontSize: 11,
      marginTop: 10,
    },

    /* ---------- SECTION ---------- */
    section: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
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
      fontSize: 16,
      fontWeight: "800",
    },
    editBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: isDark ? "#2a1a4d" : "#f3e8ff",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: PURPLE_DARK,
    },
    editBtnText: {
      color: accentText,
      fontSize: 12,
      fontWeight: "700",
    },

    /* ---------- INFO ROW ---------- */
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 4,
    },
    infoIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    infoLabel: {
      color: colors.subText,
      fontSize: 11,
      marginBottom: 2,
    },
    infoValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "700",
    },
    changePasswordLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    changePasswordText: {
      color: accentText,
      fontSize: 12,
      fontWeight: "700",
    },

    /* ---------- FORM ---------- */
    label: {
      color: colors.subText,
      fontSize: 12,
      fontWeight: "600",
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
      marginBottom: 8,
    },
    inputFocused: {
      borderColor: PURPLE,
      backgroundColor: isDark ? "#120d1f" : "#faf5ff",
    },
    inputError: {
      borderColor: "#ef4444",
    },
    editActionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 10,
    },
    cancelBtn: {
      paddingHorizontal: 22,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 16,
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      color: colors.subText,
      fontWeight: "700",
      fontSize: 14,
    },
    saveBtn: {
      borderRadius: 16,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnDisabled: {
      opacity: 0.6,
    },
    saveBtnText: {
      color: "#ffffff",
      fontWeight: "800",
      fontSize: 14,
    },

    /* ---------- LOGOUT ---------- */
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.07)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(239,68,68,0.3)" : "rgba(220,38,38,0.25)",
      borderRadius: 18,
      paddingVertical: 15,
      marginTop: 4,
    },
    logoutText: {
      color: danger,
      fontSize: 14,
      fontWeight: "800",
    },

    /* ---------- MODAL ---------- */
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    modalCard: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 26,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitleWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    modalIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: "rgba(168,85,247,0.14)",
      alignItems: "center",
      justifyContent: "center",
    },
    modalTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "800",
    },
    modalCloseBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },

    /* ---------- PASSWORD ---------- */
    passwordWrap: {
      position: "relative",
      justifyContent: "center",
    },
    eyeBtn: {
      position: "absolute",
      right: 14,
    },
    strengthWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 8,
    },
    strengthBars: {
      flex: 1,
      flexDirection: "row",
      gap: 5,
    },
    strengthBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    strengthText: {
      fontSize: 11,
      fontWeight: "800",
      minWidth: 70,
      textAlign: "right",
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 2,
    },
    errorText: {
      color: "#ef4444",
      fontSize: 11,
      fontWeight: "600",
    },
  });
};