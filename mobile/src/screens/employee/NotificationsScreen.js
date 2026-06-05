import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMyNotifications, markAsRead, markAllAsRead } from '../../services/notificationService';

const TYPE_ICONS = {
  booking_confirmed:      'checkmark-circle-outline',
  booking_cancelled_self: 'close-circle-outline',
  booking_cancelled_proxy:'close-circle-outline',
  booking_issued:         'restaurant-outline',
  cutoff_reminder:        'time-outline',
  event_published:        'calendar-outline',
  event_response_reminder:'calendar-outline',
  event_cancelled:        'calendar-outline',
  event_feedback_prompt:  'star-outline',
  account_activated:      'person-checkmark-outline',
  role_changed:           'shield-outline',
  profile_change_approved:'person-outline',
  profile_change_rejected:'person-outline',
  rate_entry_pending:     'receipt-outline',
  monthly_bill_available: 'receipt-outline',
};

function timeAgo(ts) {
  if (!ts) return '';
  const now = Date.now();
  const then = ts._seconds ? ts._seconds * 1000 : new Date(ts).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60)  return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [markingAll, setMarkingAll]       = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.log('Notifications load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleMarkRead = async (deliveryId) => {
    try {
      await markAsRead(deliveryId);
      setNotifications(prev =>
        prev.map(n => n.deliveryId === deliveryId ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.log('Mark read error:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.log('Mark all read error:', err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#042C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAll} style={styles.markAllBtn}>
            {markingAll
              ? <ActivityIndicator size="small" color="#1A7A4A" />
              : <Text style={styles.markAllText}>Mark all read</Text>
            }
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 80 }} />}
      </View>

      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#1A7A4A" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="notifications-off-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A7A4A']} />}
        >
          {notifications.map((n) => (
            <TouchableOpacity
              key={n.deliveryId}
              style={[styles.card, !n.isRead && styles.cardUnread]}
              onPress={() => !n.isRead && handleMarkRead(n.deliveryId)}
              activeOpacity={0.8}
            >
              <View style={styles.cardIcon}>
                <Ionicons
                  name={TYPE_ICONS[n.notificationType] || 'notifications-outline'}
                  size={20}
                  color={n.isRead ? '#aaa' : '#1A7A4A'}
                />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardTitle, !n.isRead && styles.cardTitleUnread]} numberOfLines={1}>
                    {n.titleSnapshot}
                  </Text>
                  {!n.isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardMsg} numberOfLines={2}>{n.bodySnapshot}</Text>
                <Text style={styles.cardTime}>{timeAgo(n.inAppVisibleAt || n.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#EBF9F4' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  backBtn:         { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  markAllBtn:      { paddingHorizontal: 8, paddingVertical: 4 },
  markAllText:     { fontSize: 13, color: '#1A7A4A', fontWeight: '600' },
  centeredMsg:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText:       { fontSize: 14, color: '#aaa' },
  scroll:          { padding: 16 },
  card:            { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, gap: 12 },
  cardUnread:      { borderLeftWidth: 3, borderLeftColor: '#1A7A4A' },
  cardIcon:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EBF9F4', alignItems: 'center', justifyContent: 'center' },
  cardBody:        { flex: 1 },
  cardTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle:       { fontSize: 14, fontWeight: '500', color: '#888', flex: 1 },
  cardTitleUnread: { color: '#042C1E', fontWeight: '700' },
  cardMsg:         { fontSize: 13, color: '#555', lineHeight: 18 },
  cardTime:        { fontSize: 11, color: '#bbb', marginTop: 6 },
  unreadDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A7A4A', marginLeft: 6 },
});
