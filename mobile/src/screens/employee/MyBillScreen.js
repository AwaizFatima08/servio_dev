import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMyStatement } from '../../services/billingService';

const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function prevMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  if (m === 1) return `${y-1}-12`;
  return `${y}-${String(m-1).padStart(2,'0')}`;
}

function nextMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  if (m === 12) return `${y+1}-01`;
  return `${y}-${String(m+1).padStart(2,'0')}`;
}

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m-1]} ${y}`;
}

export default function MyBillScreen({ navigation }) {
  const [month, setMonth]           = useState(currentMonth());
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = currentMonth();

  const loadData = useCallback(async (m) => {
    setLoading(true);
    setData(null);
    try {
      const res = await getMyStatement(m);
      // response: { success: true, data: { reservations, totalAmount, issuedCount, ... } }
      setData(res.data || res);
    } catch (err) {
      console.log('Bill load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(month); }, [month, loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(month); };

  const reservations   = data?.reservations || [];
  const totalAmount    = data?.totalAmount   ?? 0;
  const issuedCount    = data?.issuedCount   ?? 0;
  const pendingCount   = data?.pendingRateCount ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#042C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bill</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Month selector */}
      <View style={styles.monthBar}>
        <TouchableOpacity onPress={() => setMonth(prevMonth(month))} style={styles.monthArrow}>
          <Ionicons name="chevron-back" size={22} color="#1A7A4A" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
        <TouchableOpacity
          onPress={() => setMonth(nextMonth(month))}
          style={styles.monthArrow}
          disabled={month >= today}
        >
          <Ionicons name="chevron-forward" size={22} color={month >= today ? '#ccc' : '#1A7A4A'} />
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
          {/* Summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>Rs. {totalAmount.toLocaleString()}</Text>
                <Text style={styles.summaryLabel}>Total Amount</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{issuedCount}</Text>
                <Text style={styles.summaryLabel}>Meals Issued</Text>
              </View>
              {pendingCount > 0 && (
                <>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>{pendingCount}</Text>
                    <Text style={styles.summaryLabel}>Rates Pending</Text>
                  </View>
                </>
              )}
            </View>
            {pendingCount > 0 && (
              <View style={styles.pendingNote}>
                <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
                <Text style={styles.pendingNoteText}>
                  {pendingCount} meal{pendingCount > 1 ? 's' : ''} awaiting rate entry. Amount will update once entered.
                </Text>
              </View>
            )}
          </View>

          {/* Reservations list */}
          {reservations.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="receipt-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No records for this month.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Detail</Text>
              {reservations.map((r, idx) => (
                <View key={r.reservationId || idx} style={styles.resRow}>
                  <View style={styles.resLeft}>
                    <Text style={styles.resDate}>{r.reservationDate}</Text>
                    <Text style={styles.resMeal}>{MEAL_LABELS[r.mealType] || r.mealType}</Text>
                  </View>
                  <View style={styles.resMid}>
                    <Text style={styles.resItem} numberOfLines={1}>
                      {r.optionLabel || r.itemName}
                    </Text>
                    <Text style={styles.resMeta}>
                      {r.diningMode === 'dine_in' ? 'Dine In' : 'Takeaway'}
                      {r.quantity > 1 ? ` · ×${r.quantity}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.resAmount, !r.amount && styles.resAmountPending]}>
                    {r.amount ? `Rs. ${r.amount.toLocaleString()}` : 'Pending'}
                  </Text>
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
  container:        { flex: 1, backgroundColor: '#EBF9F4' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  backBtn:          { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  monthBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  monthArrow:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthLabel:       { fontSize: 16, fontWeight: '700', color: '#042C1E' },
  centeredMsg:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBlock:       { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyText:        { fontSize: 14, color: '#aaa' },
  scroll:           { padding: 16 },
  summaryCard:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 1 },
  summaryRow:       { flexDirection: 'row', alignItems: 'center' },
  summaryItem:      { flex: 1, alignItems: 'center' },
  summaryValue:     { fontSize: 20, fontWeight: '700', color: '#042C1E' },
  summaryLabel:     { fontSize: 12, color: '#888', marginTop: 4 },
  summaryDivider:   { width: 1, height: 40, backgroundColor: '#E8F5EF' },
  pendingNote:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  pendingNoteText:  { fontSize: 12, color: '#888', flex: 1 },
  sectionTitle:     { fontSize: 14, fontWeight: '700', color: '#042C1E', marginBottom: 10 },
  resRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, elevation: 1 },
  resLeft:          { width: 70 },
  resDate:          { fontSize: 11, color: '#888' },
  resMeal:          { fontSize: 12, fontWeight: '600', color: '#1A7A4A', marginTop: 2 },
  resMid:           { flex: 1, paddingHorizontal: 10 },
  resItem:          { fontSize: 14, fontWeight: '500', color: '#333' },
  resMeta:          { fontSize: 11, color: '#aaa', marginTop: 2 },
  resAmount:        { fontSize: 14, fontWeight: '700', color: '#042C1E' },
  resAmountPending: { color: '#F59E0B', fontWeight: '500', fontSize: 12 },
});
