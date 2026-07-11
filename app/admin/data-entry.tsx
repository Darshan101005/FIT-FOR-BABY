import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { calculateNutrition, foodDatabase, FoodItemData, mealTimes, searchFoods } from '../../data/foodDatabase';
import {
  CoupleExerciseLog,
  coupleExerciseService,
  CoupleFoodLog,
  CoupleFoodLogItem,
  coupleFoodLogService,
  coupleService,
  CoupleStepEntry,
  coupleStepsService,
} from '../../services/firestore.service';

const isWeb = Platform.OS === 'web';

const COLORS = {
  primary: '#006dab',
  primaryDark: '#005a8f',
  accent: '#98be4e',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
};

type DataType = 'steps' | 'food' | 'exercise';

const EXERCISE_OPTIONS = [
  { id: 'couple-walking', name: 'Couple Walking', caloriesPerMinute: 4, requiresSteps: true, isCouple: true },
  { id: 'high-knees', name: 'High Knees', caloriesPerMinute: 8 },
  { id: 'yoga', name: 'Yoga/Pranayama', caloriesPerMinute: 3 },
  { id: 'strength', name: 'Strength Training', caloriesPerMinute: 5 },
  { id: 'swimming', name: 'Swimming', caloriesPerMinute: 7 },
  { id: 'cycling', name: 'Cycling', caloriesPerMinute: 6 },
  { id: 'other', name: 'Other Exercise', caloriesPerMinute: 5 },
];

const INTENSITY_LEVELS = [
  { id: 'light', label: 'Light', multiplier: 0.8 },
  { id: 'moderate', label: 'Moderate', multiplier: 1 },
  { id: 'vigorous', label: 'Vigorous', multiplier: 1.3 },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CartFood {
  food: FoodItemData;
  servingIndex: number;
  quantity: number;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d).getTime()) && new Date(d) <= new Date();

