import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function ContactUsScreen({ navigation }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get('/app-settings');
      setSettings(res.data?.settings || res.data);
    } catch (err) {
      console.log('Settings load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const call = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`);
  };

  const email = (address) => {
    if (!address) return;
    Linking.openURL(`mailto:${address}`);
  };

  const contacts = settings ? [
    {
      title: 'Club Manager',
      subtitle: 'For bookings, events, and general queries',
      phone: settings.managerPhone,
      emailAddr: settings.managerEmail,
      icon: 'person-outline',
    },
    {
      title: 'Support Email',
      subtitle: 'For app issues and technical support',
      emailAddr: settings.supportEmail,
      icon: 'mail-outline',
    },
  ] : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#042C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#1A7A4A" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.brandBlock}>
            <View style={styles.brandIcon}>
              <Ionicons name="headset-outline" size={32} color="#1A7A4A" />
            </View>
            <Text style={styles.brandTitle}>We're here to help</Text>
            <Text style={styles.brandSub}>Reach out to the club team for any assistance.</Text>
          </View>

          {contacts.map((c, idx) => (
            <View key={idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBox}>
                  <Ionicons name={c.icon} size={20} color="#1A7A4A" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <Text style={styles.cardSub}>{c.subtitle}</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                {c.phone && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => call(c.phone)}>
                    <Ionicons name="call-outline" size={18} color="#1A7A4A" />
                    <Text style={styles.actionBtnText}>{c.phone}</Text>
                  </TouchableOpacity>
                )}
                {c.emailAddr && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => email(c.emailAddr)}>
                    <Ionicons name="mail-outline" size={18} color="#1A7A4A" />
                    <Text style={styles.actionBtnText}>{c.emailAddr}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {!settings && (
            <View style={styles.centeredMsg}>
              <Ionicons name="alert-circle-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>Contact details unavailable.</Text>
            </View>
          )}

          <View style={styles.footerNote}>
            <Text style={styles.footerText}>Powered by Servio · HomiLabs</Text>
            <Text style={styles.footerText}>homilabs.org</Text>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#EBF9F4' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  centeredMsg:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 40 },
  emptyText:    { fontSize: 14, color: '#aaa' },
  scroll:       { padding: 16 },
  brandBlock:   { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  brandIcon:    { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EBF9F4', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#3DBFA0' },
  brandTitle:   { fontSize: 18, fontWeight: '700', color: '#042C1E', marginBottom: 6 },
  brandSub:     { fontSize: 13, color: '#888', textAlign: 'center' },
  card:         { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIconBox:  { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EBF9F4', alignItems: 'center', justifyContent: 'center' },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: '#042C1E' },
  cardSub:      { fontSize: 12, color: '#888', marginTop: 2 },
  actionRow:    { gap: 10 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EBF9F4', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  actionBtnText:{ fontSize: 14, color: '#1A7A4A', fontWeight: '500' },
  footerNote:   { alignItems: 'center', marginTop: 24, gap: 4 },
  footerText:   { fontSize: 12, color: '#bbb' },
});
