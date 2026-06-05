import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMyReservations, cancelReservation } from '../../services/messService';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_ORDER  = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS  = { breakfast: 'sunny-outline', lunch: 'partly-sunny-outline', dinner: 'moon-outline' };
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

const CANCEL_REASONS = [
  { key: 'employee_request', label: 'My own request' },
  { key: 'employee_absent',  label: 'Will be absent' },
  { key: 'official_duty',    label: 'Official duty' },
  { key: 'medical',          label: 'Medical' },
  { key: 'other',            label: 'Other' },
];

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDisplayDate(iso) {
  const [y, m, d] = iso.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${days[date.getDay()]}, ${parseInt(d)} ${MONTH_SHORT[parseInt(m)-1]}`;
}

function todayISO() {
  // FIX: toISOString() returns UTC, which at midnight PKT is still the
  // previous day. Convert to PKT (Asia/Karachi) to get the correct local date.
  const pktMs = (new Date()).getTime() + 5 * 60 * 60 * 1000;
  const pkt   = new Date(pktMs);
  const y = pkt.getUTCFullYear();
  const m = String(pkt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(pkt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function groupByDate(reservations) {
  const map = {};
  reservations.forEach(r => {
    if (!map[r.reservationDate]) map[r.reservationDate] = [];
    map[r.reservationDate].push(r);
  });
  Object.keys(map).forEach(date => {
    map[date].sort((a, b) =>
      MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType)
    );
  });
  return Object.keys(map).sort().map(date => ({ date, items: map[date] }));
}

function statusColor(r) {
  if (r.reservationStatus === 'cancelled') return '#e57373';
  if (r.issueStatus === 'issued')           return '#1A7A4A';
  if (r.issueStatus === 'no_show')          return '#e57373';
  return '#F59E0B';
}

function statusLabel(r) {
  if (r.reservationStatus === 'cancelled') return 'Cancelled';
  if (r.issueStatus === 'issued')           return 'Issued';
  if (r.issueStatus === 'no_show')          return 'No Show';
  return 'Pending';
}

function canCancel(r) {
  if (r.reservationStatus === 'cancelled') return false;
  if (r.issueStatus === 'issued')           return false;
  if (r.issueStatus === 'no_show')          return false;
  return true;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MyBookingsScreen() {
  const [allReservations, setAllReservations] = useState([]);
  const [grouped, setGrouped]                 = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [filter, setFilter]                   = useState('upcoming');

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('employee_request');
  const [cancelling, setCancelling]     = useState(false);

  const today = todayISO();

  const loadData = useCallback(async () => {
    try {
      const data = await getMyReservations();
      const all  = data.reservations || [];
      setAllReservations(all);
      applyFilter(filter, all, today);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, today]);

  const applyFilter = (f, reservations, todayDate) => {
    let filtered;
    if (f === 'upcoming') {
      filtered = reservations.filter(
        r => r.reservationDate >= todayDate && r.reservationStatus === 'active'
      );
      setGrouped(groupByDate(filtered).sort((a,b) => a.date.localeCompare(b.date)));
    } else {
      // History — past issued meals, sorted newest first
      filtered = reservations.filter(
        r => r.reservationDate < todayDate || r.issueStatus === 'issued'
      );
      setGrouped(groupByDate(filtered).sort((a,b) => b.date.localeCompare(a.date)));
    }
  };

  useEffect(() => { loadData(); }, [loadData]);

  const onFilterChange = (f) => {
    setFilter(f);
    applyFilter(f, allReservations, today);
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const openCancel = (reservation) => {
    setCancelTarget(reservation);
    setCancelReason('employee_request');
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelReservation(cancelTarget.reservationId, cancelReason);
      setCancelTarget(null);
      setLoading(true);
      loadData();
      Alert.alert('Cancelled', 'Your booking has been cancelled.', [{ text: 'OK' }]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Cancellation failed.', [{ text: 'OK' }]);
    } finally {
      setCancelling(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
          onPress={() => onFilterChange('upcoming')}
        >
          <Text style={[styles.filterTabText, filter === 'upcoming' && styles.filterTabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'history' && styles.filterTabActive]}
          onPress={() => onFilterChange('history')}
        >
          <Text style={[styles.filterTabText, filter === 'history' && styles.filterTabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#1A7A4A" />
        </View>
      ) : grouped.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            {filter === 'upcoming' ? 'No upcoming bookings.' : 'No meal history yet.'}
          </Text>
          {filter === 'upcoming' && (
            <Text style={styles.emptySubtext}>
              Use Book Meal to make a reservation.
            </Text>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A7A4A']} />}
        >
          {grouped.map(({ date, items }) => (
            <View key={date} style={styles.dayBlock}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>
                  {date === today ? 'Today' : formatDisplayDate(date)}
                </Text>
                <Text style={styles.dayDate}>{date}</Text>
              </View>

              {items.map((r) => (
                <View key={r.reservationId} style={styles.resRow}>
                  <View style={styles.resLeft}>
                    <View style={styles.mealRow}>
                      <Ionicons name={MEAL_ICONS[r.mealType]} size={14} color="#1A7A4A" />
                      <Text style={styles.mealLabel}>{MEAL_LABELS[r.mealType]}</Text>
                      <View style={[styles.statusDot, { backgroundColor: statusColor(r) }]} />
                      <Text style={[styles.statusText, { color: statusColor(r) }]}>
                        {statusLabel(r)}
                      </Text>
                    </View>
                    <Text style={styles.itemName}>{r.optionLabel}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>
                        {r.diningMode === 'dine_in' ? 'Dine In' : 'Takeaway'}
                      </Text>
                      {r.quantity > 1 && (
                        <Text style={styles.metaText}> · ×{r.quantity}</Text>
                      )}
                      {r.amount > 0 && (
                        <Text style={[styles.metaText, styles.amountText]}> · Rs. {r.amount.toLocaleString()}</Text>
                      )}
                    </View>
                  </View>

                  {canCancel(r) && (
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => openCancel(r)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Cancel modal */}
      <CancelModal
        visible={!!cancelTarget}
        reservation={cancelTarget}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onConfirm={handleCancel}
        onClose={() => setCancelTarget(null)}
        loading={cancelling}
      />
    </SafeAreaView>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({ visible, reservation, reason, onReasonChange, onConfirm, onClose, loading }) {
  if (!reservation) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Cancel Booking</Text>
          <Text style={styles.modalSub}>
            {MEAL_LABELS[reservation.mealType]} · {reservation.reservationDate}
          </Text>
          <Text style={styles.modalItemName}>{reservation.optionLabel}</Text>
          <Text style={styles.modalSectionLabel}>Reason for cancellation</Text>
          {CANCEL_REASONS.map((r) => (
            <TouchableOpacity key={r.key} style={styles.reasonRow} onPress={() => onReasonChange(r.key)}>
              <View style={[styles.radio, reason === r.key && styles.radioActive]}>
                {reason === r.key && <View style={styles.radioDot} />}
              </View>
              <Text style={styles.reasonLabel}>{r.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.keepBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.keepBtnText}>Keep Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={onConfirm} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.confirmCancelText}>Confirm Cancel</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#EBF9F4' },
  header:             { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  headerTitle:        { fontSize: 20, fontWeight: '700', color: '#042C1E' },
  filterRow:          { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterTab:          { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  filterTabActive:    { backgroundColor: '#1A7A4A', borderColor: '#1A7A4A' },
  filterTabText:      { fontSize: 13, fontWeight: '500', color: '#888' },
  filterTabTextActive:{ color: '#fff', fontWeight: '600' },
  centeredMsg:        { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText:          { fontSize: 14, color: '#aaa' },
  emptySubtext:       { fontSize: 12, color: '#bbb' },
  scroll:             { padding: 16 },
  dayBlock:           { backgroundColor: '#fff', borderRadius: 12, marginBottom: 14, overflow: 'hidden', elevation: 1 },
  dayHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#042C1E' },
  dayLabel:           { fontSize: 14, fontWeight: '700', color: '#fff' },
  dayDate:            { fontSize: 12, color: '#3DBFA0' },
  resRow:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  resLeft:            { flex: 1, marginRight: 10 },
  mealRow:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  mealLabel:          { fontSize: 12, color: '#888', fontWeight: '500' },
  statusDot:          { width: 7, height: 7, borderRadius: 4 },
  statusText:         { fontSize: 12, fontWeight: '600' },
  itemName:           { fontSize: 15, fontWeight: '600', color: '#333' },
  metaRow:            { flexDirection: 'row', marginTop: 3 },
  metaText:           { fontSize: 12, color: '#aaa' },
  amountText:         { color: '#1A7A4A', fontWeight: '600' },
  cancelBtn:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#e57373' },
  cancelBtnText:      { fontSize: 12, fontWeight: '600', color: '#e57373' },
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox:           { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: '#042C1E', marginBottom: 4 },
  modalSub:           { fontSize: 13, color: '#1A7A4A', fontWeight: '600', marginBottom: 4 },
  modalItemName:      { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 20 },
  modalSectionLabel:  { fontSize: 13, color: '#888', marginBottom: 12 },
  reasonRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  radio:              { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center' },
  radioActive:        { borderColor: '#1A7A4A' },
  radioDot:           { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1A7A4A' },
  reasonLabel:        { fontSize: 14, color: '#333' },
  modalActions:       { flexDirection: 'row', gap: 12, marginTop: 24 },
  keepBtn:            { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#ccc', alignItems: 'center' },
  keepBtnText:        { fontSize: 14, fontWeight: '600', color: '#888' },
  confirmCancelBtn:   { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: '#e57373', alignItems: 'center' },
  confirmCancelText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});
