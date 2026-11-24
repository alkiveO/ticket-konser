import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

// API
const API_URL = 'http://localhost:3000/api/auth';

const PURPLE = '#a855f7';
const PURPLE_DARK = '#7c3aed';
const ANDROID_TOP = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

// Starfield
const STARS = [
  { top: '6%', left: '12%', size: 2, opacity: 0.5 },
  { top: '10%', left: '78%', size: 3, opacity: 0.4 },
  { top: '14%', left: '45%', size: 2, opacity: 0.3 },
  { top: '18%', left: '88%', size: 2, opacity: 0.5 },
  { top: '22%', left: '25%', size: 3, opacity: 0.4 },
  { top: '26%', left: '60%', size: 2, opacity: 0.3 },
  { top: '9%', left: '55%', size: 2, opacity: 0.4 },
  { top: '15%', left: '8%', size: 2, opacity: 0.5 },
  { top: '30%', left: '15%', size: 2, opacity: 0.35 },
  { top: '33%', left: '82%', size: 3, opacity: 0.4 },
  { top: '4%', left: '35%', size: 2, opacity: 0.4 },
  { top: '20%', left: '68%', size: 2, opacity: 0.3 },
];

const FEATURES = [
  { icon: 'shield-checkmark', label: 'Aman' },
  { icon: 'flash', label: 'Cepat' },
  { icon: 'qr-code', label: 'E-ticket' },
];

const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

const getPasswordStrength = (pw: string) => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
};

type FieldKey = 'name' | 'email' | 'password';

