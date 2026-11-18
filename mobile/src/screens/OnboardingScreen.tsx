import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingScreen({ navigation }: any) {
  return (
    <View style={styles.root}>
      {/* Ganti source ini dengan foto konser lu, taro di assets/images/ */}
      <ImageBackground
        source={require('../assets/images/onboarding-bg.jpg')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      >
        {/* Overlay gelap biar teks tetap kebaca di atas foto */}
        <LinearGradient
          colors={[
            'rgba(11,10,26,0.35)',
            'rgba(15,10,35,0.55)',
            'rgba(11,10,26,0.92)',
            '#0b0a1a',
          ]}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Glow ungu tipis di atas biar senada sama badge & aksen teks */}
        <LinearGradient
          colors={['rgba(168,85,247,0.25)', 'transparent']}
          style={styles.topGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={{ flex: 1 }} />

          <LinearGradient
            colors={['#a855f7', '#7c3aed']}
            style={styles.iconBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="ticket" size={26} color="#fff" />
          </LinearGradient>

          <Text style={styles.heading}>
            Rasakan <Text style={styles.headingAccent}>Euforia</Text>
            {'\n'}Musik di{'\n'}Tanganmu.
          </Text>

          <Text style={styles.subtext}>
            Platform tiket konser paling eksklusif di Indonesia. Temukan
            event impianmu dengan mudah dan aman.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={{ marginTop: 32 }}
            onPress={() => navigation.navigate('Register')}
          >
            <LinearGradient
              colors={['#c026d3', '#7c3aed']}
              style={styles.ctaButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>Mulai Sekarang</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginText}>
              Sudah punya akun?{' '}
              <Text style={styles.loginLink}>Masuk</Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          <View style={{ flex: 0.5 }} />
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
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#a855f7',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  heading: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    color: '#ffffff',
  },
  headingAccent: { color: '#c084fc' },
  subtext: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 22,
    color: '#d4d4de',
  },
  ctaButton: {
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ctaText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  loginText: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 14,
    color: '#d4d4de',
  },
  loginLink: { color: '#ffffff', fontWeight: '700' },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: { width: 18, backgroundColor: '#a855f7' },
});