import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  ScrollView, Modal, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Disclaimer text ──────────────────────────────────────────────────────────

const DISCLAIMER_SECTIONS = [
  {
    title: '1. Voluntary Use',
    body: 'Use of Servio is entirely voluntary. By registering, you acknowledge that you are doing so of your own accord and accept full responsibility for your account activity.',
  },
  {
    title: '2. Data Privacy',
    body: 'Your personal information — including name, employee number, contact details, and usage data — is collected solely for club service management. This data will not be shared with any third party, used for commercial purposes, or disclosed outside FFL Management Club operations without your consent. Accuracy of profile information is your responsibility.',
  },
  {
    title: '3. Billing Accuracy',
    body: 'Meal charges are calculated based on issued meals and rates entered by the accounts team. While every effort is made to ensure accuracy, errors may occasionally occur. Any billing discrepancy must be reported to the club team for correction. Servio and HomiLabs bear no financial liability for billing errors.',
  },
  {
    title: '4. Service Availability',
    body: 'Servio is a product of HomiLabs Solutions SMC Private Limited. Services may be modified, suspended, or withdrawn at any time with prior notice. HomiLabs reserves the right to update these terms.',
  },
  {
    title: '5. Account Suspension',
    body: 'The club administrator reserves the right to suspend or deactivate your account in the event of any violation of club policies, misuse of the system, or conduct deemed inappropriate by club management.',
  },
  {
    title: '6. Data Confidentiality',
    body: 'Screenshots or data exports from the app must not be shared outside the organisation. Family member data entered is your responsibility to keep accurate and up to date.',
  },
  {
    title: '7. No Warranty',
    body: 'Servio is provided as-is. HomiLabs makes no guarantees regarding uninterrupted availability or complete absence of errors.',
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { login } = useAuth();

  // View: 'login' | 'forgot' | 'signup'
  const [view, setView] = useState('login');

  // Login
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);

  // Forgot password
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent]   = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Signup
  const [signupEmployeeNo, setSignupEmployeeNo] = useState('');
  const [signupEmail, setSignupEmail]           = useState('');
  const [signupPass, setSignupPass]             = useState('');
  const [signupShowPass, setSignupShowPass]     = useState(false);
  const [signupLoading, setSignupLoading]       = useState(false);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // ── Login ──
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const cred  = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await cred.user.getIdToken(true);
      await AsyncStorage.setItem('token', token);
      const res = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      await login(token, res.data);
    } catch (err) {
      let msg = 'Login failed. Please try again.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Incorrect email or password.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please try again later.';
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ──
  const handleReset = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Enter Email', 'Please enter your registered email address.');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSent(true);
    } catch (err) {
      let msg = 'Could not send reset email.';
      if (err.code === 'auth/user-not-found') msg = 'No account found with this email.';
      if (err.code === 'auth/invalid-email')  msg = 'Please enter a valid email address.';
      Alert.alert('Error', msg);
    } finally {
      setResetLoading(false);
    }
  };

  // ── Signup ──
  const handleSignup = async () => {
    if (!signupEmployeeNo.trim() || !signupEmail.trim() || !signupPass.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (!disclaimerAccepted) {
      Alert.alert('Terms Required', 'Please read and accept the Terms of Use to continue.');
      return;
    }
    if (signupPass.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    setSignupLoading(true);
    try {
      const cred  = await createUserWithEmailAndPassword(auth, signupEmail.trim(), signupPass);
      const token = await cred.user.getIdToken(true);
      // Register with backend
      await api.post('/auth/register', {
        officialEmployeeNumber: signupEmployeeNo.trim().toUpperCase().replace(/-/g, ''),
        personalEmail: signupEmail.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } });

      await AsyncStorage.setItem('token', token);
      const res = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      await login(token, res.data);
    } catch (err) {
      let msg = 'Registration failed.';
      if (err.code === 'auth/email-already-in-use') msg = 'An account with this email already exists.';
      if (err.code === 'auth/invalid-email')        msg = 'Please enter a valid email address.';
      if (err.code === 'auth/weak-password')        msg = 'Password must be at least 6 characters.';
      if (err.response?.data?.message)              msg = err.response.data.message;
      Alert.alert('Registration Failed', msg);
    } finally {
      setSignupLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Logo block ── */}
        <View style={styles.logoBlock}>
          <Image
            source={require('../../../assets/servio-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoTagline}>Every meal, every service, every event;</Text>
          <Text style={styles.logoTagline}>perfectly managed.</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>

          {/* ════ LOGIN ════ */}
          {view === 'login' && (
            <>
              <Text style={styles.cardTitle}>Sign In</Text>
              <Text style={styles.cardSubtitle}>FFL Management Club</Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={styles.passInput}
                  placeholder="Password"
                  placeholderTextColor="#bbb"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => { setView('forgot'); setResetEmail(email); setResetSent(false); }}
              >
                <Text style={styles.forgotLinkText}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Sign In</Text>
                }
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>New to Servio? </Text>
                <TouchableOpacity onPress={() => setView('signup')}>
                  <Text style={styles.switchLink}>Create account</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ════ FORGOT PASSWORD ════ */}
          {view === 'forgot' && (
            <>
              <TouchableOpacity onPress={() => setView('login')} style={styles.backRow}>
                <Ionicons name="arrow-back" size={18} color="#1A7A4A" />
                <Text style={styles.backText}>Back to Sign In</Text>
              </TouchableOpacity>

              <Text style={styles.cardTitle}>Reset Password</Text>
              <Text style={styles.cardSubtitle}>
                We'll send a reset link to your registered email.
              </Text>

              {resetSent ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle-outline" size={32} color="#1A7A4A" />
                  <Text style={styles.successText}>
                    Reset email sent to {resetEmail}. Check your inbox.
                  </Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setView('login')}>
                    <Text style={styles.primaryBtnText}>Back to Sign In</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your@email.com"
                    placeholderTextColor="#bbb"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                  />
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleReset}
                    disabled={resetLoading}
                  >
                    {resetLoading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                    }
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* ════ SIGNUP ════ */}
          {view === 'signup' && (
            <>
              <TouchableOpacity onPress={() => setView('login')} style={styles.backRow}>
                <Ionicons name="arrow-back" size={18} color="#1A7A4A" />
                <Text style={styles.backText}>Back to Sign In</Text>
              </TouchableOpacity>

              <Text style={styles.cardTitle}>Create Account</Text>
              <Text style={styles.cardSubtitle}>FFL Management Club employees only.</Text>

              <Text style={styles.label}>Employee Number</Text>
              <TextInput
                style={styles.input}
                placeholder="FFL00001"
                placeholderTextColor="#bbb"
                autoCapitalize="characters"
                value={signupEmployeeNo}
                onChangeText={setSignupEmployeeNo}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@fatima-group.com"
                placeholderTextColor="#bbb"
                autoCapitalize="none"
                keyboardType="email-address"
                value={signupEmail}
                onChangeText={setSignupEmail}
              />

              <Text style={styles.label}>Password</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={styles.passInput}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#bbb"
                  secureTextEntry={!signupShowPass}
                  value={signupPass}
                  onChangeText={setSignupPass}
                />
                <TouchableOpacity onPress={() => setSignupShowPass(!signupShowPass)} style={styles.eyeBtn}>
                  <Ionicons name={signupShowPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Disclaimer checkbox */}
              <TouchableOpacity
                style={styles.disclaimerRow}
                onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
              >
                <View style={[styles.checkbox, disclaimerAccepted && styles.checkboxActive]}>
                  {disclaimerAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.disclaimerText}>
                  I have read and accept the{' '}
                  <Text
                    style={styles.disclaimerLink}
                    onPress={() => setDisclaimerVisible(true)}
                  >
                    Terms of Use
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, !disclaimerAccepted && styles.primaryBtnDisabled]}
                onPress={handleSignup}
                disabled={signupLoading || !disclaimerAccepted}
              >
                {signupLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>Create Account</Text>
                }
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => setView('login')}>
                  <Text style={styles.switchLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </View>

        {/* ── HomiLabs footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Servio</Text>
          <Text style={styles.footerText}>
            Developed by HomiLabs Solutions · homilabs.org
          </Text>
          <Text style={styles.footerText}>
            Managed by Awaiz Fatima · Muhammad Abdulhadi · Parishay Zainab
          </Text>
        </View>

      </ScrollView>

      {/* ── Disclaimer modal ── */}
      <Modal
        visible={disclaimerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDisclaimerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms of Use</Text>
              <TouchableOpacity onPress={() => setDisclaimerVisible(false)}>
                <Ionicons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalIntro}>
              Servio — FFL Management Club · HomiLabs Solutions SMC Private Limited
            </Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {DISCLAIMER_SECTIONS.map((s, i) => (
                <View key={i} style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{s.title}</Text>
                  <Text style={styles.modalSectionBody}>{s.body}</Text>
                </View>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => { setDisclaimerAccepted(true); setDisclaimerVisible(false); }}
            >
              <Text style={styles.acceptBtnText}>I Accept These Terms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#042C1E' },
  scroll:             { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 40 },

  // Logo block
  logoBlock:          { alignItems: 'center', marginBottom: 28 },
  logoImage:          { width: 120, height: 120, marginBottom: 12 },
  logoTagline:        { fontSize: 12, color: '#3DBFA0', textAlign: 'center', marginTop: 2 },

  // Card
  card:               { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  cardTitle:          { fontSize: 22, fontWeight: '700', color: '#042C1E', marginBottom: 4 },
  cardSubtitle:       { fontSize: 13, color: '#888', marginBottom: 20 },

  // Back row
  backRow:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText:           { fontSize: 14, color: '#1A7A4A', fontWeight: '500' },

  // Labels + inputs
  label:              { fontSize: 13, color: '#555', fontWeight: '500', marginBottom: 6 },
  input:              { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 15, color: '#333', marginBottom: 14, backgroundColor: '#FAFAFA' },
  passRow:            { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, backgroundColor: '#FAFAFA', marginBottom: 6 },
  passInput:          { flex: 1, padding: 14, fontSize: 15, color: '#333' },
  eyeBtn:             { paddingHorizontal: 14 },

  // Forgot link
  forgotLink:         { alignSelf: 'flex-end', marginBottom: 16, marginTop: 2 },
  forgotLinkText:     { fontSize: 13, color: '#1A7A4A', fontWeight: '500' },

  // Primary button
  primaryBtn:         { backgroundColor: '#1A7A4A', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { backgroundColor: '#a0c4b8' },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Switch row
  switchRow:          { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  switchText:         { fontSize: 13, color: '#888' },
  switchLink:         { fontSize: 13, color: '#1A7A4A', fontWeight: '600' },

  // Success box
  successBox:         { alignItems: 'center', gap: 12, paddingVertical: 8 },
  successText:        { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20 },

  // Disclaimer
  disclaimerRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10, marginBottom: 4 },
  checkbox:           { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxActive:     { backgroundColor: '#1A7A4A', borderColor: '#1A7A4A' },
  disclaimerText:     { fontSize: 13, color: '#555', flex: 1, lineHeight: 20 },
  disclaimerLink:     { color: '#1A7A4A', fontWeight: '600', textDecorationLine: 'underline' },

  // Footer
  footer:             { alignItems: 'center', marginTop: 24, gap: 4 },
  footerText:         { fontSize: 11, color: '#3DBFA0', textAlign: 'center' },

  // Disclaimer modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox:           { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  modalIntro:         { fontSize: 12, color: '#888', marginBottom: 14 },
  modalScroll:        { maxHeight: 420 },
  modalSection:       { marginBottom: 16 },
  modalSectionTitle:  { fontSize: 14, fontWeight: '700', color: '#042C1E', marginBottom: 4 },
  modalSectionBody:   { fontSize: 13, color: '#555', lineHeight: 20 },
  acceptBtn:          { backgroundColor: '#1A7A4A', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  acceptBtnText:      { color: '#fff', fontSize: 15, fontWeight: '700' },
});
