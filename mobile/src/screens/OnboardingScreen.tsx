import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  Animated,
  Easing,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const PURPLE = '#a855f7';
const PURPLE_DARK = '#7c3aed';
const ANDROID_TOP = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

const FEATURES = [
  { icon: 'shield-checkmark', label: 'Transaksi aman' },
  { icon: 'flash', label: 'Pesan instan' },
  { icon: 'qr-code', label: 'E-ticket QR' },
];

export default function OnboardingScreen({ navigation }: any) {
  // animasi masuk bertahap
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const headingAnim = useRef(new Animated.Value(0)).current;
  const subAnim = useRef(new Animated.Value(0)).current;
  const featureAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;

  // animasi berulang
  const pulse = useRef(new Animated.Value(0)).current;
  const bgZoom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const enter = (value: Animated.Value) =>
      Animated.timing(value, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

    Animated.stagger(120, [
      enter(badgeAnim),
      enter(headingAnim),
      enter(subAnim),
      enter(featureAnim),
      enter(ctaAnim),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgZoom, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bgZoom, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const rise = (value: Animated.Value) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [24, 0],
        }),
      },
    ],
  });

  const bgScale = bgZoom.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Foto latar bergerak pelan */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ scale: bgScale }] }]}
      >
        {/* Ganti source ini dengan foto konser lu, taro di assets/images/ */}
        <ImageBackground
          source={require('../assets/images/onboarding-bg.jpg')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Overlay gelap biar teks tetap kebaca di atas foto */}
      <LinearGradient
        colors={[
          'rgba(11,10,26,0.35)',
          'rgba(15,10,35,0.55)',
          'rgba(11,10,26,0.92)',
          '#0b0a1a',
        ]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Glow ungu tipis di atas */}
      <LinearGradient
        colors={['rgba(168,85,247,0.28)', 'transparent']}
        style={styles.topGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
      />

      <SafeAreaView style={[styles.safeArea, { paddingTop: ANDROID_TOP }]}>
        <View style={styles.content}>
          <View style={{ flex: 1 }} />

          {/* ICON + GLOW */}
          <Animated.View style={[styles.iconWrap, rise(badgeAnim)]}>
            <Animated.View
              style={[
                styles.iconGlow,
                { opacity: glowOpacity, transform: [{ scale: glowScale }] },
              ]}
            />
            <LinearGradient
              colors={[PURPLE, PURPLE_DARK]}
              style={styles.iconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="ticket" size={26} color="#ffffff" />
            </LinearGradient>

            <View style={styles.tagPill}>
              <Ionicons name="sparkles" size={11} color="#e9d5ff" />
              <Text style={styles.tagText}>TIKET KONSER #1</Text>
            </View>
          </Animated.View>

          {/* HEADING */}
          <Animated.Text style={[styles.heading, rise(headingAnim)]}>
            Rasakan <Text style={styles.headingAccent}>Euforia</Text>
            {'\n'}Musik di{'\n'}Tanganmu.
          </Animated.Text>

          {/* SUBTEXT */}
          <Animated.Text style={[styles.subtext, rise(subAnim)]}>
            Platform tiket konser paling eksklusif di Indonesia. Temukan
            event impianmu dengan mudah dan aman.
          </Animated.Text>

          {/* FEATURES */}
          <Animated.View style={[styles.featureRow, rise(featureAnim)]}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon as any} size={15} color="#d8b4fe" />
                </View>
                <Text style={styles.featureText}>{f.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* CTA */}
          <Animated.View style={rise(ctaAnim)}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ marginTop: 28 }}
              onPress={() => navigation.navigate('Register')}
            >
              <LinearGradient
                colors={['#c026d3', PURPLE_DARK]}
                style={styles.ctaButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaText}>Mulai Sekarang</Text>
                
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.loginButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.loginText}>
                Sudah punya akun? <Text style={styles.loginLink}>Masuk</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          <View style={{ flex: 0.4 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0a1a' },
  safeArea: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },

  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },

  /* ---------- ICON ---------- */
  iconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconGlow: {
    position: 'absolute',
    left: 0,
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: PURPLE,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(168,85,247,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(216,180,254,0.3)',
  },
  tagText: {
    color: '#e9d5ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  /* ---------- TEXT ---------- */
  heading: {
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
    color: '#ffffff',
    letterSpacing: -0.8,
  },
  headingAccent: { color: '#c084fc' },
  subtext: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 23,
    color: '#d4d4de',
  },

  /* ---------- FEATURES ---------- */
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  featureIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(168,85,247,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: '#e4e4ec',
    fontSize: 12,
    fontWeight: '600',
  },

  /* ---------- CTA ---------- */
  ctaButton: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 28,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  ctaText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  loginButton: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  loginText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#d4d4de',
  },
  loginLink: { color: '#ffffff', fontWeight: '800' },

  /* ---------- DOTS ---------- */
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: { width: 18, backgroundColor: PURPLE },
});