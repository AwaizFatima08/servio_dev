import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

function todayDate() {
  // FIX: toISOString() returns UTC — at midnight PKT this is still the previous day.
  const pktMs = (new Date()).getTime() + 5 * 60 * 60 * 1000;
  const pkt   = new Date(pktMs);
  return pkt.getUTCFullYear() + '-' + String(pkt.getUTCMonth()+1).padStart(2,'0') + '-' + String(pkt.getUTCDate()).padStart(2,'0');
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

const QUICK_LINKS = [
  { icon: 'people-outline',      label: 'User Management',    note: 'Approvals & roles' },
  { icon: 'person-outline',      label: 'Employee Master',    note: 'View & manage staff' },
  { icon: 'restaurant-outline',  label: 'Menu Management',    note: 'Items & templates' },
  { icon: 'calendar-outline',    label: 'Events',             note: 'Create & publish' },
  { icon: 'receipt-outline',     label: 'Reporting',          note: 'Dashboards & analytics' },
  { icon: 'settings-outline',    label: 'App Settings',       note: 'System configuration' },
];

export default function AdminHomeScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const name      = user?.employee?.fullName || 'Admin';
  const firstName = name.split(' ')[0];
  const today     = todayDate();
  const month     = currentMonth();

  const loadData = useCallback(async () => {
    try {
      const [headcountRes, summaryRes] = await Promise.allSettled([
        api.get(`/reports/daily-headcount?date=${today}`),
        api.get(`/billing/summary?month=${month}`),
      ]);
      const hc = headcountRes.status === 'fulfilled'
        ? (headcountRes.value.data?.data || headcountRes.value.data)
        : null;
      const sm = summaryRes.status === 'fulfilled'
        ? (summaryRes.value.data?.data || summaryRes.value.data)
        : null;
      setStats({ headcount: hc, summary: sm });
    } catch (err) {
      console.log('Admin load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today, month]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const hc = stats?.headcount;
  const sm = stats?.summary;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Admin Dashboard</Text>
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
          {/* Today headcount */}
          <Text style={styles.sectionTitle}>Today's Headcount</Text>
          <View style={styles.headcountCard}>
            {['breakfast', 'lunch', 'dinner'].map((meal, idx, arr) => (
              <React.Fragment key={meal}>
                <View style={styles.hcItem}>
                  <Text style={styles.hcVal}>
                    {hc?.[meal]?.total ?? '—'}
                  </Text>
                  <Text style={styles.hcLabel}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                  {hc?.[meal] && (
                    <Text style={styles.hcSub}>
                      {hc[meal].issued ?? 0} issued
                    </Text>
                  )}
                </View>
                {idx < arr.length - 1 && <View style={styles.hcDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Monthly billing snapshot */}
          {sm && (
            <>
              <Text style={styles.sectionTitle}>This Month</Text>
              <View style={styles.billingCard}>
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Employee Billing</Text>
                  <Text style={styles.billingVal}>
                    Rs. {(sm.totalEmployeeAmount || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.billingDivider} />
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Official Accounts</Text>
                  <Text style={styles.billingVal}>
                    Rs. {(sm.totalOfficialAmount || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.billingDivider} />
                <View style={styles.billingRow}>
                  <Text style={styles.billingLabel}>Meals Issued</Text>
                  <Text style={styles.billingVal}>{sm.totalIssuedCount || 0}</Text>
                </View>
              </View>
            </>
          )}

          {/* Quick links — web app notice */}
          <Text style={styles.sectionTitle}>Quick Reference</Text>
          <View style={styles.quickCard}>
            {QUICK_LINKS.map((item, idx) => (
              <React.Fragment key={item.label}>
                <View style={styles.quickRow}>
                  <View style={styles.quickIcon}>
                    <Ionicons name={item.icon} size={18} color="#1A7A4A" />
                  </View>
                  <View style={styles.quickBody}>
                    <Text style={styles.quickLabel}>{item.label}</Text>
                    <Text style={styles.quickNote}>{item.note}</Text>
                  </View>
                  <Text style={styles.webTag}>Web</Text>
                </View>
                {idx < QUICK_LINKS.length - 1 && <View style={styles.quickDivider} />}
              </React.Fragment>
            ))}
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
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: '#042C1E', marginBottom: 10, marginTop: 4 },
  headcountCard:  { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, marginBottom: 16, elevation: 1 },
  hcItem:         { flex: 1, alignItems: 'center' },
  hcVal:          { fontSize: 24, fontWeight: '700', color: '#042C1E' },
  hcLabel:        { fontSize: 12, color: '#888', marginTop: 3 },
  hcSub:          { fontSize: 11, color: '#1A7A4A', marginTop: 2 },
  hcDivider:      { width: 1, backgroundColor: '#F0F0F0' },
  billingCard:    { backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 16, elevation: 1 },
  billingRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  billingLabel:   { fontSize: 14, color: '#555' },
  billingVal:     { fontSize: 14, fontWeight: '700', color: '#042C1E' },
  billingDivider: { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 16 },
  quickCard:      { backgroundColor: '#fff', borderRadius: 12, padding: 4, elevation: 1 },
  quickRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  quickIcon:      { width: 34, height: 34, borderRadius: 8, backgroundColor: '#EBF9F4', alignItems: 'center', justifyContent: 'center' },
  quickBody:      { flex: 1 },
  quickLabel:     { fontSize: 14, fontWeight: '500', color: '#333' },
  quickNote:      { fontSize: 12, color: '#aaa', marginTop: 1 },
  webTag:         { fontSize: 11, color: '#1A7A4A', fontWeight: '600', backgroundColor: '#EBF9F4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  quickDivider:   { height: 1, backgroundColor: '#F5F5F5', marginLeft: 60 },
});