export default function RegisterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const isDark = colors.statusBar === 'light';
  const styles = createStyles(colors, isDark);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<FieldKey | null>(null);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });

  // animasi
  const heroAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const footAnim = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const enter = (v: Animated.Value) =>
      Animated.timing(v, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

    Animated.stagger(130, [enter(heroAnim), enter(cardAnim), enter(footAnim)]).start();

    const loop = (v: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

    loop(twinkle, 2400);
    loop(pulse, 1600);
  }, []);

  const rise = (v: Animated.Value) => ({
    opacity: v,
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [22, 0],
        }),
      },
    ],
  });

  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0],
  });

  const starOpacity = twinkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  // validasi tampilan
  const nameError = !fullName.trim() ? 'Nama lengkap wajib diisi' : '';
  const emailError = !email.trim()
    ? 'Email wajib diisi'
    : !isValidEmail(email)
    ? 'Format email tidak valid'
    : '';
  const passwordError = !password.trim()
    ? 'Password wajib diisi'
    : password.length < 6
    ? 'Password minimal 6 karakter'
    : '';

  const showNameError = touched.name && !!nameError;
  const showEmailError = touched.email && !!emailError;
  const showPasswordError = touched.password && !!passwordError;

  const formFilled = !!fullName.trim() && !!email.trim() && !!password.trim();

  const strength = getPasswordStrength(password);
  const strengthLabel = ['', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][strength];
  const strengthColor = ['#6b7280', '#ef4444', '#f59e0b', '#22c55e', '#16a34a'][
    strength
  ];

  const showSuccessAlert = () => {
    const message = 'Registrasi berhasil. Silakan login.';

    if (Platform.OS === 'web') {
      window.alert(`Registrasi Berhasil\n\n${message}`);
      navigation.replace('Login');
      return;
    }

    Alert.alert(
      'Registrasi Berhasil',
      message,
      [
        {
          text: 'OK',
          onPress: () => navigation.replace('Login'),
        },
      ],
      { cancelable: false }
    );
  };

  const showErrorAlert = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`Register Gagal\n\n${message}`);
      return;
    }

    Alert.alert('Register Gagal', message);
  };

  const handleRegister = async () => {
    if (loading) return;

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setTouched({ name: true, email: true, password: true });

      if (Platform.OS === 'web') {
        window.alert('Data Belum Lengkap\n\nSemua field wajib diisi.');
      } else {
        Alert.alert('Data Belum Lengkap', 'Semua field wajib diisi.');
      }
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/register`, {
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });

      if (res.data.success) {
        showSuccessAlert();
      }
    } catch (error: any) {
      console.log(error.response?.data || error.message);

      const message =
        error.response?.data?.message || 'Terjadi kesalahan, coba lagi.';

      showErrorAlert(message);
    } finally {
      setLoading(false);
    }
  };

  const bgGradient: [string, string, string] = isDark
    ? ['#020204', '#080812', '#030305']
    : ['#f8f7ff', '#f3efff', '#ffffff'];

  const accentIcon = isDark ? '#a78bfa' : PURPLE_DARK;

  const blurField = (key: FieldKey) => {
    setFocused(null);
    setTouched((t) => ({ ...t, [key]: true }));
  };

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Background */}
      <LinearGradient colors={bgGradient} style={StyleSheet.absoluteFill} />

      {/* Glow ungu di atas */}
      <LinearGradient
        colors={[
          isDark ? 'rgba(168,85,247,0.28)' : 'rgba(168,85,247,0.16)',
          'transparent',
        ]}
        style={styles.topGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      {/* Stars */}
      {isDark &&
        STARS.map((star, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                top: star.top as any,
                left: star.left as any,
                width: star.size,
                height: star.size,
                opacity: i % 2 === 0 ? starOpacity : star.opacity,
              },
            ]}
          />
        ))}

      <SafeAreaView style={[styles.safeArea, { paddingTop: ANDROID_TOP }]}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.replace('Onboarding')}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={21} color={colors.text} />
              </TouchableOpacity>

              <Text style={styles.headerText}>Create Account</Text>

              <View style={styles.headerSpacer} />
            </View>

            <View style={styles.main}>
              {/* Hero */}
              <Animated.View style={[styles.hero, rise(heroAnim)]}>
                <View style={styles.logoWrap}>
                  <Animated.View
                    style={[
                      styles.logoGlow,
                      {
                        opacity: glowOpacity,
                        transform: [{ scale: glowScale }],
                      },
                    ]}
                  />
                  <View style={styles.logoOuter}>
                    <LinearGradient
                      colors={[PURPLE, PURPLE_DARK]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.logo}
                    >
                      <Ionicons name="ticket" size={29} color="#ffffff" />
                    </LinearGradient>
                  </View>
                </View>

                <Text style={styles.title}>
                  Create your{'\n'}account
                </Text>

                <Text style={styles.subtitle}>
                  Sign up to start enjoying the experience
                </Text>
              </Animated.View>

              {/* Form card */}
              <Animated.View style={[styles.card, rise(cardAnim)]}>
                {/* Full Name */}
                <View style={styles.field}>
                  <Text style={styles.label}>Full Name</Text>

                  <View
                    style={[
                      styles.inputContainer,
                      focused === 'name' && styles.inputContainerFocused,
                      showNameError && styles.inputContainerError,
                    ]}
                  >
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="person-outline"
                        size={20}
                        color={accentIcon}
                      />
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      placeholderTextColor={colors.subText}
                      value={fullName}
                      onChangeText={setFullName}
                      onFocus={() => setFocused('name')}
                      onBlur={() => blurField('name')}
                      autoCapitalize="words"
                      autoCorrect={false}
                      textContentType="name"
                    />

                    {!!fullName.trim() && (
                      <Ionicons
                        name="checkmark-circle"
                        size={19}
                        color="#22c55e"
                      />
                    )}
                  </View>

                  {showNameError && (
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle" size={13} color="#ef4444" />
                      <Text style={styles.errorText}>{nameError}</Text>
                    </View>
                  )}
                </View>

                {/* Email */}
                <View style={styles.field}>
                  <Text style={styles.label}>Email Address</Text>

                  <View
                    style={[
                      styles.inputContainer,
                      focused === 'email' && styles.inputContainerFocused,
                      showEmailError && styles.inputContainerError,
                    ]}
                  >
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color={accentIcon}
                      />
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.subText}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocused('email')}
                      onBlur={() => blurField('email')}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                    />

                    {!!email && !emailError && (
                      <Ionicons
                        name="checkmark-circle"
                        size={19}
                        color="#22c55e"
                      />
                    )}
                  </View>

                  {showEmailError && (
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle" size={13} color="#ef4444" />
                      <Text style={styles.errorText}>{emailError}</Text>
                    </View>
                  )}
                </View>

                {/* Password */}
                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>

                  <View
                    style={[
                      styles.inputContainer,
                      focused === 'password' && styles.inputContainerFocused,
                      showPasswordError && styles.inputContainerError,
                    ]}
                  >
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color={accentIcon}
                      />
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Create a password"
                      placeholderTextColor={colors.subText}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocused('password')}
                      onBlur={() => blurField('password')}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                    />

                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color={colors.subText}
                      />
                    </TouchableOpacity>
                  </View>

                  {showPasswordError && (
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle" size={13} color="#ef4444" />
                      <Text style={styles.errorText}>{passwordError}</Text>
                    </View>
                  )}

                  {password.length > 0 && (
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
                      <Text
                        style={[styles.strengthText, { color: strengthColor }]}
                      >
                        {strengthLabel}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Register Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleRegister}
                  disabled={loading || !formFilled}
                  style={[
                    styles.buttonWrapper,
                    formFilled && !loading && styles.buttonWrapperActive,
                  ]}
                >
                  <LinearGradient
                    colors={
                      formFilled || loading
                        ? [PURPLE, PURPLE_DARK]
                        : [colors.border, colors.border]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.registerButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.registerText,
                            !formFilled && { color: colors.subText },
                          ]}
                        >
                          Create Account
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Login Link */}
              <Animated.View style={[styles.loginRow, rise(footAnim)]}>
                <Text style={styles.loginTextSmall}>
                  Already have an account?
                </Text>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Login')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loginLink}> Sign In</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Feature chips */}
              <Animated.View style={[styles.featureRow, rise(footAnim)]}>
                {FEATURES.map((f) => (
                  <View key={f.label} style={styles.featureItem}>
                    <Ionicons
                      name={f.icon as any}
                      size={13}
                      color={accentIcon}
                    />
                    <Text style={styles.featureText}>{f.label}</Text>
                  </View>
                ))}
              </Animated.View>

              {/* Security Info */}
              <View style={styles.bottomTextContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={colors.subText}
                />

                <Text style={styles.bottomText}>
                  Your account information is secure
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },

    safeArea: {
      flex: 1,
    },

    keyboard: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 30,
    },

    topGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '45%',
    },

    star: {
      position: 'absolute',
      borderRadius: 999,
      backgroundColor: '#ffffff',
    },

    /* Header */
    header: {
      height: 58,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.07)'
        : colors.card || '#ffffff',
      borderWidth: 1,
      borderColor: isDark
        ? 'rgba(255,255,255,0.08)'
        : colors.border || '#e4e4e7',
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerText: {
      color: colors.subText,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.3,
    },

    headerSpacer: {
      width: 42,
    },

    /* Main */
    main: {
      flex: 1,
      justifyContent: 'center',
      paddingTop: 6,
    },

    hero: {
      alignItems: 'center',
    },

    /* Logo */
    logoWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },

    logoGlow: {
      position: 'absolute',
      width: 64,
      height: 64,
      borderRadius: 24,
      backgroundColor: PURPLE,
    },

    logoOuter: {
      padding: 5,
      borderRadius: 24,
      backgroundColor: isDark
        ? 'rgba(139,92,246,0.14)'
        : 'rgba(168,85,247,0.16)',
    },

    logo: {
      width: 56,
      height: 56,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: PURPLE,
      shadowOpacity: 0.5,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },

    /* Typography */
    title: {
      color: colors.text,
      fontSize: 32,
      lineHeight: 38,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: -0.8,
    },

    subtitle: {
      color: colors.subText,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 9,
      paddingHorizontal: 15,
    },

    /* Card */
    card: {
      marginTop: 26,
      padding: 20,
      borderRadius: 28,
      backgroundColor: isDark ? 'rgba(20,20,32,0.85)' : colors.card || '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border || '#e4e4e7',
      shadowColor: PURPLE_DARK,
      shadowOpacity: isDark ? 0.25 : 0.12,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },

    field: {
      marginBottom: 16,
    },

    label: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 8,
      marginLeft: 3,
    },

    inputContainer: {
      height: 58,
      borderRadius: 16,
      backgroundColor: isDark ? '#111116' : '#f6f5fb',
      borderWidth: 1.5,
      borderColor: isDark ? '#24242d' : colors.border || '#e4e4e7',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
    },

    inputContainerFocused: {
      borderColor: PURPLE,
      backgroundColor: isDark ? '#120d1f' : '#faf5ff',
    },

    inputContainerError: {
      borderColor: '#ef4444',
    },

    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: isDark
        ? 'rgba(139,92,246,0.12)'
        : 'rgba(168,85,247,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },

    input: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      height: '100%',
      paddingVertical: 0,
    },

    eyeButton: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },

    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 6,
      marginLeft: 4,
    },

    errorText: {
      color: '#ef4444',
      fontSize: 11.5,
      fontWeight: '600',
    },

    /* Password strength */
    strengthWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 10,
      marginLeft: 3,
    },

    strengthBars: {
      flex: 1,
      flexDirection: 'row',
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
      fontWeight: '800',
      minWidth: 70,
      textAlign: 'right',
    },

    /* Button */
    buttonWrapper: {
      marginTop: 6,
      borderRadius: 17,
      overflow: 'hidden',
    },

    buttonWrapperActive: {
      shadowColor: '#8b5cf6',
      shadowOpacity: isDark ? 0.4 : 0.25,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
      elevation: 7,
    },

    registerButton: {
      height: 58,
      borderRadius: 17,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

    registerText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.2,
    },

    /* Login link */
    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 22,
    },

    loginTextSmall: {
      color: colors.subText,
      fontSize: 13.5,
    },

    loginLink: {
      color: isDark ? '#c4b5fd' : PURPLE_DARK,
      fontSize: 13.5,
      fontWeight: '800',
    },

    /* Features */
    featureRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
    },

    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(168,85,247,0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(168,85,247,0.15)',
    },

    featureText: {
      color: colors.subText,
      fontSize: 11.5,
      fontWeight: '700',
    },

    /* Bottom */
    bottomTextContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 22,
      gap: 6,
    },

    bottomText: {
      color: colors.subText,
      fontSize: 11,
    },
  });