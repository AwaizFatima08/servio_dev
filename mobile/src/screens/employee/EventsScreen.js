import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getActiveEvents, submitAttendance } from '../../services/eventService';

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatEventDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const date = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${days[date.getDay()]}, ${parseInt(d)} ${MONTH_SHORT[parseInt(m)-1]} ${y}`;
}

function todayISO() {
  // FIX: toISOString() returns UTC — at midnight PKT this is still the previous day.
  const pktMs = (new Date()).getTime() + 5 * 60 * 60 * 1000;
  const pkt   = new Date(pktMs);
  return pkt.getUTCFullYear() + '-' + String(pkt.getUTCMonth()+1).padStart(2,'0') + '-' + String(pkt.getUTCDate()).padStart(2,'0');
}

function daysUntil(iso) {
  const today = new Date(); today.setHours(0,0,0,0);
  const event = new Date(iso);
  const diff = Math.round((event - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0)  return null;
  return `In ${diff} days`;
}

export default function EventsScreen({ navigation }) {
  const { user } = useAuth();
  const [events, setEvents]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [responding, setResponding] = useState(false);
  const [showPast, setShowPast]     = useState(false);

  const employeeName = user?.employee?.fullName || '';
  const today = todayISO();

  const loadData = useCallback(async () => {
    try {
      const data = await getActiveEvents();
      setEvents(data?.events || []);
    } catch (err) {
      console.log('Events load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // Split into upcoming (max 3) and past
  const upcoming = events
    .filter(e => e.eventDate >= today)
    .sort((a,b) => a.eventDate.localeCompare(b.eventDate))
    .slice(0, 3);

  const past = events
    .filter(e => e.eventDate < today)
    .sort((a,b) => b.eventDate.localeCompare(a.eventDate));

  const handleNotAttending = async (eventId) => {
    setResponding(true);
    try {
      await submitAttendance(eventId, 'not_attending', {}, employeeName);
      setSelected(null);
      loadData();
      Alert.alert('Response Saved', 'You are marked as not attending.', [{ text: 'OK' }]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err.message, [{ text: 'OK' }]);
    } finally {
      setResponding(false);
    }
  };

  const handleAttending = (event) => {
    setSelected(null);
    navigation.navigate('EventAttendance', { event, employeeName });
  };

  const EventCard = ({ evt, dimmed }) => {
    const badge = daysUntil(evt.eventDate);
    return (
      <TouchableOpacity
        style={[styles.card, dimmed && styles.cardDimmed]}
        onPress={() => setSelected(evt)}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.dateBox, dimmed && styles.dateBoxDimmed]}>
            <Text style={styles.dateDay}>{evt.eventDate?.split('-')[2]}</Text>
            <Text style={styles.dateMon}>
              {MONTH_SHORT[parseInt(evt.eventDate?.split('-')[1])-1]}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{evt.title}</Text>
          {evt.subtitle && <Text style={styles.cardSub} numberOfLines={1}>{evt.subtitle}</Text>}
          <Text style={styles.cardDate}>{formatEventDate(evt.eventDate)}</Text>
          {evt.venue && <Text style={styles.cardVenue} numberOfLines={1}>{evt.venue}</Text>}
        </View>
        <View style={styles.cardRight}>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
          {evt.requiresAttendance && !dimmed && (
            <View style={styles.rsvpBadge}>
              <Text style={styles.rsvpBadgeText}>RSVP</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginTop: 6 }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#042C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Events</Text>
        <View style={{ width: 36 }} />
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
          {/* Upcoming — max 3 */}
          {upcoming.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No upcoming events.</Text>
            </View>
          ) : (
            upcoming.map(evt => <EventCard key={evt.eventId} evt={evt} dimmed={false} />)
          )}

          {/* Past events toggle */}
          {past.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.pastToggle}
                onPress={() => setShowPast(!showPast)}
              >
                <Text style={styles.pastToggleText}>
                  {showPast ? 'Hide' : 'Show'} past events ({past.length})
                </Text>
                <Ionicons
                  name={showPast ? 'chevron-up' : 'chevron-down'}
                  size={16} color="#888"
                />
              </TouchableOpacity>
              {showPast && past.map(evt => (
                <EventCard key={evt.eventId} evt={evt} dimmed={true} />
              ))}
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Event detail modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{selected.title}</Text>
                {selected.subtitle && (
                  <Text style={styles.modalSub}>{selected.subtitle}</Text>
                )}
                <Text style={styles.modalDate}>{formatEventDate(selected.eventDate)}</Text>
                {selected.venue && (
                  <View style={styles.modalVenueRow}>
                    <Ionicons name="location-outline" size={14} color="#888" />
                    <Text style={styles.modalVenue}>{selected.venue}</Text>
                  </View>
                )}
                {selected.description && (
                  <Text style={styles.modalDesc}>{selected.description}</Text>
                )}

                {/* Attendance — only for upcoming events that require it */}
                {selected.requiresAttendance && selected.eventDate >= today && (
                  <View style={styles.rsvpSection}>
                    <Text style={styles.rsvpTitle}>Will you attend?</Text>
                    <View style={styles.rsvpRow}>
                      <TouchableOpacity
                        style={[styles.rsvpBtn, styles.rsvpYes]}
                        onPress={() => handleAttending(selected)}
                        disabled={responding}
                      >
                        <Text style={styles.rsvpBtnText}>✓ Attending</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rsvpBtn, styles.rsvpNo]}
                        onPress={() => handleNotAttending(selected.eventId)}
                        disabled={responding}
                      >
                        {responding
                          ? <ActivityIndicator size="small" color="#e57373" />
                          : <Text style={[styles.rsvpBtnText, { color: '#e57373' }]}>✗ Not Attending</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#EBF9F4' },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  backBtn:             { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:         { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  centeredMsg:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyBlock:          { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyText:           { fontSize: 14, color: '#aaa' },
  scroll:              { padding: 16 },
  card:                { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, gap: 12 },
  cardDimmed:          { opacity: 0.5 },
  cardLeft:            { alignItems: 'center' },
  dateBox:             { width: 44, height: 44, borderRadius: 10, backgroundColor: '#042C1E', alignItems: 'center', justifyContent: 'center' },
  dateBoxDimmed:       { backgroundColor: '#888' },
  dateDay:             { fontSize: 16, fontWeight: '700', color: '#fff' },
  dateMon:             { fontSize: 10, color: '#3DBFA0', marginTop: 1 },
  cardBody:            { flex: 1 },
  cardTitle:           { fontSize: 15, fontWeight: '700', color: '#042C1E' },
  cardSub:             { fontSize: 13, color: '#888', marginTop: 2 },
  cardDate:            { fontSize: 12, color: '#1A7A4A', marginTop: 4 },
  cardVenue:           { fontSize: 12, color: '#aaa', marginTop: 2 },
  cardRight:           { alignItems: 'flex-end', gap: 4 },
  badge:               { backgroundColor: '#EBF9F4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:           { fontSize: 11, fontWeight: '600', color: '#1A7A4A' },
  rsvpBadge:           { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rsvpBadgeText:       { fontSize: 10, fontWeight: '700', color: '#F59E0B' },
  pastToggle:          { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12 },
  pastToggleText:      { fontSize: 13, color: '#888' },
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox:            { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36, maxHeight: '80%' },
  modalTitle:          { fontSize: 20, fontWeight: '700', color: '#042C1E', marginBottom: 4 },
  modalSub:            { fontSize: 14, color: '#888', marginBottom: 8 },
  modalDate:           { fontSize: 14, color: '#1A7A4A', fontWeight: '600', marginBottom: 8 },
  modalVenueRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  modalVenue:          { fontSize: 13, color: '#888' },
  modalDesc:           { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 16 },
  rsvpSection:         { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16, marginBottom: 8 },
  rsvpTitle:           { fontSize: 14, fontWeight: '700', color: '#042C1E', marginBottom: 12 },
  rsvpRow:             { flexDirection: 'row', gap: 10 },
  rsvpBtn:             { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1.5 },
  rsvpYes:             { backgroundColor: '#1A7A4A', borderColor: '#1A7A4A' },
  rsvpNo:              { borderColor: '#e57373' },
  rsvpBtnText:         { fontSize: 14, fontWeight: '600', color: '#fff' },
  closeBtn:            { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  closeBtnText:        { fontSize: 14, color: '#aaa' },
});
