import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, Switch,
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

const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

function buildWeek() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

const MEAL_DISPLAY = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

function formatDisplayDate(iso) {
  const parts = iso.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return `${DAY_LABELS[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

const WEEK = buildWeek();

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WeeklyBookingScreen({ navigation }) {
  // menus[date][mealType] = menu doc or null or 'error'
  const [menus, setMenus]       = useState({});
  const [loadingMenus, setLoadingMenus] = useState(true);

  // selections[date_mealType] = { checked: bool, menuOptionKey, comboLabel }
  const [selections, setSelections] = useState({});

  // Single dining mode for all
  const [diningMode, setDiningMode] = useState('dine_in');

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // ── Load all 7×3 menus on mount ──
  const loadAllMenus = useCallback(async () => {
    setLoadingMenus(true);
    const result = {};
    await Promise.all(
      WEEK.map(async (day) => {
        const date = formatDate(day);
        result[date] = {};
        await Promise.all(
          MEALS.map(async (m) => {
            try {
              const data = await getDailyMenu(date, m.key);
              result[date][m.key] = data.menu;
            } catch {
              result[date][m.key] = null; // no menu for this slot
            }
          })
        );
      })
    );
    setMenus(result);
    setLoadingMenus(false);
  }, []);

  useEffect(() => { loadAllMenus(); }, [loadAllMenus]);

  // ── Toggle a slot checkbox ──
  const toggleSlot = (date, mealKey, menu) => {
    const key = `${date}_${mealKey}`;
    setSelections(prev => {
      const existing = prev[key];
      if (existing?.checked) {
        // uncheck — remove
        const next = { ...prev };
        delete next[key];
        return next;
      }
      // check — default to first combo
      const firstCombo = menu?.combos?.[0];
      return {
        ...prev,
        [key]: {
          checked: true,
          menuOptionKey: firstCombo?.menuOptionKey || 'combo_1',
          comboLabel:    firstCombo?.displayLabel  || 'Combo 1',
          menuItemId:    firstCombo?.comboId        || '',
          itemName:      firstCombo?.comboName      || '',
          mealKey,
          date,
          menu,
        },
      };
    });
  };

  // ── Change combo for a checked slot ──
  const setCombo = (date, mealKey, combo) => {
    const key = `${date}_${mealKey}`;
    setSelections(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        menuOptionKey: combo.menuOptionKey,
        comboLabel:    combo.displayLabel,
        menuItemId:    combo.comboId,
        itemName:      combo.comboName,
      },
    }));
  };

  // ── Submit all checked slots ──
  const handleSubmit = async () => {
    const selected = Object.values(selections).filter(s => s.checked);
    if (selected.length === 0) {
      Alert.alert('Nothing selected', 'Please tick at least one meal slot.', [{ text: 'OK' }]);
      return;
    }

    setSubmitting(true);
    const results = { success: 0, failed: [] };

    await Promise.all(
      selected.map(async (s) => {
        try {
          await bookMeal({
            reservationDate: s.date,
            mealType:        s.mealKey,
            menuItemId:      s.menuItemId,
            menuOptionKey:   s.menuOptionKey,
            optionLabel:     s.comboLabel,
            itemName:        s.itemName,
            diningMode,
            selectionMode:   'combo',
            quantity:        1,
          });
          results.success++;
        } catch (err) {
          const status = err?.response?.status;
          const friendlyMsg = status === 409
            ? 'Already booked — cancel existing booking first'
            : (err?.response?.data?.message || err.message || 'Failed');
          results.failed.push(`${MEAL_DISPLAY[s.mealKey]} · ${formatDisplayDate(s.date)}: ${friendlyMsg}`);
        }
      })
    );

    setSubmitting(false);

    if (results.failed.length === 0) {
      Alert.alert(
        'All booked!',
        `${results.success} meal${results.success > 1 ? 's' : ''} confirmed for the week.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else {
      const failMsg = results.failed.join('\n');
      Alert.alert(
        `${results.success} booked, ${results.failed.length} failed`,
        `Failed slots:\n${failMsg}`,
        [{ text: 'OK' }]
      );
    }
  };

  const selectedCount = Object.values(selections).filter(s => s.checked).length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#042C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Full Week</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Dining mode toggle — applies to all */}
      <View style={styles.diningBar}>
        <Text style={styles.diningBarLabel}>Dining mode for all selections:</Text>
        <View style={styles.diningToggle}>
          <TouchableOpacity
            style={[styles.diningChip, diningMode === 'dine_in' && styles.diningChipActive]}
            onPress={() => setDiningMode('dine_in')}
          >
            <Text style={[styles.diningChipText, diningMode === 'dine_in' && styles.diningChipTextActive]}>
              Dine In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.diningChip, diningMode === 'takeaway' && styles.diningChipActive]}
            onPress={() => setDiningMode('takeaway')}
          >
            <Text style={[styles.diningChipText, diningMode === 'takeaway' && styles.diningChipTextActive]}>
              Takeaway
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadingMenus ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#1A7A4A" />
          <Text style={styles.loadingText}>Loading week's menus…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {WEEK.map((day, dayIdx) => {
            const date     = formatDate(day);
            const dayLabel = dayIdx === 0 ? 'Today' : DAY_LABELS[day.getDay()];
            const dateStr  = `${day.getDate()} ${MONTH_SHORT[day.getMonth()]}`;
            return (
              <View key={date} style={styles.dayBlock}>

                {/* Day header */}
                <View style={styles.dayHeader}>
                  <Text style={styles.dayName}>{dayLabel}</Text>
                  <Text style={styles.dayDate}>{dateStr}</Text>
                </View>

                {/* Meal rows */}
                {MEALS.map((meal) => {
                  const slotKey  = `${date}_${meal.key}`;
                  const menu     = menus[date]?.[meal.key];
                  const sel      = selections[slotKey];
                  const checked  = !!sel?.checked;
                  const hasMenu  = menu && (menu.combos?.length > 0 || menu.alaCarte?.length > 0);

                  return (
                    <View key={slotKey} style={[styles.mealRow, !hasMenu && styles.mealRowDisabled]}>

                      {/* Checkbox + meal name */}
                      <TouchableOpacity
                        style={styles.checkRow}
                        onPress={() => hasMenu && toggleSlot(date, meal.key, menu)}
                        disabled={!hasMenu}
                      >
                        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                          {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <Ionicons name={meal.icon} size={15} color={hasMenu ? '#1A7A4A' : '#ccc'} />
                        <Text style={[styles.mealLabel, !hasMenu && styles.mealLabelDisabled]}>
                          {meal.label}
                        </Text>
                        {!hasMenu && <Text style={styles.noMenuTag}>No menu</Text>}
                      </TouchableOpacity>

                      {/* Combo selector — only shown when checked and combos exist */}
                      {checked && menu?.combos?.length > 0 && (
                        <View style={styles.comboRow}>
                          {menu.combos.map((combo, ci) => (
                            <TouchableOpacity
                              key={ci}
                              style={[
                                styles.comboChip,
                                sel.menuOptionKey === combo.menuOptionKey && styles.comboChipActive,
                              ]}
                              onPress={() => setCombo(date, meal.key, combo)}
                            >
                              <Text style={[
                                styles.comboChipText,
                                sel.menuOptionKey === combo.menuOptionKey && styles.comboChipTextActive,
                              ]}>
                                {combo.displayLabel}
                              </Text>
                              {combo.comboName ? (
                                <Text style={[
                                  styles.comboChipName,
                                  sel.menuOptionKey === combo.menuOptionKey && styles.comboChipNameActive,
                                ]}>
                                  {combo.comboName}
                                </Text>
                              ) : null}
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                    </View>
                  );
                })}
              </View>
            );
          })}

          {/* Bottom padding for submit button */}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* Sticky submit button */}
      {!loadingMenus && (
        <View style={styles.submitBar}>
          <TouchableOpacity
            style={[styles.submitBtn, (selectedCount === 0 || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={selectedCount === 0 || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {selectedCount === 0
                  ? 'Select meals to book'
                  : `Book ${selectedCount} meal${selectedCount > 1 ? 's' : ''}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#EBF9F4' },

  // Header
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  backBtn:             { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:         { fontSize: 18, fontWeight: '700', color: '#042C1E' },

  // Dining bar
  diningBar:           { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  diningBarLabel:      { fontSize: 12, color: '#888', marginBottom: 8 },
  diningToggle:        { flexDirection: 'row', gap: 8 },
  diningChip:          { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#1A7A4A' },
  diningChipActive:    { backgroundColor: '#1A7A4A' },
  diningChipText:      { fontSize: 13, fontWeight: '600', color: '#1A7A4A' },
  diningChipTextActive:{ color: '#fff' },

  // States
  centeredMsg:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:         { fontSize: 14, color: '#888' },

  // Scroll
  scroll:              { padding: 16 },

  // Day block
  dayBlock:            { marginBottom: 16, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 1 },
  dayHeader:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#042C1E' },
  dayName:             { fontSize: 14, fontWeight: '700', color: '#fff' },
  dayDate:             { fontSize: 13, color: '#3DBFA0' },

  // Meal row
  mealRow:             { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  mealRowDisabled:     { opacity: 0.45 },
  checkRow:            { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox:            { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked:     { backgroundColor: '#1A7A4A', borderColor: '#1A7A4A' },
  mealLabel:           { fontSize: 14, fontWeight: '500', color: '#333', flex: 1 },
  mealLabelDisabled:   { color: '#bbb' },
  noMenuTag:           { fontSize: 11, color: '#bbb', fontStyle: 'italic' },

  // Combo chips
  comboRow:            { flexDirection: 'row', gap: 8, marginTop: 10, marginLeft: 32 },
  comboChip:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: '#1A7A4A' },
  comboChipActive:     { backgroundColor: '#1A7A4A' },
  comboChipText:       { fontSize: 12, fontWeight: '600', color: '#1A7A4A' },
  comboChipTextActive: { color: '#fff' },
  comboChipName:       { fontSize: 10, color: '#1A7A4A', marginTop: 2 },
  comboChipNameActive: { color: '#d4f1e8' },

  // Submit bar
  submitBar:           { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8F5EF' },
  submitBtn:           { backgroundColor: '#1A7A4A', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled:   { backgroundColor: '#a0c4b8' },
  submitBtnText:       { fontSize: 16, fontWeight: '700', color: '#fff' },
});
