import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getUnreadCount } from '../../services/notificationService';
import { getEligibleReservations } from '../../services/feedbackService';
import { getMyStatement } from '../../services/billingService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MoreScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [unreadCount, setUnreadCount]     = useState(null);
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [billAmount, setBillAmount]       = useState(null);
  const [loading, setLoading]             = useState(true);

  const employeeName = user?.employee?.fullName || 'Employee';
  const employeeNo   = user?.user?.officialEmployeeNumber || '';

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [notifData, feedbackData, billData] = await Promise.allSettled([
        getUnreadCount(),
        getEligibleReservations(),
        getMyStatement(currentMonth()),
      ]);

      if (notifData.status === 'fulfilled') {
        setUnreadCount(notifData.value?.unreadCount ?? 0);
      }
      if (feedbackData.status === 'fulfilled') {
        setPendingFeedback(feedbackData.value?.count ?? 0);
      }
      if (billData.status === 'fulfilled') {
        setBillAmount(billData.value?.statement?.totalAmount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // ─── Menu items ───────────────────────────────────────────────────────────

  const menuItems = [
    {
      key: 'notifications',
      icon: 'notifications-outline',
      label: 'Notifications',
      badge: unreadCount > 0 ? unreadCount : null,
      badgeColor: '#e57373',
      screen: 'Notifications',
    },
    {
      key: 'feedback',
      icon: 'star-outline',
      label: 'Feedback',
      badge: pendingFeedback > 0 ? pendingFeedback : null,
      badgeColor: '#F59E0B',
      badgeLabel: pendingFeedback > 0 ? `${pendingFeedback} pending` : null,
      screen: 'Feedback',
    },
    {
      key: 'bill',
      icon: 'receipt-outline',
      label: 'My Bill',
      subtitle: billAmount !== null ? `Rs. ${billAmount.toLocaleString()} this month` : null,
      screen: 'MyBill',
    },
    {
      key: 'events',
      icon: 'calendar-outline',
      label: 'Events',
      screen: 'Events',
    },
    {
      key: 'profile',
      icon: 'person-outline',
      label: 'My Profile',
      screen: 'Profile',
    },
    {
      key: 'contact',
      icon: 'call-outline',
      label: 'Contact Us',
      screen: 'ContactUs',
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* Profile strip */}
      <View style={styles.profileStrip}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {employeeName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{employeeName}</Text>
          <Text style={styles.profileNo}>{employeeNo}</Text>
        </View>
      </View>

      {/* Summary row */}
      {loading ? (
        <View style={styles.summaryRow}>
          <ActivityIndicator size="small" color="#1A7A4A" />
        </View>
      ) : (
        <View style={styles.summaryRow}>
          <SummaryChip
            icon="notifications-outline"
            value={unreadCount ?? '—'}
            label="Unread"
            color="#e57373"
          />
          <View style={styles.summaryDivider} />
          <SummaryChip
            icon="star-outline"
            value={pendingFeedback ?? '—'}
            label="Feedback due"
            color="#F59E0B"
          />
          <View style={styles.summaryDivider} />
          <SummaryChip
            icon="receipt-outline"
            value={billAmount !== null ? `Rs.${(billAmount/1000).toFixed(1)}k` : '—'}
            label="This month"
            color="#1A7A4A"
          />
        </View>
      )}

      {/* Menu list */}
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.menuCard}>
          {menuItems.map((item, idx) => (
            <React.Fragment key={item.key}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => navigation.navigate(item.screen)}
              >
                <View style={styles.menuIconBox}>
                  <Ionicons name={item.icon} size={20} color="#1A7A4A" />
                </View>
                <View style={styles.menuMid}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.subtitle && (
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
                <View style={styles.menuRight}>
                  {item.badge !== null && item.badge !== undefined && (
                    <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
                      <Text style={styles.badgeText}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#ccc" />
                </View>
              </TouchableOpacity>
              {idx < menuItems.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#e57373" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Summary Chip ─────────────────────────────────────────────────────────────

function SummaryChip({ icon, value, label, color }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.chipValue, { color }]}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#EBF9F4' },

  // Profile strip
  profileStrip:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#042C1E', paddingHorizontal: 20, paddingVertical: 16, gap: 14 },
  avatar:         { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: 18, fontWeight: '700', color: '#fff' },
  profileInfo:    { flex: 1 },
  profileName:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  profileNo:      { fontSize: 12, color: '#3DBFA0', marginTop: 2 },

  // Summary row
  summaryRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E8F5EF', justifyContent: 'space-around' },
  summaryDivider: { width: 1, height: 36, backgroundColor: '#E8F5EF' },
  chip:           { alignItems: 'center', gap: 3, flex: 1 },
  chipValue:      { fontSize: 16, fontWeight: '700' },
  chipLabel:      { fontSize: 11, color: '#aaa' },

  // Scroll
  scroll:         { padding: 16 },

  // Menu card
  menuCard:       { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 1, marginBottom: 16 },
  menuRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIconBox:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EBF9F4', alignItems: 'center', justifyContent: 'center' },
  menuMid:        { flex: 1 },
  menuLabel:      { fontSize: 15, fontWeight: '500', color: '#333' },
  menuSubtitle:   { fontSize: 12, color: '#1A7A4A', marginTop: 2, fontWeight: '500' },
  menuRight:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuDivider:    { height: 1, backgroundColor: '#F5F5F5', marginLeft: 64 },
  badge:          { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:      { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Logout
  logoutBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, elevation: 1 },
  logoutText:     { fontSize: 15, fontWeight: '600', color: '#e57373' },
});
