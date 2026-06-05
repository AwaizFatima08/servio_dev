import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getEligibleReservations, submitFeedback } from '../../services/feedbackService';

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const AREAS = [
  { key: 'quality',  label: 'Food Quality' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'service',  label: 'Service' },
  { key: 'ambience', label: 'Ambience' },
  { key: 'rate',     label: 'Value for Money' },
  { key: 'overall',  label: 'Overall' },
];

export default function FeedbackScreen({ navigation }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  // Active submission state
  const [activeRes, setActiveRes]   = useState(null);
  const [activeArea, setActiveArea] = useState(null);
  const [rating, setRating]         = useState(0);
  const [anonymous, setAnonymous]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getEligibleReservations();
      setReservations(data.reservations || []);
    } catch (err) {
      console.log('Feedback load error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const openFeedback = (res) => {
    setActiveRes(res);
    setActiveArea(null);
    setRating(0);
    setAnonymous(false);
  };

  const handleSubmit = async () => {
    if (!activeArea) {
      Alert.alert('Select area', 'Please select a feedback area.', [{ text: 'OK' }]);
      return;
    }
    if (rating === 0) {
      Alert.alert('Rate it', 'Please select a star rating.', [{ text: 'OK' }]);
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({
        reservationId: activeRes.reservationId,
        feedbackArea:  activeArea,
        rating,
        isAnonymous:   anonymous,
      });
      setActiveRes(null);
      loadData();
      Alert.alert('Thank you!', 'Your feedback has been submitted.', [{ text: 'OK' }]);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err.message, [{ text: 'OK' }]);
    } finally {
      setSubmitting(false);
    }
  };

  if (activeRes) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setActiveRes(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#042C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Your Meal</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.feedbackHeader}>
            <Text style={styles.feedbackMeal}>{MEAL_LABELS[activeRes.mealType]} · {activeRes.reservationDate}</Text>
            <Text style={styles.feedbackItem}>{activeRes.optionLabel || activeRes.itemName}</Text>
          </View>

          <Text style={styles.sectionLabel}>What are you rating?</Text>
          <View style={styles.areaGrid}>
            {AREAS.map(a => (
              <TouchableOpacity
                key={a.key}
                style={[styles.areaChip, activeArea === a.key && styles.areaChipActive]}
                onPress={() => setActiveArea(a.key)}
              >
                <Text style={[styles.areaChipText, activeArea === a.key && styles.areaChipTextActive]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Your rating</Text>
          <View style={styles.starsRow}>
            {[1,2,3,4,5].map(s => (
              <TouchableOpacity key={s} onPress={() => setRating(s)} style={styles.starBtn}>
                <Ionicons
                  name={s <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={s <= rating ? '#F59E0B' : '#ccc'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.anonRow} onPress={() => setAnonymous(!anonymous)}>
            <View style={[styles.checkbox, anonymous && styles.checkboxActive]}>
              {anonymous && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.anonText}>Submit anonymously</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, (submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.submitBtnText}>Submit Feedback</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#042C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centeredMsg}>
          <ActivityIndicator size="large" color="#1A7A4A" />
        </View>
      ) : reservations.length === 0 ? (
        <View style={styles.centeredMsg}>
          <Ionicons name="star-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No meals pending feedback.</Text>
          <Text style={styles.emptySubtext}>Feedback opens after a meal is issued and closes after 24 hours.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A7A4A']} />}
        >
          <Text style={styles.sectionTitle}>{reservations.length} meal{reservations.length > 1 ? 's' : ''} awaiting feedback</Text>
          {reservations.map((r, idx) => (
            <TouchableOpacity key={r.reservationId || idx} style={styles.resCard} onPress={() => openFeedback(r)}>
              <View style={styles.resLeft}>
                <Text style={styles.resDate}>{r.reservationDate}</Text>
                <Text style={styles.resMeal}>{MEAL_LABELS[r.mealType] || r.mealType}</Text>
              </View>
              <View style={styles.resMid}>
                <Text style={styles.resItem}>{r.optionLabel || r.itemName}</Text>
              </View>
              <View style={styles.rateNowBtn}>
                <Text style={styles.rateNowText}>Rate</Text>
                <Ionicons name="chevron-forward" size={14} color="#1A7A4A" />
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
  container:          { flex: 1, backgroundColor: '#EBF9F4' },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5EF' },
  backBtn:            { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:        { fontSize: 18, fontWeight: '700', color: '#042C1E' },
  centeredMsg:        { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  emptyText:          { fontSize: 14, color: '#aaa', textAlign: 'center' },
  emptySubtext:       { fontSize: 12, color: '#bbb', textAlign: 'center' },
  scroll:             { padding: 16 },
  sectionTitle:       { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 12 },
  resCard:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  resLeft:            { width: 70 },
  resDate:            { fontSize: 11, color: '#888' },
  resMeal:            { fontSize: 12, fontWeight: '600', color: '#1A7A4A', marginTop: 2 },
  resMid:             { flex: 1, paddingHorizontal: 10 },
  resItem:            { fontSize: 14, fontWeight: '500', color: '#333' },
  rateNowBtn:         { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rateNowText:        { fontSize: 13, fontWeight: '600', color: '#1A7A4A' },
  // Feedback form
  feedbackHeader:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 1 },
  feedbackMeal:       { fontSize: 13, color: '#1A7A4A', fontWeight: '600', marginBottom: 4 },
  feedbackItem:       { fontSize: 16, fontWeight: '700', color: '#042C1E' },
  sectionLabel:       { fontSize: 13, color: '#888', marginBottom: 10, marginTop: 4 },
  areaGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  areaChip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#1A7A4A' },
  areaChipActive:     { backgroundColor: '#1A7A4A' },
  areaChipText:       { fontSize: 13, fontWeight: '600', color: '#1A7A4A' },
  areaChipTextActive: { color: '#fff' },
  starsRow:           { flexDirection: 'row', gap: 8, marginBottom: 20 },
  starBtn:            { padding: 4 },
  anonRow:            { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  checkbox:           { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#1A7A4A', alignItems: 'center', justifyContent: 'center' },
  checkboxActive:     { backgroundColor: '#1A7A4A' },
  anonText:           { fontSize: 14, color: '#555' },
  submitBtn:          { backgroundColor: '#1A7A4A', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled:  { backgroundColor: '#a0c4b8' },
  submitBtnText:      { fontSize: 16, fontWeight: '700', color: '#fff' },
});
