import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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

function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m-1]} ${y}`;
}

function formatDisplayDate(iso) {
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const parts = iso.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function ManagerHomeScreen() {
  const { user, logout } = useAuth();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const name      = user?.employee?.fullName || 'Manager';
  const firstName = name.split(' ')[0];
  const today     = todayDate();
  const month     = currentMonth();

  const loadData = useCallback(async () => {
    try {
      const [headcountRes, summaryRes, eventsRes] = await Promise.allSettled([
        api.get(`/reports/daily-headcount?date=${today}`),
        api.get(`/billing/summary?month=${month}`),
        api.get('/events/active'),
      ]);

      setData({
        headcount: headcountRes.status === 'fulfilled'
          ? (headcountRes.value.data?.data || headcountRes.value.data) : null,
        summary: summaryRes.status === 'fulfilled'
          ? (summaryRes.value.data?.data || summaryRes.value.data) : null,
        events: eventsRes.status === 'fulfilled'
          ? (eventsRes.value.data?.events || []) : [],
      });
    } catch (err) {
      console.log('Manager load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today, month]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const hc     = data?.headcount;
  const sm     = data?.summary;
  const events = data?.events || [];

  // Events with pending responses
  const pendingEvents = events.filter(e =>
    e.requiresAttendance && e.householdsPending > 0
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Club Manager</Text>
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
          <Text style={styles.sectionTitle}>Today · {formatDisplayDate(today)}</Text>
          <View style={styles.headcountCard}>
            {['breakfast', 'lunch', 'dinner'].map((meal, idx, arr) => (
              <React.Fragment key={meal}>
                <View style={styles.hcItem}>
                  <Text style={styles.hcVal}>{hc?.[meal]?.total ?? 0}</Text>
                  <Text style={styles.hcLabel}>{MEAL_LABELS[meal]}</Text>
                  <View style={styles.hcProgress}>
                    <Text style={styles.hcIssued}>
                      {hc?.[meal]?.issued ?? 0} issued
                    </Text>
                    {hc?.[meal]?.pending > 0 && (
                      <Text style={styles.hcPending}>
                        · {hc[meal].pending} pending
                      </Text>
                    )}
                  </View>
                </View>
                {idx < arr.length - 1 && <View style={styles.hcDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Events with pending responses */}
          {pendingEvents.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Events — Response Pending</Text>
              {pendingEvents.map(evt => (
                <View key={evt.eventId} style={styles.eventCard}>
                  <View style={styles.eventLeft}>
                    <View style={styles.eventDateBox}>
                      <Text style={styles.eventDay}>{evt.eventDate?.split('-')[2]}</Text>
                      <Text style={styles.eventMon}>
                        {MONTHS[parseInt(evt.eventDate?.split('-')[1])-1]}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{evt.title}</Text>
                    <View style={styles.eventStats}>
                      <Text style={styles.eventStatText}>
                        {evt.householdsResponded || 0} responded
                      </Text>
                      <Text style={[styles.eventStatText, { color: '#F59E0B' }]}>
                        · {evt.householdsPending || 0} pending
                      </Text>
                    </View>
                  </View>
                  <View style={styles.eventAttendees}>
                    <Text style={styles.eventAttendeesVal}>
                      {evt.grandTotalAttendees || 0}
                    </Text>
                    <Text style={styles.eventAttendeesLbl}>attendees</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* All active events — simple list */}
          {events.length > 0 && pendingEvents.length === 0 && (
            <>
              <Text style={styles.sectionTitle}>Active Events</Text>
              {events.map(evt => (
                <View key={evt.eventId} style={styles.eventCard}>
                  <View style={styles.eventLeft}>
                    <View style={styles.eventDateBox}>
                      <Text style={styles.eventDay}>{evt.eventDate?.split('-')[2]}</Text>
                      <Text style={styles.eventMon}>
                        {MONTHS[parseInt(evt.eventDate?.split('-')[1])-1]}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.eventBody}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{evt.title}</Text>
                    <Text style={styles.eventDate}>{formatDisplayDate(evt.eventDate)}</Text>
                  </View>
                  <Text style={[styles.eventStatText, { color: '#1A7A4A', fontWeight: '700' }]}>
                    {evt.grandTotalAttendees || 0} attending
                  </Text>
                </View>
              ))}
            </>
          )}

          {events.length === 0 && (
            <View style={styles.noEventsCard}>
              <Ionicons name="calendar-outline" size={20} color="#ccc" />
              <Text style={styles.noEventsText}>No active events.</Text>
            </View>
          )}

          {/* Monthly billing overview — read only */}
          <Text style={styles.sectionTitle}>{monthLabel(month)} Overview</Text>
          <View style={styles.billingCard}>
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Total Employee Billing</Text>
              <Text style={styles.billingVal}>
                Rs. {(sm?.totalEmployeeAmount || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.billingDivider} />
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Official Accounts</Text>
              <Text style={styles.billingVal}>
                Rs. {(sm?.totalOfficialAmount || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles.billingDivider} />
            <View style={styles.billingRow}>
              <Text style={styles.billingLabel}>Total Meals Issued</Text>
              <Text style={styles.billingVal}>{sm?.totalIssuedCount || 0}</Text>
            </View>
          </View>

          {/* Web app note */}
          <View style={styles.noticeCard}>
            <Ionicons name="desktop-outline" size={18} color="#888" />
            <Text style={styles.noticeText}>
              Use the web app for event creation, detailed reporting, and proxy bookings.
            </Text>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#EBF9F4' },
  topBar:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  greeting:           { fontSize: 13, color: '#888' },
  name:               { fontSize: 20, fontWeight: '700', color: '#042C1E' },
  logoutBtn:          { padding: 8 },
  centeredMsg:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:             { padding: 16 },
  sectionTitle:       { fontSize: 14, fontWeight: '700', color: '#042C1E', marginBottom: 10, marginTop: 4 },

  // Headcount
  headcountCard:      { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, marginBottom: 16, elevation: 1 },
  hcItem:             { flex: 1, alignItems: 'center' },
  hcVal:              { fontSize: 24, fontWeight: '700', color: '#042C1E' },
  hcLabel:            { fontSize: 12, color: '#888', marginTop: 3 },
  hcProgress:         { flexDirection: 'row', marginTop: 4, alignItems: 'center' },
  hcIssued:           { fontSize: 11, color: '#1A7A4A' },
  hcPending:          { fontSize: 11, color: '#F59E0B' },
  hcDivider:          { width: 1, backgroundColor: '#F0F0F0' },

  // Events
  eventCard:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, gap: 12 },
  eventLeft:          { },
  eventDateBox:       { width: 44, height: 44, borderRadius: 10, backgroundColor: '#042C1E', alignItems: 'center', justifyContent: 'center' },
  eventDay:           { fontSize: 16, fontWeight: '700', color: '#fff' },
  eventMon:           { fontSize: 10, color: '#3DBFA0', marginTop: 1 },
  eventBody:          { flex: 1 },
  eventTitle:         { fontSize: 14, fontWeight: '600', color: '#333' },
  eventDate:          { fontSize: 12, color: '#888', marginTop: 2 },
  eventStats:         { flexDirection: 'row', marginTop: 4 },
  eventStatText:      { fontSize: 12, color: '#888' },
  eventAttendees:     { alignItems: 'center' },
  eventAttendeesVal:  { fontSize: 18, fontWeight: '700', color: '#1A7A4A' },
  eventAttendeesLbl:  { fontSize: 10, color: '#888', marginTop: 1 },
  noEventsCard:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, elevation: 1 },
  noEventsText:       { fontSize: 13, color: '#aaa' },

  // Billing
  billingCard:        { backgroundColor: '#fff', borderRadius: 12, padding: 4, marginBottom: 16, elevation: 1 },
  billingRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  billingLabel:       { fontSize: 14, color: '#555' },
  billingVal:         { fontSize: 14, fontWeight: '700', color: '#042C1E' },
  billingDivider:     { height: 1, backgroundColor: '#F5F5F5', marginHorizontal: 16 },

  // Notice
  noticeCard:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1 },
  noticeText:         { fontSize: 13, color: '#888', flex: 1, lineHeight: 18 },
});
