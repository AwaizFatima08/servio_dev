import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getMyReservations, getDailyMenu } from '../../services/messService';
import { getActiveEvents } from '../../services/eventService';

const MEAL_ORDER  = ['breakfast', 'lunch', 'dinner'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const MEAL_ICONS  = { breakfast: 'sunny-outline', lunch: 'partly-sunny-outline', dinner: 'moon-outline' };
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function todayDate() {
  // FIX: toISOString() returns UTC — at midnight PKT this is still the
  // previous day. Convert to PKT (Asia/Karachi) to get the correct date.
  const pktMs = (new Date()).getTime() + 5 * 60 * 60 * 1000;
  const pkt   = new Date(pktMs);
  const y = pkt.getUTCFullYear();
  const m = String(pkt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(pkt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
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

const WEEK = buildWeek();

export default function EmployeeHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [events, setEvents]             = useState([]);
  const [weekMenus, setWeekMenus]       = useState({});
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [weekMenuLoading, setWeekMenuLoading] = useState(false);
  const [weekMenuExpanded, setWeekMenuExpanded] = useState(false);

  // Event banner modal
  const [bannerEvent, setBannerEvent]   = useState(null);

  const employeeName = user?.employee?.fullName || 'Employee';
  const firstName    = employeeName.split(' ')[0];
  const today        = todayDate();

  const loadData = useCallback(async () => {
    try {
      const [resData, evtData] = await Promise.all([
        getMyReservations(),
        getActiveEvents(),
      ]);
      const allRes = resData?.reservations || [];
      // Filter to today's active reservations
      setReservations(allRes.filter(r =>
        r.reservationDate === today && r.reservationStatus === 'active'
      ));
      const allEvents = evtData?.events || [];
      // FIX: use PKT date for event filtering
      const pktNowMs = (new Date()).getTime() + 5 * 60 * 60 * 1000;
  const pktNow   = new Date(pktNowMs);
      const today2 = `${pktNow.getUTCFullYear()}-${String(pktNow.getUTCMonth()+1).padStart(2,'0')}-${String(pktNow.getUTCDate()).padStart(2,'0')}`;
      const upcomingEvents = allEvents
        .filter(e => e.eventDate >= today2)
        .sort((a,b) => a.eventDate.localeCompare(b.eventDate))
        .slice(0, 3);
      setEvents(upcomingEvents);
      const banner = upcomingEvents.find(e => e.requiresAttendance);
      if (banner) setBannerEvent(banner);
    } catch (err) {
      console.log('Home load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // Load weekly menus lazily when section is expanded
  const loadWeekMenus = useCallback(async () => {
    if (weekMenuLoading || Object.keys(weekMenus).length > 0) return;
    setWeekMenuLoading(true);
    const result = {};
    await Promise.all(
      WEEK.map(async (day) => {
        // FIX: use PKT date, not UTC
        const pktDMs = day.getTime() + 5 * 60 * 60 * 1000;
  const pktD   = new Date(pktDMs);
        const date = `${pktD.getUTCFullYear()}-${String(pktD.getUTCMonth()+1).padStart(2,'0')}-${String(pktD.getUTCDate()).padStart(2,'0')}`;
        result[date] = {};
        await Promise.all(
          MEAL_ORDER.map(async (meal) => {
            try {
              const data = await getDailyMenu(date, meal);
              result[date][meal] = data.menu;
            } catch {
              result[date][meal] = null;
            }
          })
        );
      })
    );
    setWeekMenus(result);
    setWeekMenuLoading(false);
  }, [weekMenuLoading, weekMenus]);

  const toggleWeekMenu = () => {
    const next = !weekMenuExpanded;
    setWeekMenuExpanded(next);
    if (next) loadWeekMenus();
  };

  const getMealReservations = (mealType) =>
    reservations.filter(r => r.mealType === mealType);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1A7A4A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#1A7A4A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A7A4A']} />}
      >
        {/* Date */}
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>

        {/* ── Event banner ── */}
        {events.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {events.map((evt) => (
              <TouchableOpacity
                key={evt.eventId}
                style={styles.eventBanner}
                onPress={() => setBannerEvent(evt)}
                activeOpacity={0.85}
              >
                <View style={styles.eventBannerLeft}>
                  <View style={styles.eventDateBox}>
                    <Text style={styles.eventDateDay}>{evt.eventDate?.split('-')[2]}</Text>
                    <Text style={styles.eventDateMon}>
                      {MONTH_SHORT[parseInt(evt.eventDate?.split('-')[1])-1]}
                    </Text>
                  </View>
                </View>
                <View style={styles.eventBannerBody}>
                  <Text style={styles.eventBannerTitle} numberOfLines={1}>{evt.title}</Text>
                  {evt.venue && (
                    <Text style={styles.eventBannerVenue} numberOfLines={1}>{evt.venue}</Text>
                  )}
                  {evt.requiresAttendance && (
                    <View style={styles.rsvpTag}>
                      <Text style={styles.rsvpTagText}>Response required</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#fff" style={{ opacity: 0.7 }} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Today's Meals ── */}
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        {MEAL_ORDER.map((mealType) => {
          const mealRes = getMealReservations(mealType);
          return (
            <View key={mealType} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Ionicons name={MEAL_ICONS[mealType]} size={18} color="#1A7A4A" />
                <Text style={styles.mealLabel}>{MEAL_LABELS[mealType]}</Text>
              </View>
              {mealRes.length === 0 ? (
                <Text style={styles.noBooking}>No booking</Text>
              ) : (
                mealRes.map((r, i) => (
                  <View key={i} style={styles.bookingRow}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: r.issueStatus === 'issued' ? '#1A7A4A' : '#F59E0B' }
                    ]} />
                    <Text style={styles.bookingText}>
                      {r.optionLabel} · {r.diningMode === 'dine_in' ? 'Dine In' : 'Takeaway'}
                      {r.quantity > 1 ? ` · ×${r.quantity}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>
          );
        })}

        {/* ── Weekly Menu ── */}
        <TouchableOpacity style={styles.weekMenuToggle} onPress={toggleWeekMenu}>
          <Ionicons
            name={weekMenuExpanded ? 'chevron-up-circle-outline' : 'chevron-down-circle-outline'}
            size={20}
            color="#1A7A4A"
          />
          <Text style={styles.weekMenuToggleText}>
            {weekMenuExpanded ? 'Hide week menu' : "This week's menu"}
          </Text>
        </TouchableOpacity>

        {weekMenuExpanded && (
          weekMenuLoading ? (
            <View style={styles.weekMenuLoading}>
              <ActivityIndicator size="small" color="#1A7A4A" />
              <Text style={styles.weekMenuLoadingText}>Loading week's menu…</Text>
            </View>
          ) : (
            WEEK.map((day, idx) => {
              // FIX: PKT date for weekly menu display keys
              const pktDayMs = day.getTime() + 5 * 60 * 60 * 1000;
  const pktDay   = new Date(pktDayMs);
              const date    = `${pktDay.getUTCFullYear()}-${String(pktDay.getUTCMonth()+1).padStart(2,'0')}-${String(pktDay.getUTCDate()).padStart(2,'0')}`;
              const dayMenu = weekMenus[date] || {};
              const label   = idx === 0 ? 'Today' : DAY_LABELS[day.getDay()];
              return (
                <View key={date} style={styles.weekDayBlock}>
                  <View style={styles.weekDayHeader}>
                    <Text style={styles.weekDayName}>{label}</Text>
                    <Text style={styles.weekDayDate}>
                      {day.getDate()} {MONTH_SHORT[day.getMonth()]}
                    </Text>
                  </View>
                  {MEAL_ORDER.map((meal) => {
                    const menu = dayMenu[meal];
                    const combos = menu?.combos || [];
                    return (
                      <View key={meal} style={styles.weekMealRow}>
                        <Ionicons name={MEAL_ICONS[meal]} size={13} color="#888" />
                        <Text style={styles.weekMealLabel}>{MEAL_LABELS[meal]}</Text>
                        <Text style={styles.weekMealItems} numberOfLines={1}>
                          {combos.length > 0
                            ? combos.map(c => c.comboName || c.displayLabel).join(' · ')
                            : '—'
                          }
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })
          )
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Event detail modal */}
      <Modal
        visible={!!bannerEvent}
        transparent
        animationType="slide"
        onRequestClose={() => setBannerEvent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {bannerEvent && (
              <>
                <Text style={styles.modalTitle}>{bannerEvent.title}</Text>
                {bannerEvent.subtitle && (
                  <Text style={styles.modalSub}>{bannerEvent.subtitle}</Text>
                )}
                <Text style={styles.modalDate}>
                  {bannerEvent.eventDate?.split('-')[2] || ''}{' '}
                  {MONTH_SHORT[parseInt(bannerEvent.eventDate?.split('-')[1])-1] || ''}
                  {' '}{bannerEvent.eventDate?.split('-')[0] || ''}
                </Text>
                {bannerEvent.venue && (
                  <View style={styles.modalVenueRow}>
                    <Ionicons name="location-outline" size={14} color="#888" />
                    <Text style={styles.modalVenue}>{bannerEvent.venue}</Text>
                  </View>
                )}
                {bannerEvent.description && (
                  <Text style={styles.modalDesc}>{bannerEvent.description}</Text>
                )}
                {bannerEvent.requiresAttendance && (
                  <View style={styles.modalRsvp}>
                    <Text style={styles.modalRsvpLabel}>Will you attend?</Text>
                    <View style={styles.modalRsvpRow}>
                      <TouchableOpacity
                        style={[styles.modalRsvpBtn, { backgroundColor: '#1A7A4A', flex: 2 }]}
                        onPress={() => {
                          const evt = bannerEvent;
                          setBannerEvent(null);
                          navigation?.navigate?.('More', {
                            screen: 'EventAttendance',
                            params: { event: evt, employeeName: '' },
                          });
                        }}
                      >
                        <Text style={styles.modalRsvpBtnText}>Yes, I'll Attend</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalRsvpBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#e57373', flex: 1 }]}
                        onPress={() => setBannerEvent(null)}
                      >
                        <Text style={[styles.modalRsvpBtnText, { color: '#e57373' }]}>No, I Won't Attend</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <TouchableOpacity style={styles.closeBtn} onPress={() => setBannerEvent(null)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#EBF9F4' },
  centered:             { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EBF9F4' },
  topBar:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  greeting:             { fontSize: 13, color: '#888' },
  name:                 { fontSize: 20, fontWeight: '700', color: '#1A7A4A' },
  logoutBtn:            { padding: 8 },
  scroll:               { padding: 16, paddingBottom: 32 },
  dateText:             { fontSize: 13, color: '#888', marginBottom: 16 },
  sectionTitle:         { fontSize: 15, fontWeight: '700', color: '#042C1E', marginBottom: 10, marginTop: 8 },

  // Event banner
  eventBanner:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#042C1E', borderRadius: 12, padding: 14, marginBottom: 10, gap: 12 },
  eventBannerLeft:      { },
  eventDateBox:         { width: 44, height: 44, borderRadius: 10, backgroundColor: '#0F6E56', alignItems: 'center', justifyContent: 'center' },
  eventDateDay:         { fontSize: 16, fontWeight: '700', color: '#fff' },
  eventDateMon:         { fontSize: 10, color: '#3DBFA0', marginTop: 1 },
  eventBannerBody:      { flex: 1 },
  eventBannerTitle:     { fontSize: 14, fontWeight: '700', color: '#fff' },
  eventBannerVenue:     { fontSize: 12, color: '#3DBFA0', marginTop: 2 },
  rsvpTag:              { marginTop: 6, backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  rsvpTagText:          { fontSize: 10, fontWeight: '700', color: '#fff' },

  // Meal cards
  mealCard:             { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  mealHeader:           { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  mealLabel:            { fontSize: 14, fontWeight: '600', color: '#333' },
  noBooking:            { fontSize: 13, color: '#bbb', fontStyle: 'italic' },
  bookingRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statusDot:            { width: 8, height: 8, borderRadius: 4 },
  bookingText:          { fontSize: 13, color: '#555' },

  // Weekly menu
  weekMenuToggle:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 4, elevation: 1 },
  weekMenuToggleText:   { fontSize: 14, fontWeight: '600', color: '#1A7A4A' },
  weekMenuLoading:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, justifyContent: 'center' },
  weekMenuLoadingText:  { fontSize: 13, color: '#888' },
  weekDayBlock:         { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', elevation: 1 },
  weekDayHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#042C1E' },
  weekDayName:          { fontSize: 13, fontWeight: '700', color: '#fff' },
  weekDayDate:          { fontSize: 12, color: '#3DBFA0' },
  weekMealRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, gap: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  weekMealLabel:        { fontSize: 12, color: '#888', width: 64 },
  weekMealItems:        { fontSize: 13, color: '#333', flex: 1 },

  // Modal
  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox:             { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalTitle:           { fontSize: 20, fontWeight: '700', color: '#042C1E', marginBottom: 4 },
  modalSub:             { fontSize: 14, color: '#888', marginBottom: 8 },
  modalDate:            { fontSize: 14, color: '#1A7A4A', fontWeight: '600', marginBottom: 8 },
  modalVenueRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  modalVenue:           { fontSize: 13, color: '#888' },
  modalDesc:            { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 16 },
  modalRsvp:            { borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16, marginBottom: 8 },
  modalRsvpLabel:       { fontSize: 13, color: '#888', marginBottom: 10 },
  modalRsvpRow:         { flexDirection: 'row', gap: 10 },
  modalRsvpBtn:         { backgroundColor: '#1A7A4A', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  modalRsvpBtnText:     { fontSize: 14, fontWeight: '600', color: '#fff' },
  closeBtn:             { alignItems: 'center', paddingVertical: 12 },
  closeBtnText:         { fontSize: 14, color: '#aaa' },
});