export default function AdminDataEntryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Couple + target selection
  const [couples, setCouples] = useState<any[]>([]);
  const [loadingCouples, setLoadingCouples] = useState(true);
  const [coupleQuery, setCoupleQuery] = useState('');
  const [selectedCoupleId, setSelectedCoupleId] = useState<string | null>(null);
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [entryDate, setEntryDate] = useState(todayStr());

  const [dataType, setDataType] = useState<DataType>('steps');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null); // which entry is being deleted
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Calendar
  const [showCalendar, setShowCalendar] = useState(false);
  const [calView, setCalView] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });

  // Existing entries for the chosen couple/gender/date
  const [existSteps, setExistSteps] = useState<CoupleStepEntry[]>([]);
  const [existFood, setExistFood] = useState<CoupleFoodLog[]>([]);
  const [existExercise, setExistExercise] = useState<CoupleExerciseLog[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  // Steps
  const [stepCount, setStepCount] = useState('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  // Food
  const [mealType, setMealType] = useState<string>('breakfast');
  const [foodQuery, setFoodQuery] = useState('');
  const [cart, setCart] = useState<CartFood[]>([]);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);

  // Exercise
  const [exerciseId, setExerciseId] = useState('couple-walking');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'vigorous'>('moderate');
  const [exSteps, setExSteps] = useState('');
  const [partnerParticipated, setPartnerParticipated] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await coupleService.getAll();
        // Sort by couple id so the list is predictable and complete
        data.sort((a: any, b: any) => (a.id || '').localeCompare(b.id || '', undefined, { numeric: true }));
        setCouples(data);
      } catch (e) {
        console.error('Error loading couples:', e);
      } finally {
        setLoadingCouples(false);
      }
    };
    load();
  }, []);

  const showBanner = (type: 'success' | 'error', msg: string) => {
    setBanner({ type, msg });
    setTimeout(() => setBanner(null), 4000);
  };

  const selectedCouple = couples.find(c => c.id === selectedCoupleId);

  // Load existing entries for the selected couple/gender/date
  const loadEntries = useCallback(async () => {
    if (!selectedCoupleId || !isValidDate(entryDate)) {
      setExistSteps([]); setExistFood([]); setExistExercise([]);
      return;
    }
    setLoadingEntries(true);
    try {
      const [steps, food, exercise] = await Promise.all([
        coupleStepsService.getByDate(selectedCoupleId, gender, entryDate),
        coupleFoodLogService.getByDate(selectedCoupleId, gender, entryDate),
        coupleExerciseService.getByDate(selectedCoupleId, gender, entryDate),
      ]);
      setExistSteps(steps);
      setExistFood(food);
      setExistExercise(exercise);
    } catch (e) {
      console.error('Error loading entries:', e);
    } finally {
      setLoadingEntries(false);
    }
  }, [selectedCoupleId, gender, entryDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const filteredCouples = useMemo(() => {
    const q = coupleQuery.trim().toLowerCase();
    if (!q) return couples;
    return couples.filter(c => {
      const id = (c.id || '').toLowerCase();
      const mName = (c.male?.name || '').toLowerCase();
      const fName = (c.female?.name || '').toLowerCase();
      return id.includes(q) || mName.includes(q) || fName.includes(q);
    });
  }, [couples, coupleQuery]);

  const foodResults = useMemo(() => {
    const base = foodQuery.trim() ? searchFoods(foodQuery) : foodDatabase;
    const seen = new Set<string>();
    return base.filter(f => {
      if (f.isCustom) return false;
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    }).slice(0, 40);
  }, [foodQuery]);

  const cartNutrition = useMemo(() => {
    const total = cart.reduce((acc, item) => {
      const serving = item.food.commonServings[item.servingIndex];
      const grams = (serving?.grams || item.food.defaultServingSize) * item.quantity;
      const n = calculateNutrition(item.food, grams);
      return {
        calories: acc.calories + n.calories,
        protein: acc.protein + n.protein,
        carbs: acc.carbs + n.carbs,
        fat: acc.fat + n.fat,
        grams: acc.grams + grams,
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, grams: 0 });
    return {
      calories: Math.round(total.calories),
      protein: parseFloat(total.protein.toFixed(1)),
      carbs: parseFloat(total.carbs.toFixed(1)),
      fat: parseFloat(total.fat.toFixed(1)),
      grams: Math.round(total.grams),
    };
  }, [cart]);

  const validateTarget = (): string | null => {
    if (!selectedCoupleId) return 'Please select a couple first.';
    if (!isValidDate(entryDate)) return 'Enter a valid date (YYYY-MM-DD), not in the future.';
    return null;
  };

  // ---------- STEPS ----------
  const resetStepsForm = () => { setStepCount(''); setEditingStepId(null); };

  const handleSaveSteps = async () => {
    const err = validateTarget();
    if (err) return showBanner('error', err);
    const count = parseInt(stepCount, 10);
    if (!count || count <= 0) return showBanner('error', 'Enter a valid step count.');
    setSaving(true);
    try {
      if (editingStepId) {
        await coupleStepsService.update(selectedCoupleId!, editingStepId, { stepCount: count });
        showBanner('success', `Updated steps to ${count}.`);
      } else {
        await coupleStepsService.add(selectedCoupleId!, gender, { stepCount: count, source: 'manual', date: entryDate });
        await coupleService.updateStreak(selectedCoupleId!, gender).catch(() => {});
        showBanner('success', `Saved ${count} steps for ${entryDate}.`);
      }
      resetStepsForm();
      await loadEntries();
    } catch (e) {
      console.error(e); showBanner('error', 'Failed to save steps.');
    } finally { setSaving(false); }
  };

  const handleDeleteStep = async (id: string) => {
    if (deletingId) return; // block double-clicks
    setDeletingId(id);
    try {
      await coupleStepsService.delete(selectedCoupleId!, id, gender);
      if (editingStepId === id) resetStepsForm();
      showBanner('success', 'Step entry deleted.');
      await loadEntries();
    } catch (e) { console.error(e); showBanner('error', 'Failed to delete.'); }
    finally { setDeletingId(null); }
  };

  const startEditStep = (s: CoupleStepEntry) => {
    setDataType('steps');
    setEditingStepId(s.id);
    setStepCount(String(s.stepCount));
  };

  // ---------- FOOD ----------
  const resetFoodForm = () => { setCart([]); setEditingFoodId(null); setFoodQuery(''); };

  const addToCart = (food: FoodItemData) => {
    const idx = food.commonServings.findIndex(s => s.label !== 'Custom');
    setCart(prev => [...prev, { food, servingIndex: idx >= 0 ? idx : 0, quantity: 1 }]);
  };
  const removeFromCart = (i: number) => setCart(prev => prev.filter((_, idx) => idx !== i));
  const updateCartQty = (i: number, delta: number) => setCart(prev => prev.map((item, idx) => idx === i ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  const updateCartServing = (i: number, servingIndex: number) => setCart(prev => prev.map((item, idx) => idx === i ? { ...item, servingIndex } : item));

  const buildFoodItems = (): CoupleFoodLogItem[] => cart.map(item => {
    const serving = item.food.commonServings[item.servingIndex];
    const grams = (serving?.grams || item.food.defaultServingSize) * item.quantity;
    const n = calculateNutrition(item.food, grams);
    return {
      foodId: item.food.id,
      name: item.food.name,
      nameTamil: item.food.nameTamil,
      quantity: item.quantity,
      servingSize: serving?.label || 'serving',
      servingGrams: serving?.grams || item.food.defaultServingSize,
      calories: n.calories,
      protein: n.protein,
      carbs: n.carbs,
      fat: n.fat,
    };
  });

  const handleSaveFood = async () => {
    const err = validateTarget();
    if (err) return showBanner('error', err);
    if (cart.length === 0) return showBanner('error', 'Add at least one food item.');
    setSaving(true);
    try {
      const foods = buildFoodItems();
      const mealLabel = mealTimes.find(m => m.id === mealType)?.label || mealType;
      const payload = {
        mealType, mealLabel, foods,
        totalCalories: cartNutrition.calories,
        totalProtein: cartNutrition.protein,
        totalCarbs: cartNutrition.carbs,
        totalFat: cartNutrition.fat,
        totalGrams: cartNutrition.grams,
      };
      if (editingFoodId) {
        await coupleFoodLogService.update(selectedCoupleId!, editingFoodId, payload);
        showBanner('success', `Updated ${mealLabel}.`);
      } else {
        await coupleFoodLogService.add(selectedCoupleId!, gender, { ...payload, date: entryDate });
        await coupleService.updateStreak(selectedCoupleId!, gender).catch(() => {});
        showBanner('success', `Logged ${mealLabel} (${foods.length} item(s)) for ${entryDate}.`);
      }
      resetFoodForm();
      await loadEntries();
    } catch (e) { console.error(e); showBanner('error', 'Failed to save meal.'); }
    finally { setSaving(false); }
  };

  const handleDeleteFood = async (id: string) => {
    if (deletingId) return; // block double-clicks
    setDeletingId(id);
    try {
      await coupleFoodLogService.delete(selectedCoupleId!, id);
      if (editingFoodId === id) resetFoodForm();
      showBanner('success', 'Meal deleted.');
      await loadEntries();
    } catch (e) { console.error(e); showBanner('error', 'Failed to delete.'); }
    finally { setDeletingId(null); }
  };

  // Load an existing meal back into the cart for editing
  const startEditFood = (log: CoupleFoodLog) => {
    setDataType('food');
    setEditingFoodId(log.id);
    setMealType(log.mealType);
    const newCart: CartFood[] = [];
    (log.foods || []).forEach(f => {
      const dbFood = foodDatabase.find(d => d.id === f.foodId);
      if (dbFood) {
        // Find matching serving index by label, else default
        let idx = dbFood.commonServings.findIndex(s => s.label === f.servingSize);
        if (idx < 0) idx = dbFood.commonServings.findIndex(s => s.label !== 'Custom');
        newCart.push({ food: dbFood, servingIndex: idx >= 0 ? idx : 0, quantity: f.quantity || 1 });
      }
    });
    setCart(newCart);
    if (newCart.length === 0) {
      showBanner('error', 'This meal has custom items that cannot be edited item-by-item. You can delete and re-add it.');
    }
  };

  // ---------- EXERCISE ----------
  const resetExerciseForm = () => { setDuration(''); setExSteps(''); setPartnerParticipated(false); setEditingExerciseId(null); setExerciseId('couple-walking'); setIntensity('moderate'); };

  const handleSaveExercise = async () => {
    const err = validateTarget();
    if (err) return showBanner('error', err);
    const mins = parseInt(duration, 10);
    if (!mins || mins <= 0) return showBanner('error', 'Enter a valid duration in minutes.');
    const ex = EXERCISE_OPTIONS.find(e => e.id === exerciseId)!;
    const mult = INTENSITY_LEVELS.find(l => l.id === intensity)!.multiplier;
    const caloriesBurned = Math.round(ex.caloriesPerMinute * mins * mult);
    setSaving(true);
    try {
      const payload = {
        exerciseType: ex.id,
        exerciseName: ex.name,
        nameTamil: ex.name,
        duration: mins,
        intensity,
        caloriesPerMinute: ex.caloriesPerMinute,
        caloriesBurned,
        steps: ex.requiresSteps && exSteps ? parseInt(exSteps, 10) : undefined,
        partnerParticipated,
      };
      if (editingExerciseId) {
        await coupleExerciseService.update(selectedCoupleId!, editingExerciseId, payload);
        showBanner('success', `Updated ${ex.name}.`);
      } else {
        await coupleExerciseService.add(selectedCoupleId!, gender, { ...payload, perceivedExertion: 5, date: entryDate });
        await coupleService.updateStreak(selectedCoupleId!, gender).catch(() => {});
        showBanner('success', `Logged ${ex.name} (${mins} min) for ${entryDate}.`);
      }
      resetExerciseForm();
      await loadEntries();
    } catch (e) { console.error(e); showBanner('error', 'Failed to save exercise.'); }
    finally { setSaving(false); }
  };

  const handleDeleteExercise = async (id: string) => {
    if (deletingId) return; // block double-clicks
    setDeletingId(id);
    try {
      await coupleExerciseService.delete(selectedCoupleId!, id);
      if (editingExerciseId === id) resetExerciseForm();
      showBanner('success', 'Exercise deleted.');
      await loadEntries();
    } catch (e) { console.error(e); showBanner('error', 'Failed to delete.'); }
    finally { setDeletingId(null); }
  };

  const startEditExercise = (log: CoupleExerciseLog) => {
    setDataType('exercise');
    setEditingExerciseId(log.id);
    setExerciseId(EXERCISE_OPTIONS.find(e => e.id === log.exerciseType)?.id || 'other');
    setDuration(String(log.duration));
    setIntensity((log.intensity as any) || 'moderate');
    setExSteps(log.steps ? String(log.steps) : '');
    setPartnerParticipated(!!log.partnerParticipated);
  };

  // ---------- Safety auto-save on leaving the page ----------
  // Keep a live snapshot of the current form so the unmount cleanup can save
  // whatever the admin typed but forgot to submit.
  const snapshotRef = useRef<any>({});
  snapshotRef.current = {
    selectedCoupleId, gender, entryDate,
    stepCount, editingStepId,
    mealType, cart, editingFoodId,
    exerciseId, duration, intensity, exSteps, partnerParticipated, editingExerciseId,
  };

  useEffect(() => {
    // Runs once on unmount: fire-and-forget save of any pending input.
    return () => {
      const s = snapshotRef.current;
      if (!s?.selectedCoupleId || !isValidDate(s.entryDate)) return;

      // Pending steps
      const count = parseInt(s.stepCount, 10);
      if (count && count > 0) {
        if (s.editingStepId) {
          coupleStepsService.update(s.selectedCoupleId, s.editingStepId, { stepCount: count }).catch(() => {});
        } else {
          coupleStepsService.add(s.selectedCoupleId, s.gender, { stepCount: count, source: 'manual', date: s.entryDate })
            .then(() => coupleService.updateStreak(s.selectedCoupleId, s.gender)).catch(() => {});
        }
      }

      // Pending food (cart has items)
      if (Array.isArray(s.cart) && s.cart.length > 0) {
        const foods: CoupleFoodLogItem[] = s.cart.map((item: CartFood) => {
          const serving = item.food.commonServings[item.servingIndex];
          const grams = (serving?.grams || item.food.defaultServingSize) * item.quantity;
          const n = calculateNutrition(item.food, grams);
          return {
            foodId: item.food.id, name: item.food.name, nameTamil: item.food.nameTamil,
            quantity: item.quantity, servingSize: serving?.label || 'serving',
            servingGrams: serving?.grams || item.food.defaultServingSize,
            calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat,
          };
        });
        const totals = foods.reduce((a, f) => ({
          calories: a.calories + f.calories, protein: a.protein + f.protein,
          carbs: a.carbs + f.carbs, fat: a.fat + f.fat, grams: a.grams + f.servingGrams * f.quantity,
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, grams: 0 });
        const mealLabel = mealTimes.find(m => m.id === s.mealType)?.label || s.mealType;
        const payload = {
          mealType: s.mealType, mealLabel, foods,
          totalCalories: Math.round(totals.calories),
          totalProtein: parseFloat(totals.protein.toFixed(1)),
          totalCarbs: parseFloat(totals.carbs.toFixed(1)),
          totalFat: parseFloat(totals.fat.toFixed(1)),
          totalGrams: Math.round(totals.grams),
        };
        if (s.editingFoodId) {
          coupleFoodLogService.update(s.selectedCoupleId, s.editingFoodId, payload).catch(() => {});
        } else {
          coupleFoodLogService.add(s.selectedCoupleId, s.gender, { ...payload, date: s.entryDate })
            .then(() => coupleService.updateStreak(s.selectedCoupleId, s.gender)).catch(() => {});
        }
      }

      // Pending exercise
      const mins = parseInt(s.duration, 10);
      if (mins && mins > 0) {
        const ex = EXERCISE_OPTIONS.find(e => e.id === s.exerciseId);
        const mult = INTENSITY_LEVELS.find(l => l.id === s.intensity)?.multiplier || 1;
        if (ex) {
          const caloriesBurned = Math.round(ex.caloriesPerMinute * mins * mult);
          const payload = {
            exerciseType: ex.id, exerciseName: ex.name, nameTamil: ex.name,
            duration: mins, intensity: s.intensity, caloriesPerMinute: ex.caloriesPerMinute,
            caloriesBurned, steps: ex.requiresSteps && s.exSteps ? parseInt(s.exSteps, 10) : undefined,
            partnerParticipated: s.partnerParticipated,
          };
          if (s.editingExerciseId) {
            coupleExerciseService.update(s.selectedCoupleId, s.editingExerciseId, payload).catch(() => {});
          } else {
            coupleExerciseService.add(s.selectedCoupleId, s.gender, { ...payload, perceivedExertion: 5, date: s.entryDate })
              .then(() => coupleService.updateStreak(s.selectedCoupleId, s.gender)).catch(() => {});
          }
        }
      }
    };
  }, []);

  // ---------- Calendar helpers ----------
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const renderCalendar = () => {
    if (!showCalendar) return null;
    const today = new Date();
    const dim = daysInMonth(calView.year, calView.month);
    const fd = firstDayOfMonth(calView.year, calView.month);
    const cells: (number | null)[] = [];
    for (let i = 0; i < fd; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);

    const goPrev = () => setCalView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
    const goNext = () => {
      const nm = calView.month === 11 ? 0 : calView.month + 1;
      const ny = calView.month === 11 ? calView.year + 1 : calView.year;
      if (new Date(ny, nm, 1) <= today) setCalView({ year: ny, month: nm });
    };

    return (
      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <View style={styles.calOverlay}>
          <View style={styles.calCard}>
            <View style={styles.calHeader}>
              <Text style={styles.calTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}><Ionicons name="close" size={24} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.calNav}>
              <TouchableOpacity onPress={goPrev} style={styles.calNavBtn}><Ionicons name="chevron-back" size={22} color={COLORS.primary} /></TouchableOpacity>
              <Text style={styles.calMonthText}>{MONTHS[calView.month]} {calView.year}</Text>
              <TouchableOpacity onPress={goNext} style={styles.calNavBtn}><Ionicons name="chevron-forward" size={22} color={COLORS.primary} /></TouchableOpacity>
            </View>
            <View style={styles.calDayHeaders}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <Text key={d} style={styles.calDayHeader}>{d}</Text>)}
            </View>
            <View style={styles.calGrid}>
              {cells.map((d, i) => {
                if (d === null) return <View key={`e${i}`} style={styles.calCell} />;
                const dateStr = `${calView.year}-${String(calView.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isFuture = new Date(dateStr) > today;
                const isSelected = dateStr === entryDate;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.calCell, isSelected && styles.calCellSelected, isFuture && styles.calCellDisabled]}
                    disabled={isFuture}
                    onPress={() => { setEntryDate(dateStr); setShowCalendar(false); }}
                  >
                    <Text style={[styles.calCellText, isSelected && styles.calCellTextSelected, isFuture && styles.calCellTextDisabled]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const genderLabel = gender === 'male' ? (selectedCouple?.male?.name || 'Male') : (selectedCouple?.female?.name || 'Female');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Manual Data Entry</Text>
            <Text style={styles.subtitle}>View, add, edit & delete steps, food and exercise for any date</Text>
          </View>
        </View>

        {banner && (
          <View style={[styles.banner, banner.type === 'success' ? styles.bannerSuccess : styles.bannerError]}>
            <Ionicons name={banner.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={18} color={banner.type === 'success' ? COLORS.success : COLORS.error} />
            <Text style={[styles.bannerText, { color: banner.type === 'success' ? '#15803d' : '#b91c1c' }]}>{banner.msg}</Text>
          </View>
        )}

        {/* Step 1: Couple */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>1. Select Couple ({couples.length})</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput style={styles.searchInput} placeholder="Search by Couple ID or name..." placeholderTextColor={COLORS.textMuted} value={coupleQuery} onChangeText={setCoupleQuery} />
          </View>
          {loadingCouples ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />
          ) : (
            <ScrollView style={styles.coupleList} nestedScrollEnabled>
              {filteredCouples.map(c => (
                <TouchableOpacity key={c.id} style={[styles.coupleRow, selectedCoupleId === c.id && styles.coupleRowActive]} onPress={() => setSelectedCoupleId(c.id)}>
                  <View>
                    <Text style={styles.coupleId}>{c.id}</Text>
                    <Text style={styles.coupleNames}>{c.female?.name || '—'} & {c.male?.name || '—'}</Text>
                  </View>
                  {selectedCoupleId === c.id && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
              {filteredCouples.length === 0 && <Text style={styles.muted}>No couples found.</Text>}
            </ScrollView>
          )}
        </View>

        {/* Step 2: partner + date */}
        {selectedCoupleId && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>2. Partner & Date</Text>
            <Text style={styles.fieldLabel}>Partner</Text>
            <View style={styles.segment}>
              {(['female', 'male'] as const).map(g => (
                <TouchableOpacity key={g} style={[styles.segmentBtn, gender === g && styles.segmentBtnActive]} onPress={() => setGender(g)}>
                  <Ionicons name={g === 'male' ? 'male' : 'female'} size={16} color={gender === g ? '#fff' : COLORS.textSecondary} />
                  <Text style={[styles.segmentText, gender === g && styles.segmentTextActive]}>{g === 'male' ? (selectedCouple?.male?.name || 'Male') : (selectedCouple?.female?.name || 'Female')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Date</Text>
            <View style={styles.dateRow}>
              <View style={[styles.searchBox, { flex: 1 }, !isValidDate(entryDate) && { borderColor: COLORS.error }]}>
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <TextInput style={styles.searchInput} placeholder="2026-07-01" placeholderTextColor={COLORS.textMuted} value={entryDate} onChangeText={setEntryDate} />
              </View>
              <TouchableOpacity style={styles.calBtn} onPress={() => { const dd = isValidDate(entryDate) ? new Date(entryDate) : new Date(); setCalView({ year: dd.getFullYear(), month: dd.getMonth() }); setShowCalendar(true); }}>
                <Ionicons name="calendar" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.quickDates}>
              <TouchableOpacity style={styles.quickChip} onPress={() => setEntryDate(todayStr())}><Text style={styles.quickChipText}>Today</Text></TouchableOpacity>
              <TouchableOpacity style={styles.quickChip} onPress={() => setEntryDate(new Date(Date.now() - 86400000).toISOString().split('T')[0])}><Text style={styles.quickChipText}>Yesterday</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: data entry + existing */}
        {selectedCoupleId && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>3. Data for {genderLabel} on {entryDate}</Text>
            <View style={styles.tabs}>
              {([
                { id: 'steps', label: 'Steps', icon: 'footsteps' },
                { id: 'food', label: 'Food', icon: 'nutrition' },
                { id: 'exercise', label: 'Exercise', icon: 'fitness' },
              ] as { id: DataType; label: string; icon: string }[]).map(t => (
                <TouchableOpacity key={t.id} style={[styles.tab, dataType === t.id && styles.tabActive]} onPress={() => setDataType(t.id)}>
                  <Ionicons name={t.icon as any} size={18} color={dataType === t.id ? COLORS.primary : COLORS.textSecondary} />
                  <Text style={[styles.tabText, dataType === t.id && styles.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* STEPS */}
            {dataType === 'steps' && (
              <View style={styles.section}>
                {existSteps.length > 0 && (
                  <View style={styles.existBox}>
                    <Text style={styles.existTitle}>Existing step entries</Text>
                    {existSteps.map(s => (
                      <View key={s.id} style={styles.existRow}>
                        <Text style={styles.existMain}>{s.stepCount.toLocaleString()} steps</Text>
                        <View style={styles.existActions}>
                          <TouchableOpacity onPress={() => startEditStep(s)} disabled={!!deletingId}><Ionicons name="pencil" size={18} color={deletingId ? COLORS.textMuted : COLORS.primary} /></TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteStep(s.id)} disabled={!!deletingId}>
                            {deletingId === s.id ? <ActivityIndicator size="small" color={COLORS.error} /> : <Ionicons name="trash-outline" size={18} color={deletingId ? COLORS.textMuted : COLORS.error} />}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.fieldLabel}>{editingStepId ? 'Edit Step Count' : 'Step Count'}</Text>
                <TextInput style={styles.numberInput} placeholder="e.g. 7500" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={stepCount} onChangeText={setStepCount} />
                <View style={styles.formBtnRow}>
                  {editingStepId && <TouchableOpacity style={styles.cancelBtn} onPress={resetStepsForm}><Text style={styles.cancelBtnText}>Cancel Edit</Text></TouchableOpacity>}
                  <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSaveSteps} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="save" size={18} color="#fff" /><Text style={styles.saveBtnText}>{editingStepId ? 'Update Steps' : 'Save Steps'}</Text></>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* FOOD */}
            {dataType === 'food' && (
              <View style={styles.section}>
                {existFood.length > 0 && (
                  <View style={styles.existBox}>
                    <Text style={styles.existTitle}>Logged meals</Text>
                    {existFood.map(m => (
                      <View key={m.id} style={styles.existRowCol}>
                        <View style={styles.existRow}>
                          <Text style={styles.existMain}>{m.mealLabel} • {m.totalCalories} cal</Text>
                          <View style={styles.existActions}>
                            <TouchableOpacity onPress={() => startEditFood(m)} disabled={!!deletingId}><Ionicons name="pencil" size={18} color={deletingId ? COLORS.textMuted : COLORS.primary} /></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteFood(m.id)} disabled={!!deletingId}>
                              {deletingId === m.id ? <ActivityIndicator size="small" color={COLORS.error} /> : <Ionicons name="trash-outline" size={18} color={deletingId ? COLORS.textMuted : COLORS.error} />}
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Text style={styles.existSub}>{(m.foods || []).map(f => `${f.name} (${f.quantity}×${f.servingSize})`).join(', ')}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {editingFoodId && <View style={styles.editingBadge}><Text style={styles.editingBadgeText}>Editing meal — change items below and Update</Text></View>}

                <Text style={styles.fieldLabel}>Meal Time</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {mealTimes.map(m => (
                      <TouchableOpacity key={m.id} style={[styles.mealChip, mealType === m.id && styles.mealChipActive]} onPress={() => setMealType(m.id)}>
                        <Text style={[styles.mealChipText, mealType === m.id && styles.mealChipTextActive]}>{m.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.fieldLabel}>Search & Add Foods</Text>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput style={styles.searchInput} placeholder="Search any food (idli, dosa, coffee...)" placeholderTextColor={COLORS.textMuted} value={foodQuery} onChangeText={setFoodQuery} />
                </View>
                <ScrollView style={styles.foodList} nestedScrollEnabled>
                  {foodResults.map(f => (
                    <TouchableOpacity key={f.id} style={styles.foodRow} onPress={() => addToCart(f)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.foodName}>{f.name}</Text>
                        <Text style={styles.foodMeta}>{f.caloriesPer100g} cal/100g • {f.subCategory}</Text>
                      </View>
                      <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {cart.length > 0 && (
                  <View style={styles.cartBox}>
                    <Text style={styles.fieldLabel}>Meal Items ({cart.length})</Text>
                    {cart.map((item, i) => (
                      <View key={i} style={styles.cartItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.foodName}>{item.food.name}</Text>
                          <View style={styles.servingRow}>
                            {item.food.commonServings.filter(s => s.label !== 'Custom').map((s) => {
                              const realIdx = item.food.commonServings.indexOf(s);
                              return (
                                <TouchableOpacity key={s.label} style={[styles.servingChip, item.servingIndex === realIdx && styles.servingChipActive]} onPress={() => updateCartServing(i, realIdx)}>
                                  <Text style={[styles.servingChipText, item.servingIndex === realIdx && styles.servingChipTextActive]}>{s.label}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                        <View style={styles.qtyControls}>
                          <TouchableOpacity onPress={() => updateCartQty(i, -1)}><Ionicons name="remove-circle-outline" size={22} color={COLORS.textSecondary} /></TouchableOpacity>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                          <TouchableOpacity onPress={() => updateCartQty(i, 1)}><Ionicons name="add-circle-outline" size={22} color={COLORS.textSecondary} /></TouchableOpacity>
                          <TouchableOpacity onPress={() => removeFromCart(i)} style={{ marginLeft: 6 }}><Ionicons name="trash-outline" size={18} color={COLORS.error} /></TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    <Text style={styles.cartTotal}>Total: {cartNutrition.calories} cal • P {cartNutrition.protein}g • C {cartNutrition.carbs}g • F {cartNutrition.fat}g</Text>
                  </View>
                )}

                <View style={styles.formBtnRow}>
                  {editingFoodId && <TouchableOpacity style={styles.cancelBtn} onPress={resetFoodForm}><Text style={styles.cancelBtnText}>Cancel Edit</Text></TouchableOpacity>}
                  <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSaveFood} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="save" size={18} color="#fff" /><Text style={styles.saveBtnText}>{editingFoodId ? 'Update Meal' : 'Log Meal'}</Text></>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* EXERCISE */}
            {dataType === 'exercise' && (
              <View style={styles.section}>
                {existExercise.length > 0 && (
                  <View style={styles.existBox}>
                    <Text style={styles.existTitle}>Logged exercises</Text>
                    {existExercise.map(x => (
                      <View key={x.id} style={styles.existRow}>
                        <Text style={styles.existMain}>{x.exerciseName} • {x.duration} min • {x.caloriesBurned} cal</Text>
                        <View style={styles.existActions}>
                          <TouchableOpacity onPress={() => startEditExercise(x)} disabled={!!deletingId}><Ionicons name="pencil" size={18} color={deletingId ? COLORS.textMuted : COLORS.primary} /></TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteExercise(x.id)} disabled={!!deletingId}>
                            {deletingId === x.id ? <ActivityIndicator size="small" color={COLORS.error} /> : <Ionicons name="trash-outline" size={18} color={deletingId ? COLORS.textMuted : COLORS.error} />}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {editingExerciseId && <View style={styles.editingBadge}><Text style={styles.editingBadgeText}>Editing exercise — change fields below and Update</Text></View>}

                <Text style={styles.fieldLabel}>Exercise Type</Text>
                <View style={styles.exGrid}>
                  {EXERCISE_OPTIONS.map(ex => (
                    <TouchableOpacity key={ex.id} style={[styles.exChip, exerciseId === ex.id && styles.exChipActive]} onPress={() => setExerciseId(ex.id)}>
                      <Text style={[styles.exChipText, exerciseId === ex.id && styles.exChipTextActive]}>{ex.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Duration (minutes)</Text>
                <TextInput style={styles.numberInput} placeholder="e.g. 30" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={duration} onChangeText={setDuration} />

                <Text style={styles.fieldLabel}>Intensity</Text>
                <View style={styles.segment}>
                  {INTENSITY_LEVELS.map(l => (
                    <TouchableOpacity key={l.id} style={[styles.segmentBtn, intensity === l.id && styles.segmentBtnActive]} onPress={() => setIntensity(l.id as any)}>
                      <Text style={[styles.segmentText, intensity === l.id && styles.segmentTextActive]}>{l.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {EXERCISE_OPTIONS.find(e => e.id === exerciseId)?.requiresSteps && (
                  <>
                    <Text style={styles.fieldLabel}>Steps (optional)</Text>
                    <TextInput style={styles.numberInput} placeholder="e.g. 3000" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" value={exSteps} onChangeText={setExSteps} />
                  </>
                )}

                {EXERCISE_OPTIONS.find(e => e.id === exerciseId)?.isCouple && (
                  <TouchableOpacity style={styles.checkboxRow} onPress={() => setPartnerParticipated(!partnerParticipated)}>
                    <Ionicons name={partnerParticipated ? 'checkbox' : 'square-outline'} size={22} color={COLORS.primary} />
                    <Text style={styles.checkboxLabel}>Partner participated</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.formBtnRow}>
                  {editingExerciseId && <TouchableOpacity style={styles.cancelBtn} onPress={resetExerciseForm}><Text style={styles.cancelBtnText}>Cancel Edit</Text></TouchableOpacity>}
                  <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSaveExercise} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <><Ionicons name="save" size={18} color="#fff" /><Text style={styles.saveBtnText}>{editingExerciseId ? 'Update Exercise' : 'Save Exercise'}</Text></>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {loadingEntries && !saving && !deletingId && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {renderCalendar()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, maxWidth: 900, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1 },
  bannerSuccess: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  bannerError: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '500' },
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  cardLabel: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.background },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, ...(isWeb ? { outlineStyle: 'none' } as any : {}) },
  coupleList: { maxHeight: 300, marginTop: 10 },
  coupleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  coupleRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  coupleId: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  coupleNames: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  muted: { color: COLORS.textMuted, fontSize: 13, padding: 12, textAlign: 'center' },
  segment: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  segmentBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  segmentTextActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  calBtn: { width: 44, height: 42, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  quickDates: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quickChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.borderLight },
  quickChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  tabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  section: { marginTop: 4 },
  numberInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: COLORS.textPrimary, backgroundColor: COLORS.background, marginBottom: 12, ...(isWeb ? { outlineStyle: 'none' } as any : {}) },
  formBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 12 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  // existing entries
  existBox: { backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 16 },
  existTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  existRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  existRowCol: { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  existMain: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  existSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  existActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  editingBadge: { backgroundColor: COLORS.warning + '20', borderRadius: 8, padding: 8, marginBottom: 12 },
  editingBadgeText: { fontSize: 12, color: '#b45309', fontWeight: '600', textAlign: 'center' },
  mealChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  mealChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  mealChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  mealChipTextActive: { color: '#fff' },
  foodList: { maxHeight: 220, marginTop: 10 },
  foodRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, backgroundColor: COLORS.background },
  foodName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  foodMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cartBox: { marginTop: 14, padding: 12, backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  servingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  servingChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  servingChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  servingChipText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  servingChipTextActive: { color: '#fff' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, minWidth: 22, textAlign: 'center' },
  cartTotal: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 10 },
  exGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  exChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  exChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  exChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  exChipTextActive: { color: '#fff' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 4 },
  checkboxLabel: { fontSize: 14, color: COLORS.textPrimary },
  // calendar
  calOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  calCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, width: '100%', maxWidth: 360 },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calNavBtn: { padding: 6 },
  calMonthText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  calDayHeaders: { flexDirection: 'row', marginBottom: 6 },
  calDayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calCellSelected: { backgroundColor: COLORS.primary, borderRadius: 8 },
  calCellDisabled: { opacity: 0.3 },
  calCellText: { fontSize: 14, color: COLORS.textPrimary },
  calCellTextSelected: { color: '#fff', fontWeight: '700' },
  calCellTextDisabled: { color: COLORS.textMuted },
});
