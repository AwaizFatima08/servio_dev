import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDailyMenu, bookMeal } from '../../services/messService';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEALS = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch',     label: 'Lunch',     icon: 'partly-sunny-outline' },
  { key: 'dinner',   label: 'Dinner',    icon: 'moon-outline' },
];

const MAX_QTY = 5;

function formatDate(date) {
  // FIX: toISOString() returns UTC which is 5 hours behind PKT.
  // At midnight PKT, UTC is still the previous day — causing bookings
  // to land on the wrong date. Convert to PKT (Asia/Karachi) first.
  const pktMs = date.getTime() + 5 * 60 * 60 * 1000;
  const pkt   = new Date(pktMs);
  const y = pkt.getUTCFullYear();
  const m = String(pkt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(pkt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDateRow() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

const DATE_ROW   = buildDateRow();
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BookMealScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(formatDate(DATE_ROW[0]));
  const [selectedMeal, setSelectedMeal] = useState('lunch');
  const [menu, setMenu]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Modal state
  const [modalVisible, setModalVisible]     = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [diningMode, setDiningMode]         = useState('dine_in');
  const [quantity, setQuantity]             = useState(1);
  const [booking, setBooking]               = useState(false);

  const loadMenu = useCallback(async (date, mealType) => {
    setLoading(true);
    setError(null);
    setMenu(null);
    try {
      const data = await getDailyMenu(date, mealType);
      setMenu(data.menu);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu(selectedDate, selectedMeal);
  }, [selectedDate, selectedMeal, loadMenu]);

  const openModal = (option) => {
    setSelectedOption(option);
    setDiningMode('dine_in');
    setQuantity(1);
    setModalVisible(true);
  };

  const handleBook = async () => {
    if (!selectedOption) return;
    setBooking(true);
    try {
      const payload = {
        reservationDate: selectedDate,
        mealType:        selectedMeal,
        menuItemId:      selectedOption.comboId || selectedOption.itemId,
        menuOptionKey:   selectedOption.menuOptionKey,
        optionLabel:     selectedOption.displayLabel || selectedOption.itemName,
        itemName:        selectedOption.comboName || selectedOption.itemName,
        diningMode,
        selectionMode:   selectedOption.isAlaCarte ? 'alacarte' : 'combo',
        quantity,
      };
      await bookMeal(payload);
      setModalVisible(false);
      const modeLabel = diningMode === 'dine_in' ? 'Dine In' : 'Takeaway';
      Alert.alert(
        'Booked!',
        `${payload.optionLabel} ×${quantity} for ${selectedDate} (${modeLabel}) confirmed.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      if (err?.response?.status === 409) {
        Alert.alert('Already Booked', 'You already have a booking for this combo slot.', [{ text: 'OK' }]);
      } else {
        Alert.alert('Error', err?.response?.data?.message || err.message || 'Booking failed.', [{ text: 'OK' }]);
      }
    } finally {
      setBooking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book a Meal</Text>
        <TouchableOpacity
          style={styles.weeklyBtn}
          onPress={() => navigation.navigate('WeeklyBooking')}
        >
          <Ionicons name="calendar-outline" size={16} color="#1A7A4A" />
          <Text style={styles.weeklyBtnText}>Book Full Week</Text>
        </TouchableOpacity>
      </View>

      {/* Date row */}
      <View style={styles.dateRowWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {DATE_ROW.map((d, idx) => {
            const iso    = formatDate(d);
            const active = iso === selectedDate;
            return (
              <TouchableOpacity
                key={iso}
                style={[styles.dateCell, active && styles.dateCellActive]}
                onPress={() => setSelectedDate(iso)}
              >
                <Text style={[styles.dateDayName, active && styles.dateDayNameActive]}>
                  {idx === 0 ? 'Today' : DAY_LABELS[d.getDay()]}
                </Text>
                <Text style={[styles.dateNum, active && styles.dateNumActive]}>{d.getDate()}</Text>
                <Text style={[styles.dateMonth, active && styles.dateMonthActive]}>
                  {MONTH_SHORT[d.getMonth()]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Meal tabs */}
      <View style={styles.tabs}>
        {MEALS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.tab, selectedMeal === m.key && styles.tabActive]}
            onPress={() => setSelectedMeal(m.key)}
          >
            <Ionicons name={m.icon} size={16} color={selectedMeal === m.key ? '#fff' : '#1A7A4A'} />
            <Text style={[styles.tabLabel, selectedMeal === m.key && styles.tabLabelActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Menu content */}
      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#1A7A4A" />
          <Text style={styles.loadingText}>Loading menu…</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="alert-circle-outline" size={40} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadMenu(selectedDate, selectedMeal)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !menu ? (
        <View style={styles.centeredMsg}>
          <Text style={styles.errorText}>No menu available for this date.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {menu.combos && menu.combos.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Combo Meals</Text>
              {menu.combos.map((combo, idx) => (
                <ComboCard key={idx} combo={combo} onBook={() => openModal(combo)} />
              ))}
            </>
          )}
          {menu.alaCarte && menu.alaCarte.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Ala Carte</Text>
              {menu.alaCarte.map((item, idx) => (
                <AlaCarteCard key={idx} item={item} onBook={() => openModal({ ...item, isAlaCarte: true })} />
              ))}
            </>
          )}
          {(!menu.combos || menu.combos.length === 0) &&
           (!menu.alaCarte || menu.alaCarte.length === 0) && (
            <View style={styles.centeredMsg}>
              <Text style={styles.errorText}>No items on this day's menu.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Booking modal */}
      <BookingModal
        visible={modalVisible}
        option={selectedOption}
        diningMode={diningMode}
        onDiningChange={setDiningMode}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onConfirm={handleBook}
        onClose={() => setModalVisible(false)}
        loading={booking}
        mealLabel={MEALS.find(m => m.key === selectedMeal)?.label || ''}
        selectedDate={selectedDate}
      />
    </SafeAreaView>
  );
}

// ─── Combo Card ───────────────────────────────────────────────────────────────

function ComboCard({ combo, onBook }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{combo.displayLabel}</Text>
          <Text style={styles.cardSub}>{combo.comboName}</Text>
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={onBook}>
          <Text style={styles.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>
      {combo.constituents && combo.constituents.length > 0 && (
        <>
          <TouchableOpacity style={styles.expandRow} onPress={() => setExpanded(!expanded)}>
            <Text style={styles.expandText}>
              {expanded ? 'Hide contents' : `See contents (${combo.constituents.length} items)`}
            </Text>
            <Ionicons name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={14} color="#888" />
          </TouchableOpacity>
          {expanded && (
            <View style={styles.constituentList}>
              {combo.constituents.map((c, i) => (
                <Text key={i} style={styles.constituentItem}>
                  • {c.itemName}{c.baseUnit ? <Text style={styles.unitText}> ({c.baseUnit})</Text> : null}
                </Text>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ─── Ala Carte Card ───────────────────────────────────────────────────────────

function AlaCarteCard({ item, onBook }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>{item.itemName}</Text>
          {item.baseUnit ? <Text style={styles.cardSub}>{item.baseUnit}</Text> : null}
        </View>
        <TouchableOpacity style={styles.bookBtn} onPress={onBook}>
          <Text style={styles.bookBtnText}>Book</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Booking Modal ────────────────────────────────────────────────────────────

function BookingModal({
  visible, option, diningMode, onDiningChange,
  quantity, onQuantityChange,
  onConfirm, onClose, loading, mealLabel, selectedDate,
}) {
  if (!option) return null;
  const name = option.displayLabel || option.itemName || '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>

          <Text style={styles.modalTitle}>Confirm Booking</Text>
          <Text style={styles.modalMealLabel}>{mealLabel} · {selectedDate}</Text>
          <Text style={styles.modalItemName}>{name}</Text>

          {/* Quantity selector */}
          <Text style={styles.modalSectionLabel}>How many meals?</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
              onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Ionicons name="remove" size={20} color={quantity <= 1 ? '#ccc' : '#1A7A4A'} />
            </TouchableOpacity>
            <View style={styles.qtyDisplay}>
              <Text style={styles.qtyText}>{quantity}</Text>
            </View>
            <TouchableOpacity
              style={[styles.qtyBtn, quantity >= MAX_QTY && styles.qtyBtnDisabled]}
              onPress={() => onQuantityChange(Math.min(MAX_QTY, quantity + 1))}
              disabled={quantity >= MAX_QTY}
            >
              <Ionicons name="add" size={20} color={quantity >= MAX_QTY ? '#ccc' : '#1A7A4A' } />
            </TouchableOpacity>
            <Text style={styles.qtyNote}>max {MAX_QTY}</Text>
          </View>

          {/* Dining mode */}
          <Text style={styles.modalSectionLabel}>Howare you dining?</Text>
          <View style={styles.diningRow}>
            <TouchableOpacity
              style={[styles.diningBtn, diningMode === 'dine_in' && styles.diningBtnActive]}
              onPress={() => onDiningChange('dine_in')}
            >
              <Ionicons name="restaurant-outline" size={16} color={diningMode === 'dine_in' ? '#fff' : '#1A7A4A'} />
              <Text style={[styles.diningBtnText, diningMode === 'dine_in' && styles.diningBtnTextActive]}>
                Dine In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.diningBtn, diningMode === 'takeaway' && styles.diningBtnActive]}
              onPress={() => onDiningChange('takeaway')}
            >
              <Ionicons name="bag-outline" size={16} color={diningMode === 'takeaway' ? '#fff' : '#1A7A4A'} />
              <Text style={[styles.diningBtnText, diningMode === 'takeaway' && styles.diningBtnTextActive]}>
                Takeaway
              </Text>
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelModalBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelModalText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.confirmBtnText}>Confirm</Text>
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

  // Header
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  headerTitle:        { fontSize: 20, fontWeight: '700', color: '#042C1E' },
  weeklyBtn:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#1A7A4A' },
  weeklyBtnText:      { fontSize: 13, fontWeight: '600', color: '#1A7A4A' },

  // Date row
  dateRowWrapper:     { backgroundColor: '#fff', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  dateRow:            { paddingHorizontal: 12, gap: 8, flexDirection: 'row' },
  dateCell:           { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', minWidth: 58 },
  dateCellActive:     { backgroundColor: '#1A7A4A', borderColor: '#1A7A4A' },
  dateDayName:        { fontSize: 11, color: '#888', fontWeight: '500' },
  dateDayNameActive:  { color: '#fff' },
  dateNum:            { fontSize: 18, fontWeight: '700', color: '#333', marginTop: 2 },
  dateNumActive:      { color: '#fff' },
  dateMonth:          { fontSize: 11, color: '#888', marginTop: 1 },
  dateMonthActive:    { color: '#fff' },

  // Meal tabs
  tabs:               { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab:                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#1A7A4A' },
  tabActive:          { backgroundColor: '#1A7A4A', borderColor: '#1A7A4A' },
  tabLabel:           { fontSize: 13, fontWeight: '600', color: '#1A7A4A' },
  tabLabelActive:     { color: '#fff' },

  // States
  centeredMsg:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 12 },
  loadingText:        { fontSize: 14, color: '#888', marginTop: 8 },
  errorText:          { fontSize: 14, color: '#aaa', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn:           { backgroundColor: '#1A7A4A', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 4 },
  retryBtnText:       { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Cards
  scroll:             { padding: 16, paddingBottom: 32 },
  sectionTitle:       { fontSize: 15, fontWeight: '700', color: '#042C1E', marginBottom: 10, marginTop: 8 },
  card:               { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  cardTop:            { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardLeft:           { flex: 1, marginRight: 12 },
  cardTitle:          { fontSize: 15, fontWeight: '600', color: '#333' },
  cardSub:            { fontSize: 13, color: '#888', marginTop: 3 },
  bookBtn:            { backgroundColor: '#1A7A4A', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  bookBtnText:        { color: '#fff', fontWeight: '600', fontSize: 13 },
  expandRow:          { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  expandText:         { fontSize: 12, color: '#888' },
  constituentList:    { marginTop: 8 },
  constituentItem:    { fontSize: 13, color: '#555', marginTop: 4 },
  unitText:           { fontSize: 12, color: '#aaa' },

  // Modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox:           { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: '#042C1E', marginBottom: 4 },
  modalMealLabel:     { fontSize: 13, color: '#1A7A4A', fontWeight: '600', marginBottom: 8 },
  modalItemName:      { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 20 },
  modalSectionLabel:  { fontSize: 13, color: '#888', marginBottom: 10 },

  // Quantity
  qtyRow:             { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  qtyBtn:             { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center' },
  qtyBtnDisabled:     { borderColor: '#ddd' },
  qtyDisplay:         { width: 44, height: 36, borderRadius: 8, backgroundColor: '#EBF9F4', alignItems: 'center', justifyContent: 'center' },
  qtyText:            { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  qtyNote:            { fontSize: 12, color: '#aaa', marginLeft: 4 },

  // Dining
  diningRow:          { flexDirection: 'row', gap: 12, marginBottom: 24 },
  diningBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#1A7A4A' },
  diningBtnActive:    { backgroundColor: '#1A7A4A' },
  diningBtnText:      { fontSize: 14, fontWeight: '600', color: '#1A7A4A' },
  diningBtnTextActive:{ color: '#fff' },

  // Actions
  modalActions:       { flexDirection: 'row', gap: 12 },
  cancelModalBtn:     { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#ccc', alignItems: 'center' },
  cancelModalText:    { fontSize: 15, fontWeight: '600', color: '#888' },
  confirmBtn:         { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: '#1A7A4A', alignItems: 'center' },
  confirmBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
});
