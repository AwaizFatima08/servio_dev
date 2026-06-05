import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch',     label: 'Lunch',     icon: 'partly-sunny-outline' },
  { key: 'dinner',   label: 'Dinner',    icon: 'moon-outline' },
];

function todayDate() {
  // FIX: toISOString() returns UTC — at midnight PKT this is still the previous day.
  const pktMs = (new Date()).getTime() + 5 * 60 * 60 * 1000;
  const pkt   = new Date(pktMs);
  return pkt.getUTCFullYear() + '-' + String(pkt.getUTCMonth()+1).padStart(2,'0') + '-' + String(pkt.getUTCDate()).padStart(2,'0');
}

export default function SupervisorHomeScreen() {
  const { user, logout } = useAuth();
  const [selectedMeal, setSelectedMeal] = useState('lunch');
  const [issuanceData, setIssuanceData] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [issuing, setIssuing]           = useState(null); // reservationId being issued

  const today = todayDate();
  const name  = user?.employee?.fullName || 'Supervisor';
  const firstName = name.split(' ')[0];

  const loadData = useCallback(async (mealType) => {
    setLoading(true);
    setIssuanceData(null);
    try {
      const res = await api.get(`/mess/reservations/issuance-list?date=${today}&mealType=${mealType}`);
      setIssuanceData(res.data);
    } catch (err) {
      console.log('Issuance load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  useEffect(() => { loadData(selectedMeal); }, [selectedMeal, loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(selectedMeal); };

  const handleIssue = async (reservationId) => {
    setIssuing(reservationId);
    try {
      await api.patch(`/mess/reservations/${reservationId}/issue`);
      loadData(selectedMeal);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err.message, [{ text: 'OK' }]);
    } finally {
      setIssuing(null);
    }
  };

  const reservations = issuanceData?.reservations || [];
  const pending = reservations.filter(r => r.issueStatus === 'pending');
  const issued  = reservations.filter(r => r.issueStatus === 'issued');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Mess Supervisor</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#e57373" />
        </TouchableOpacity>
      </View>

      {/* Meal tabs */}
      <View style={styles.tabs}>
        {MEALS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.tab, selectedMeal === m.key && styles.tabActive]}
            onPress={() => setSelectedMeal(m.key)}
          >
            <Ionicons name={m.icon} size={15} color={selectedMeal === m.key ? '#fff' : '#1A7A4A'} />
            <Text style={[styles.tabLabel, selectedMeal === m.key && styles.tabLabelActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary strip */}
      {!loading && issuanceData && (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{reservations.length}</Text>
            <Text style={styles.summaryLbl}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>{pending.length}</Text>
            <Text style={styles.summaryLbl}>Pending</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: '#1A7A4A' }]}>{issued.length}</Text>
            <Text style={styles.summaryLbl}>Issued</Text>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#1A7A4A" />
        </View>
      ) : reservations.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="restaurant-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No reservations for {selectedMeal}.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A7A4A']} />}
        >
          {pending.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Pending Issuance</Text>
              {pending.map((r) => (
                <View key={r.reservationId} style={styles.resCard}>
                  <View style={styles.resInfo}>
                    <Text style={styles.resName}>{r.employeeName}</Text>
                    <Text style={styles.resDetail}>
                      {r.optionLabel} · {r.diningMode === 'dine_in' ? 'Dine In' : 'Takeaway'}
                      {r.quantity > 1 ? ` · ×${r.quantity}` : ''}
                    </Text>
                    <Text style={styles.resEmp}>{r.employeeNumber}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.issueBtn, issuing === r.reservationId && styles.issueBtnDisabled]}
                    onPress={() => handleIssue(r.reservationId)}
                    disabled={issuing === r.reservationId}
                  >
                    {issuing === r.reservationId
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.issueBtnText}>Issue</Text>
                    }
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {issued.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Issued</Text>
              {issued.map((r) => (
                <View key={r.reservationId} style={[styles.resCard, styles.resCardIssued]}>
                  <View style={styles.resInfo}>
                    <Text style={styles.resName}>{r.employeeName}</Text>
                    <Text style={styles.resDetail}>
                      {r.optionLabel} · {r.diningMode === 'dine_in' ? 'Dine In' : 'Takeaway'}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color="#1A7A4A" />
                </View>
              ))}
            </>
          )}
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
  tabs:           { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4, gap: 8 },
  tab:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#1A7A4A' },
  tabActive:      { backgroundColor: '#1A7A4A' },
  tabLabel:       { fontSize: 12, fontWeight: '600', color: '#1A7A4A' },
  tabLabelActive: { color: '#fff' },
  summaryStrip:   { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryVal:     { fontSize: 20, fontWeight: '700', color: '#042C1E' },
  summaryLbl:     { fontSize: 11, color: '#888', marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: '#E8F5EF' },
  centeredMsg:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText:      { fontSize: 14, color: '#aaa' },
  scroll:         { padding: 16 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: '#042C1E', marginBottom: 10, marginTop: 4 },
  resCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1 },
  resCardIssued:  { opacity: 0.7 },
  resInfo:        { flex: 1 },
  resName:        { fontSize: 15, fontWeight: '600', color: '#333' },
  resDetail:      { fontSize: 13, color: '#888', marginTop: 3 },
  resEmp:         { fontSize: 11, color: '#bbb', marginTop: 2 },
  issueBtn:       { backgroundColor: '#1A7A4A', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8 },
  issueBtnDisabled: { backgroundColor: '#a0c4b8' },
  issueBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});
