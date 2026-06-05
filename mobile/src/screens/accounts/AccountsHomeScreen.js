import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m-1]} ${y}`;
}

function yesterdayDate() {
  // FIX: toISOString() returns UTC — at midnight PKT this is still the previous day.
  const pktMs = (new Date()).getTime() + 5 * 60 * 60 * 1000;
  const pkt   = new Date(pktMs);
  pkt.setDate(pkt.getUTCDate() - 1);
  return pkt.getUTCFullYear() + '-' + String(pkt.getUTCMonth()+1).padStart(2,'0') + '-' + String(pkt.getUTCDate()).padStart(2,'0');
}

export default function AccountsHomeScreen() {
  const { user, logout } = useAuth();
  const [summary, setSummary]     = useState(null);
  const [pending, setPending]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const name      = user?.employee?.fullName || 'Accounts';
  const firstName = name.split(' ')[0];
  const month     = currentMonth();
  const yesterday = yesterdayDate();

  const loadData = useCallback(async () => {
    try {
      const [summaryRes, pendingRes] = await Promise.allSettled([
        api.get(`/billing/summary?month=${month}`),
        api.get(`/billing/pending?date=${yesterday}`),
      ]);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data?.data || summaryRes.value.data);
      if (pendingRes.status === 'fulfilled') setPending(pendingRes.value.data?.data || pendingRes.value.data);
    } catch (err) {
      console.log('Accounts load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, yesterday]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Accounts Supervisor</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#e57373" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#1A7A4A" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A7A4A']} />}
        >
          {/* Pending rate entry alert */}
          {pending && pending.pendingCount > 0 && (
            <View style={styles.alertCard}>
              <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
              <View style={styles.alertBody}>
                <Text style={styles.alertTitle}>Rate Entry Pending</Text>
                <Text style={styles.alertText}>
                  {pending.pendingCount} meal{pending.pendingCount > 1 ? 's' : ''} from {yesterday} awaiting rates.
                </Text>
              </View>
            </View>
          )}

          {/* Monthly summary */}
          <Text style={styles.sectionTitle}>{monthLabel(month)} Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>
                  Rs. {(summary?.totalEmployeeAmount || 0).toLocaleString()}
                </Text>
                <Text style={styles.summaryLbl}>Employee Billing</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryVal}>
                  Rs. {(summary?.totalOfficialAmount || 0).toLocaleString()}
                </Text>
                <Text style={styles.summaryLbl}>Official Accounts</Text>
              </View>
            </View>
            <View style={styles.summaryRow2}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryVal, { fontSize: 16 }]}>
                  {summary?.totalIssuedCount || 0}
                </Text>
                <Text style={styles.summaryLbl}>Meals Issued</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryVal, { fontSize: 16, color: '#F59E0B' }]}>
                  {summary?.pendingRateCount || 0}
                </Text>
                <Text style={styles.summaryLbl}>Rates Pending</Text>
              </View>
            </View>
          </View>

          {/* Web app notice */}
          <View style={styles.noticeCard}>
            <Ionicons name="desktop-outline" size={20} color="#888" />
            <Text style={styles.noticeText}>
              Use the web app for rate entry, employee statements, and official account billing.
            </Text>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#EBF9F4' },
  topBar:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  greeting:       { fontSize: 13, color: '#888' },
  name:           { fontSize: 20, fontWeight: '700', color: '#042C1E' },
  logoutBtn:      { padding: 8 },
  centeredMsg:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:         { padding: 16 },
  alertCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#F59E0B', elevation: 1 },
  alertBody:      { flex: 1 },
  alertTitle:     { fontSize: 14, fontWeight: '700', color: '#92400E' },
  alertText:      { fontSize: 13, color: '#92400E', marginTop: 2 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: '#042C1E', marginBottom: 10 },
  summaryCard:    { backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 16, elevation: 1 },
  summaryRow:     { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  summaryRow2:    { flexDirection: 'row', paddingVertical: 14 },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryVal:     { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  summaryLbl:     { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  summaryDivider: { width: 1, backgroundColor: '#F0F0F0' },
  noticeCard:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1 },
  noticeText:     { fontSize: 13, color: '#888', flex: 1, lineHeight: 18 },
});
