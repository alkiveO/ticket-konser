import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// API
const API_URL =
  'http://localhost:3000/api/auth';

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

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        'Data Belum Lengkap',
        'Email dan password wajib diisi.',
      );
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/login`, {
        email: email.trim(),
        password,
      });

      if (res.data.success) {
        await AsyncStorage.setItem('token', res.data.token);

        await AsyncStorage.setItem(
          'user',
          JSON.stringify(res.data.data),
        );

        Alert.alert('Berhasil', 'Login berhasil.');

        navigation.replace('Home');
      }
    } catch (error: any) {
      console.log(error.response?.data || error.message);

      const message =
        error.response?.data?.message ||
        'Terjadi kesalahan, coba lagi.';

      Alert.alert('Login Gagal', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Background */}
      <LinearGradient
        colors={['#020204', '#080812', '#030305']}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars */}
      {STARS.map((star, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              top: star.top as any,
              left: star.left as any,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            },
          ]}
        />
      ))}

      <SafeAreaView style={styles.safeArea}>
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
                <Ionicons
                  name="arrow-back"
                  size={21}
                  color="#ffffff"
                />
              </TouchableOpacity>

              <Text style={styles.headerText}>
                Welcome Back
              </Text>

              <View style={styles.headerSpacer} />
            </View>

            {/* Main */}
            <View style={styles.main}>
              {/* Logo */}
              <View style={styles.logoOuter}>
                <LinearGradient
                  colors={['#a855f7', '#7c3aed']}
                  style={styles.logo}
                >
                  <Ionicons
                    name="ticket"
                    size={29}
                    color="#ffffff"
                  />
                </LinearGradient>
              </View>

              {/* Title */}
              <Text style={styles.title}>
                Sign in to your{'\n'}account
              </Text>

              <Text style={styles.subtitle}>
                Enter your details to continue
              </Text>

              {/* Sign Up */}
              <View style={styles.signupRow}>
                <Text style={styles.signupText}>
                  Don't have an account?
                </Text>

                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signupLink}>
                    {' '}Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {/* Email */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Email Address
                  </Text>

                  <View style={styles.inputContainer}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="mail-outline"
                        size={20}
                        color="#8b5cf6"
                      />
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#8b8b96"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.field}>
                  <Text style={styles.label}>
                    Password
                  </Text>

                  <View style={styles.inputContainer}>
                    <View style={styles.iconContainer}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#8b5cf6"
                      />
                    </View>

                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#8b8b96"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                    />

                    <TouchableOpacity
                      onPress={() =>
                        setShowPassword(!showPassword)
                      }
                      style={styles.eyeButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          showPassword
                            ? 'eye-outline'
                            : 'eye-off-outline'
                        }
                        size={20}
                        color="#777783"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.forgotButton}
                >
                  <Text style={styles.forgotText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleLogin}
                  disabled={loading}
                  style={styles.buttonWrapper}
                >
                  <LinearGradient
                    colors={['#a855f7', '#7c3aed']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.loginButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.loginText}>
                        Sign In
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Security Info */}
              <View style={styles.bottomTextContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color="#777783"
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020204',
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

  /* Stars */
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
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    color: '#a1a1aa',
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
    paddingTop: 18,
  },

  /* Logo */
  logoOuter: {
    alignSelf: 'center',
    padding: 5,
    borderRadius: 23,
    backgroundColor: 'rgba(139,92,246,0.12)',
    marginBottom: 20,
  },

  logo: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Typography */
  title: {
    color: '#ffffff',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.7,
  },

  subtitle: {
    color: '#8b8b96',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 9,
  },

  /* Sign Up */
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },

  signupText: {
    color: '#777783',
    fontSize: 13,
  },

  signupLink: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Form */
  form: {
    marginTop: 34,
  },

  field: {
    marginBottom: 19,
  },

  label: {
    color: '#e4e4e7',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 3,
  },

  inputContainer: {
    height: 58,
    borderRadius: 16,
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: '#24242d',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  iconContainer: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: 'rgba(139,92,246,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  input: {
    flex: 1,
    color: '#ffffff',
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

  /* Forgot Password */
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 20,
  },

  forgotText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Sign In */
  buttonWrapper: {
    borderRadius: 17,
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 7,
  },

  loginButton: {
    height: 58,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  /* Bottom */
  bottomTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 6,
  },

  bottomText: {
    color: '#62626c',
    fontSize: 11,
  },
});