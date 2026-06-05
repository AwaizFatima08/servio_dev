import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { submitAttendance } from '../../services/eventService';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const date = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${days[date.getDay()]}, ${parseInt(d)} ${MONTH_SHORT[parseInt(m)-1]} ${y}`;
}

// ─── Stepper component ────────────────────────────────────────────────────────

function Stepper({ value, onChange, min = 0, max = 20 }) {
  return (
    <View style={styles.stepperRow}>
      <TouchableOpacity
        style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Ionicons name="remove" size={18} color={value <= min ? '#ccc' : '#1A7A4A'} />
      </TouchableOpacity>
      <View style={styles.stepDisplay}>
        <Text style={styles.stepValue}>{value}</Text>
      </View>
      <TouchableOpacity
        style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Ionicons name="add" size={18} color={value >= max ? '#ccc' : '#1A7A4A'} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ value, onChange, label }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleActive]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EventAttendanceScreen({ route, navigation }) {
  const { event, employeeName } = route.params;

  const [counts, setCounts] = useState({
    selfAttending:    true,
    spouseAttending:  false,
    adults:           0,
    children_12_17:   0,
    children_under_12:0,
    permanentGuests:  0,
    visitingGuests:   0,
  });
  const [submitting, setSubmitting] = useState(false);

  const updateCount = (key, value) => setCounts(prev => ({ ...prev, [key]: value }));

  const totalAttendees =
    (counts.selfAttending ? 1 : 0) +
    (counts.spouseAttending ? 1 : 0) +
    counts.adults +
    counts.children_12_17 +
    counts.children_under_12 +
    counts.permanentGuests +
    counts.visitingGuests;

  const handleSubmit = async () => {
    if (totalAttendees === 0) {
      Alert.alert(
        'No Attendees',
        'You have marked attending but selected zero people. Please add at least yourself.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmitting(true);
    try {
      await submitAttendance(
        event.eventId,
        'attending',
        {
          selfAttending:     counts.selfAttending,
          spouseAttending:   counts.spouseAttending,
          adults:            counts.adults,
          children_12_17:    counts.children_12_17,
          children_under_12: counts.children_under_12,
          permanentGuests:   counts.permanentGuests,
          visitingGuests:    counts.visitingGuests,
        },
        employeeName || ''
      );

      Alert.alert(
        'Response Saved',
        `Attending confirmed. ${totalAttendees} attendee${totalAttendees > 1 ? 's' : ''} recorded.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err.message, [{ text: 'OK' }]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#042C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Event summary */}
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDate}>{formatDate(event.eventDate)}</Text>
          {event.venue && <Text style={styles.eventVenue}>{event.venue}</Text>}
        </View>

        {/* Total counter */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Attendees</Text>
          <Text style={styles.totalValue}>{totalAttendees}</Text>
        </View>

        {/* ── Self & Family ── */}
        <Text style={styles.sectionTitle}>Self & Immediate Family</Text>
        <View style={styles.card}>
          <Toggle
            value={counts.selfAttending}
            onChange={(v) => updateCount('selfAttending', v)}
            label="Self (You)"
          />
          <View style={styles.cardDivider} />
          <Toggle
            value={counts.spouseAttending}
            onChange={(v) => updateCount('spouseAttending', v)}
            label="Spouse"
          />
        </View>

        {/* ── Children ── */}
        <Text style={styles.sectionTitle}>Children</Text>
        <View style={styles.card}>
          <View style={styles.countRow}>
            <View style={styles.countLeft}>
              <Text style={styles.countLabel}>Age 12–17</Text>
              <Text style={styles.countDesc}>Teenagers</Text>
            </View>
            <Stepper
              value={counts.children_12_17}
              onChange={(v) => updateCount('children_12_17', v)}
            />
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.countRow}>
            <View style={styles.countLeft}>
              <Text style={styles.countLabel}>Under 12</Text>
              <Text style={styles.countDesc}>Young children</Text>
            </View>
            <Stepper
              value={counts.children_under_12}
              onChange={(v) => updateCount('children_under_12', v)}
            />
          </View>
        </View>

        {/* ── Additional Adults ── */}
        <Text style={styles.sectionTitle}>Additional Adults</Text>
        <View style={styles.card}>
          <View style={styles.countRow}>
            <View style={styles.countLeft}>
              <Text style={styles.countLabel}>Adults</Text>
              <Text style={styles.countDesc}>Other adults in household</Text>
            </View>
            <Stepper
              value={counts.adults}
              onChange={(v) => updateCount('adults', v)}
            />
          </View>
        </View>

        {/* ── Guests ── */}
        <Text style={styles.sectionTitle}>Guests</Text>
        <View style={styles.card}>
          <View style={styles.countRow}>
            <View style={styles.countLeft}>
              <Text style={styles.countLabel}>Permanent Resident Guests</Text>
              <Text style={styles.countDesc}>Parents / in-laws living with you</Text>
            </View>
            <Stepper
              value={counts.permanentGuests}
              onChange={(v) => updateCount('permanentGuests', v)}
            />
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.countRow}>
            <View style={styles.countLeft}>
              <Text style={styles.countLabel}>Visiting Guests</Text>
              <Text style={styles.countDesc}>Short-term visitors</Text>
            </View>
            <Stepper
              value={counts.visitingGuests}
              onChange={(v) => updateCount('visitingGuests', v)}
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitBtnText}>
                Confirm Attending · {totalAttendees} {totalAttendees === 1 ? 'person' : 'people'}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#EBF9F4' },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  backBtn:            { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:        { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  scroll:             { padding: 16 },

  eventCard:          { backgroundColor: '#042C1E', borderRadius: 12, padding: 16, marginBottom: 12 },
  eventTitle:         { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  eventDate:          { fontSize: 13, color: '#3DBFA0' },
  eventVenue:         { fontSize: 12, color: '#aaa', marginTop: 3 },

  totalCard:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, marginBottom: 16, elevation: 1 },
  totalLabel:         { fontSize: 15, fontWeight: '600', color: '#555' },
  totalValue:         { fontSize: 28, fontWeight: '800', color: '#1A7A4A' },

  sectionTitle:       { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  card:               { backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 14, elevation: 1 },
  cardDivider:        { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 16 },

  // Toggle
  toggleRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  toggleLabel:        { fontSize: 15, fontWeight: '500', color: '#333' },
  toggle:             { width: 46, height: 26, borderRadius: 13, backgroundColor: '#ddd', padding: 2 },
  toggleActive:       { backgroundColor: '#1A7A4A' },
  toggleThumb:        { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleThumbActive:  { transform: [{ translateX: 20 }] },

  // Count row
  countRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  countLeft:          { flex: 1, marginRight: 12 },
  countLabel:         { fontSize: 14, fontWeight: '500', color: '#333' },
  countDesc:          { fontSize: 12, color: '#aaa', marginTop: 2 },

  // Stepper
  stepperRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn:            { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled:    { borderColor: '#ddd' },
  stepDisplay:        { width: 36, height: 32, borderRadius: 8, backgroundColor: '#EBF9F4', alignItems: 'center', justifyContent: 'center' },
  stepValue:          { fontSize: 16, fontWeight: '700', color: '#042C1E' },

  // Submit
  submitBtn:          { backgroundColor: '#1A7A4A', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  submitBtnDisabled:  { backgroundColor: '#a0c4b8' },
  submitBtnText:      { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelBtn:          { alignItems: 'center', paddingVertical: 12 },
  cancelBtnText:      { fontSize: 14, color: '#aaa' },
});
