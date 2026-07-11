/**
 * Report Export Service
 *
 * Central logic for the admin monitoring export feature. Supports four report
 * types (Overall, Diet, Exercise, Step), an optional single-couple filter, and
 * generates data for CSV, PDF (HTML) and real .xlsx (via SheetJS) outputs.
 */

import * as XLSX from 'xlsx';
import {
    coupleExerciseService,
    coupleFoodLogService,
    coupleStepsService,
} from './firestore.service';

export type ReportType = 'overall' | 'diet' | 'exercise' | 'step';

export type ReportStatus = 'complete' | 'partial' | 'missed' | 'pending';

export interface CoupleInfo {
  coupleId: string;
  maleName: string;
  femaleName: string;
  maleEmail: string;
  femaleEmail: string;
  malePhone: string;
  femalePhone: string;
  enrollmentDate: string;
}

export interface ReportOptions {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  coupleId?: string | null; // when set, only this couple is included
}

// Goals used to derive status
const STEP_GOAL = 7000;
const EXERCISE_GOAL = 60; // minutes
const HIGH_KNEES_GOAL = 30; // minutes
const DIET_COMPLETE_MEALS = 3; // meals for a "complete" diet day

const stepStatus = (count: number): ReportStatus =>
  count >= STEP_GOAL ? 'complete' : count > 0 ? 'partial' : 'pending';
const exerciseStatus = (duration: number): ReportStatus =>
  duration >= EXERCISE_GOAL ? 'complete' : duration > 0 ? 'partial' : 'pending';
const highKneesStatus = (duration: number): ReportStatus =>
  duration >= HIGH_KNEES_GOAL ? 'complete' : duration > 0 ? 'partial' : 'pending';
const dietStatus = (mealCount: number): ReportStatus =>
  mealCount >= DIET_COMPLETE_MEALS ? 'complete' : mealCount > 0 ? 'partial' : 'pending';

/** Resolve a display name with sensible fallbacks. */
const resolveName = (name: string | undefined, email: string | undefined, fallback: string) => {
  if (name && name !== 'Male Partner' && name !== 'Female Partner') return name;
  if (email) return email.split('@')[0];
  return fallback;
};

// ============================================================
// DATA FETCHING
// ============================================================

/** Overall report row: one row per couple per active date. */
export interface OverallRow {
  reportDate: string;
  coupleId: string;
  maleName: string;
  femaleName: string;
  maleEmail: string;
  femaleEmail: string;
  malePhone: string;
  femalePhone: string;
  enrollmentDate: string;
  maleSteps: number;
  femaleSteps: number;
  maleStepsStatus: ReportStatus;
  femaleStepsStatus: ReportStatus;
  maleExerciseDuration: number;
  maleExerciseCalories: number;
  femaleExerciseDuration: number;
  femaleExerciseCalories: number;
  maleExerciseStatus: ReportStatus;
  femaleExerciseStatus: ReportStatus;
  maleDietStatus: ReportStatus;
  femaleDietStatus: ReportStatus;
  maleMeals: number;
  femaleMeals: number;
  maleHighKneesMinutes: number;
  femaleHighKneesMinutes: number;
  maleHighKneesStatus: ReportStatus;
  femaleHighKneesStatus: ReportStatus;
}

/** Diet report row: one row per food item within a meal. */
export interface DietRow {
  reportDate: string;
  coupleId: string;
  partner: string; // name
  gender: 'male' | 'female';
  mealLabel: string;
  foodName: string;
  quantity: number | string;
  servingSize: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isMealTotal?: boolean;
}

/** Exercise report row: one row per exercise log. */
export interface ExerciseRow {
  reportDate: string;
  coupleId: string;
  partner: string;
  gender: 'male' | 'female';
  exerciseName: string;
  duration: number;
  intensity: string;
  caloriesBurned: number;
  steps: number | string;
  partnerParticipated: string;
}

/** Step report row: one row per step entry. */
export interface StepRow {
  reportDate: string;
  coupleId: string;
  partner: string;
  gender: 'male' | 'female';
  stepCount: number;
  source: string;
  status: ReportStatus;
}

export interface ReportData {
  reportType: ReportType;
  dateRange: { start: string; end: string };
  overall: OverallRow[];
  diet: DietRow[];
  exercise: ExerciseRow[];
  step: StepRow[];
  coupleCount: number;
}

const CONCURRENCY = 8;

/**
 * Fetch and structure report data for the given options.
 * Fetches steps, exercise and food logs (as needed) across the date range.
 */
export async function fetchReportData(
  options: ReportOptions,
  allCoupleIds: string[],
  coupleInfoMap: Record<string, CoupleInfo>
): Promise<ReportData> {
  const { reportType, startDate, endDate } = options;
  const singleDay = startDate === endDate;

  // Apply couple filter if provided
  const coupleIds = options.coupleId
    ? allCoupleIds.filter(id => id === options.coupleId)
    : allCoupleIds;

  const overall: OverallRow[] = [];
  const diet: DietRow[] = [];
  const exercise: ExerciseRow[] = [];
  const step: StepRow[] = [];

  const inRange = (d?: string) => !!d && d >= startDate && d <= endDate;

  const groupByDate = <T extends { date?: string }>(entries: T[]) => {
    const map = new Map<string, T[]>();
    for (const entry of entries) {
      if (!inRange(entry.date)) continue;
      const list = map.get(entry.date!);
      if (list) list.push(entry);
      else map.set(entry.date!, [entry]);
    }
    return map;
  };

  const buildCouple = async (coupleId: string) => {
    const info = coupleInfoMap[coupleId];
    const maleName = resolveName(info?.maleName, info?.maleEmail, coupleId + '_M');
    const femaleName = resolveName(info?.femaleName, info?.femaleEmail, coupleId + '_F');

    try {
      // Fetch everything needed for the range in parallel
      const [
        maleSteps, femaleSteps,
        maleExercise, femaleExercise,
        maleFood, femaleFood,
      ] = await Promise.all([
        coupleStepsService.getByDateRange(coupleId, 'male', startDate, endDate),
        coupleStepsService.getByDateRange(coupleId, 'female', startDate, endDate),
        coupleExerciseService.getByDateRange(coupleId, 'male', startDate, endDate),
        coupleExerciseService.getByDateRange(coupleId, 'female', startDate, endDate),
        coupleFoodLogService.getByDateRange(coupleId, 'male', startDate, endDate),
        coupleFoodLogService.getByDateRange(coupleId, 'female', startDate, endDate),
      ]);

      const maleStepsByDate = groupByDate(maleSteps);
      const femaleStepsByDate = groupByDate(femaleSteps);
      const maleExByDate = groupByDate(maleExercise);
      const femaleExByDate = groupByDate(femaleExercise);
      const maleFoodByDate = groupByDate(maleFood);
      const femaleFoodByDate = groupByDate(femaleFood);

      // Union of all dates that have ANY activity (steps, exercise OR food)
      const activeDates = new Set<string>([
        ...maleStepsByDate.keys(), ...femaleStepsByDate.keys(),
        ...maleExByDate.keys(), ...femaleExByDate.keys(),
        ...maleFoodByDate.keys(), ...femaleFoodByDate.keys(),
      ]);
      if (singleDay) activeDates.add(startDate);

      const sortedDates = Array.from(activeDates).sort();

      // ---- OVERALL ----
      for (const date of sortedDates) {
        const maleStepCount = (maleStepsByDate.get(date) || []).reduce((s, e) => s + e.stepCount, 0);
        const femaleStepCount = (femaleStepsByDate.get(date) || []).reduce((s, e) => s + e.stepCount, 0);

        const mEx = maleExByDate.get(date) || [];
        const fEx = femaleExByDate.get(date) || [];
        const maleExDuration = mEx.reduce((s, l) => s + l.duration, 0);
        const maleExCalories = mEx.reduce((s, l) => s + (l.caloriesBurned || 0), 0);
        const femaleExDuration = fEx.reduce((s, l) => s + l.duration, 0);
        const femaleExCalories = fEx.reduce((s, l) => s + (l.caloriesBurned || 0), 0);
        const maleHK = mEx.filter(l => l.exerciseType === 'high-knees').reduce((s, l) => s + l.duration, 0);
        const femaleHK = fEx.filter(l => l.exerciseType === 'high-knees').reduce((s, l) => s + l.duration, 0);

        const maleMeals = (maleFoodByDate.get(date) || []).length;
        const femaleMeals = (femaleFoodByDate.get(date) || []).length;

        overall.push({
          reportDate: date,
          coupleId,
          maleName,
          femaleName,
          maleEmail: info?.maleEmail || 'N/A',
          femaleEmail: info?.femaleEmail || 'N/A',
          malePhone: info?.malePhone || 'N/A',
          femalePhone: info?.femalePhone || 'N/A',
          enrollmentDate: info?.enrollmentDate || 'N/A',
          maleSteps: maleStepCount,
          femaleSteps: femaleStepCount,
          maleStepsStatus: stepStatus(maleStepCount),
          femaleStepsStatus: stepStatus(femaleStepCount),
          maleExerciseDuration: maleExDuration,
          maleExerciseCalories: maleExCalories,
          femaleExerciseDuration: femaleExDuration,
          femaleExerciseCalories: femaleExCalories,
          maleExerciseStatus: exerciseStatus(maleExDuration),
          femaleExerciseStatus: exerciseStatus(femaleExDuration),
          maleDietStatus: dietStatus(maleMeals),
          femaleDietStatus: dietStatus(femaleMeals),
          maleMeals,
          femaleMeals,
          maleHighKneesMinutes: maleHK,
          femaleHighKneesMinutes: femaleHK,
          maleHighKneesStatus: highKneesStatus(maleHK),
          femaleHighKneesStatus: highKneesStatus(femaleHK),
        });
      }

      // ---- DIET (detailed food items per meal) ----
      if (reportType === 'diet') {
        const addDietRows = (logs: typeof maleFood, gender: 'male' | 'female', partner: string) => {
          const sorted = [...logs].filter(l => inRange(l.date)).sort((a, b) => a.date.localeCompare(b.date));
          for (const meal of sorted) {
            const foods = meal.foods || [];
            for (const f of foods) {
              diet.push({
                reportDate: meal.date,
                coupleId,
                partner,
                gender,
                mealLabel: meal.mealLabel || meal.mealType || '-',
                foodName: f.name,
                quantity: f.quantity,
                servingSize: f.servingSize,
                grams: f.servingGrams,
                calories: f.calories,
                protein: f.protein,
                carbs: f.carbs,
                fat: f.fat,
              });
            }
            // Meal total row
            diet.push({
              reportDate: meal.date,
              coupleId,
              partner,
              gender,
              mealLabel: meal.mealLabel || meal.mealType || '-',
              foodName: 'MEAL TOTAL',
              quantity: '',
              servingSize: '',
              grams: meal.totalGrams,
              calories: meal.totalCalories,
              protein: meal.totalProtein,
              carbs: meal.totalCarbs,
              fat: meal.totalFat,
              isMealTotal: true,
            });
          }
        };
        addDietRows(maleFood, 'male', maleName);
        addDietRows(femaleFood, 'female', femaleName);
      }

      // ---- EXERCISE (detailed logs) ----
      if (reportType === 'exercise') {
        const addExRows = (logs: typeof maleExercise, gender: 'male' | 'female', partner: string) => {
          const sorted = [...logs].filter(l => inRange(l.date)).sort((a, b) => a.date.localeCompare(b.date));
          for (const l of sorted) {
            exercise.push({
              reportDate: l.date,
              coupleId,
              partner,
              gender,
              exerciseName: l.exerciseName || l.exerciseType || '-',
              duration: l.duration,
              intensity: l.intensity || '-',
              caloriesBurned: l.caloriesBurned || 0,
              steps: l.steps ?? '',
              partnerParticipated: l.partnerParticipated ? 'Yes' : 'No',
            });
          }
        };
        addExRows(maleExercise, 'male', maleName);
        addExRows(femaleExercise, 'female', femaleName);
      }

      // ---- STEP (detailed entries) ----
      if (reportType === 'step') {
        const addStepRows = (entries: typeof maleSteps, gender: 'male' | 'female', partner: string) => {
          // Aggregate by date so each day is one line with total steps
          const byDate = groupByDate(entries);
          for (const date of Array.from(byDate.keys()).sort()) {
            const list = byDate.get(date) || [];
            const total = list.reduce((s, e) => s + e.stepCount, 0);
            const source = list.map(e => e.source).filter(Boolean).join(', ') || '-';
            step.push({
              reportDate: date,
              coupleId,
              partner,
              gender,
              stepCount: total,
              source,
              status: stepStatus(total),
            });
          }
        };
        addStepRows(maleSteps, 'male', maleName);
        addStepRows(femaleSteps, 'female', femaleName);
      }
    } catch (error) {
      console.error(`Error building report data for ${coupleId}:`, error);
    }
  };

  // Process couples with bounded concurrency
  for (let i = 0; i < coupleIds.length; i += CONCURRENCY) {
    const batch = coupleIds.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(buildCouple));
  }

  // Sort each dataset by date then coupleId
  const byDateCouple = (a: any, b: any) =>
    a.reportDate !== b.reportDate
      ? a.reportDate.localeCompare(b.reportDate)
      : a.coupleId.localeCompare(b.coupleId);
  overall.sort(byDateCouple);
  diet.sort(byDateCouple);
  exercise.sort(byDateCouple);
  step.sort(byDateCouple);

  return {
    reportType,
    dateRange: { start: startDate, end: endDate },
    overall,
    diet,
    exercise,
    step,
    coupleCount: coupleIds.length,
  };
}


// ============================================================
// FILE BUILDERS
// ============================================================

const REPORT_TITLES: Record<ReportType, string> = {
  overall: 'Overall Activity Report',
  diet: 'Diet & Nutrition Report',
  exercise: 'Exercise Report',
  step: 'Step Count Report',
};

/** CSV-escape a value. */
const csvCell = (val: any): string => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/** Returns the column headers + row arrays (array-of-arrays) for a report type. */
export function buildRows(data: ReportData): { headers: string[]; rows: (string | number)[][] } {
  switch (data.reportType) {
    case 'diet': {
      const headers = ['Date', 'Couple ID', 'Partner', 'Gender', 'Meal', 'Food Item', 'Quantity', 'Serving', 'Grams', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
      const rows = data.diet.map(r => [
        r.reportDate, r.coupleId, r.partner, r.gender, r.mealLabel,
        r.foodName, r.quantity, r.servingSize, r.grams, r.calories, r.protein, r.carbs, r.fat,
      ]);
      return { headers, rows };
    }
    case 'exercise': {
      const headers = ['Date', 'Couple ID', 'Partner', 'Gender', 'Exercise', 'Duration (mins)', 'Intensity', 'Calories Burned', 'Steps', 'Partner Joined'];
      const rows = data.exercise.map(r => [
        r.reportDate, r.coupleId, r.partner, r.gender, r.exerciseName,
        r.duration, r.intensity, r.caloriesBurned, r.steps, r.partnerParticipated,
      ]);
      return { headers, rows };
    }
    case 'step': {
      const headers = ['Date', 'Couple ID', 'Partner', 'Gender', 'Total Steps', 'Source', 'Status'];
      const rows = data.step.map(r => [
        r.reportDate, r.coupleId, r.partner, r.gender, r.stepCount, r.source, r.status.toUpperCase(),
      ]);
      return { headers, rows };
    }
    case 'overall':
    default: {
      const headers = [
        'Date', 'Couple ID', 'Male Name', 'Female Name',
        'Male Steps', 'Male Step Status', 'Female Steps', 'Female Step Status',
        'Male Exercise (min)', 'Male Ex Status', 'Female Exercise (min)', 'Female Ex Status',
        'Male Meals', 'Male Diet Status', 'Female Meals', 'Female Diet Status',
        'Male High Knees (min)', 'Female High Knees (min)',
        'Male Email', 'Female Email', 'Male Phone', 'Female Phone', 'Enrolled',
      ];
      const rows = data.overall.map(r => [
        r.reportDate, r.coupleId, r.maleName, r.femaleName,
        r.maleSteps, r.maleStepsStatus.toUpperCase(), r.femaleSteps, r.femaleStepsStatus.toUpperCase(),
        r.maleExerciseDuration, r.maleExerciseStatus.toUpperCase(), r.femaleExerciseDuration, r.femaleExerciseStatus.toUpperCase(),
        r.maleMeals, r.maleDietStatus.toUpperCase(), r.femaleMeals, r.femaleDietStatus.toUpperCase(),
        r.maleHighKneesMinutes, r.femaleHighKneesMinutes,
        r.maleEmail, r.femaleEmail, r.malePhone, r.femalePhone, r.enrollmentDate,
      ]);
      return { headers, rows };
    }
  }
}

/** Build CSV string for the report. */
export function buildCSV(data: ReportData): string {
  const { headers, rows } = buildRows(data);
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(','));
  }
  return '\uFEFF' + lines.join('\n'); // UTF-8 BOM so Excel opens cleanly
}

/** Build a real .xlsx workbook (base64 or array) for the report. */
export function buildXLSX(data: ReportData, output: 'base64' | 'array'): any {
  const { headers, rows } = buildRows(data);
  const aoa: (string | number)[][] = [
    [REPORT_TITLES[data.reportType]],
    [`Period: ${data.dateRange.start} to ${data.dateRange.end}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    headers,
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(12, Math.min(30, h.length + 4)) }));

  const wb = XLSX.utils.book_new();
  const sheetName = REPORT_TITLES[data.reportType].slice(0, 28);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  return XLSX.write(wb, { type: output, bookType: 'xlsx' });
}

const statusBadge = (status: string) =>
  `<span class="badge b-${status}">${status}</span>`;

/** Build an HTML document for PDF printing. */
export function buildHTML(data: ReportData): string {
  const title = REPORT_TITLES[data.reportType];
  const { start, end } = data.dateRange;

  let tableHead = '';
  let tableBody = '';

  if (data.reportType === 'overall') {
    tableHead = `<tr>
      <th>Date</th><th>Couple</th><th>Male</th><th>Female</th>
      <th>M Steps</th><th>F Steps</th><th>M Exercise</th><th>F Exercise</th>
      <th>M Diet</th><th>F Diet</th><th>M High Knees</th><th>F High Knees</th>
    </tr>`;
    tableBody = data.overall.map(r => `<tr>
      <td>${r.reportDate}</td>
      <td class="l"><b>${r.coupleId}</b></td>
      <td class="l">${r.maleName}</td>
      <td class="l">${r.femaleName}</td>
      <td>${Number(r.maleSteps).toLocaleString()}<br>${statusBadge(r.maleStepsStatus)}</td>
      <td>${Number(r.femaleSteps).toLocaleString()}<br>${statusBadge(r.femaleStepsStatus)}</td>
      <td>${r.maleExerciseDuration}m<br>${statusBadge(r.maleExerciseStatus)}</td>
      <td>${r.femaleExerciseDuration}m<br>${statusBadge(r.femaleExerciseStatus)}</td>
      <td>${r.maleMeals} meals<br>${statusBadge(r.maleDietStatus)}</td>
      <td>${r.femaleMeals} meals<br>${statusBadge(r.femaleDietStatus)}</td>
      <td>${r.maleHighKneesMinutes > 0 ? r.maleHighKneesMinutes + 'm' : '-'}</td>
      <td>${r.femaleHighKneesMinutes > 0 ? r.femaleHighKneesMinutes + 'm' : '-'}</td>
    </tr>`).join('');
  } else if (data.reportType === 'diet') {
    tableHead = `<tr>
      <th>Date</th><th>Couple</th><th>Partner</th><th>Meal</th><th>Food Item</th>
      <th>Qty</th><th>Serving</th><th>Grams</th><th>Cal</th><th>Protein</th><th>Carbs</th><th>Fat</th>
    </tr>`;
    tableBody = data.diet.map(r => `<tr class="${r.isMealTotal ? 'meal-total' : ''}">
      <td>${r.reportDate}</td>
      <td class="l">${r.coupleId}</td>
      <td class="l">${r.partner}<br><span class="muted">${r.gender}</span></td>
      <td class="l">${r.mealLabel}</td>
      <td class="l">${r.foodName}</td>
      <td>${r.quantity}</td>
      <td>${r.servingSize}</td>
      <td>${r.grams}g</td>
      <td>${r.calories}</td>
      <td>${r.protein}g</td>
      <td>${r.carbs}g</td>
      <td>${r.fat}g</td>
    </tr>`).join('');
  } else if (data.reportType === 'exercise') {
    tableHead = `<tr>
      <th>Date</th><th>Couple</th><th>Partner</th><th>Exercise</th>
      <th>Duration</th><th>Intensity</th><th>Calories</th><th>Steps</th><th>Partner Joined</th>
    </tr>`;
    tableBody = data.exercise.map(r => `<tr>
      <td>${r.reportDate}</td>
      <td class="l">${r.coupleId}</td>
      <td class="l">${r.partner}<br><span class="muted">${r.gender}</span></td>
      <td class="l">${r.exerciseName}</td>
      <td>${r.duration}m</td>
      <td>${r.intensity}</td>
      <td>${r.caloriesBurned}</td>
      <td>${r.steps}</td>
      <td>${r.partnerParticipated}</td>
    </tr>`).join('');
  } else {
    tableHead = `<tr>
      <th>Date</th><th>Couple</th><th>Partner</th><th>Total Steps</th><th>Source</th><th>Status</th>
    </tr>`;
    tableBody = data.step.map(r => `<tr>
      <td>${r.reportDate}</td>
      <td class="l">${r.coupleId}</td>
      <td class="l">${r.partner}<br><span class="muted">${r.gender}</span></td>
      <td>${Number(r.stepCount).toLocaleString()}</td>
      <td>${r.source}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>`).join('');
  }

  const rowCount =
    data.reportType === 'overall' ? data.overall.length
    : data.reportType === 'diet' ? data.diet.length
    : data.reportType === 'exercise' ? data.exercise.length
    : data.step.length;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fit for Baby - ${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 28px; color: #1e293b; background: #fff; }
    .header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #006dab; padding-bottom: 18px; margin-bottom: 22px; }
    .logo { width: 54px; height: 54px; background: linear-gradient(135deg,#006dab,#0088d4); border-radius: 12px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; font-size:20px; }
    h1 { font-size: 22px; color: #006dab; }
    .sub { font-size: 13px; color: #64748b; margin-top: 2px; }
    .meta { background:#f1f5f9; padding:10px 16px; border-radius:8px; margin-bottom:18px; font-size:13px; color:#334155; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: linear-gradient(135deg,#006dab,#0088d4); }
    th { color: #fff; padding: 10px 8px; text-align: center; font-size: 10px; text-transform: uppercase; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; }
    td.l { text-align: left; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tr.meal-total { background: #eff6ff !important; font-weight: 600; }
    .muted { color: #94a3b8; font-size: 9px; text-transform: capitalize; }
    .badge { display:inline-block; padding:2px 7px; border-radius:10px; font-size:9px; font-weight:600; text-transform:uppercase; }
    .b-complete { background:#dcfce7; color:#15803d; }
    .b-partial { background:#fef3c7; color:#b45309; }
    .b-missed { background:#fee2e2; color:#b91c1c; }
    .b-pending { background:#f1f5f9; color:#64748b; }
    .footer { margin-top: 28px; padding-top: 16px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }
    .print-btn { display:inline-block; background:linear-gradient(135deg,#006dab,#0088d4); color:#fff; padding:12px 24px; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600; margin-bottom:18px; }
    @media print { .no-print { display:none !important; } body { padding: 12px; } }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <div class="header">
    <div class="logo">FFB</div>
    <div>
      <h1>${title}</h1>
      <div class="sub">Fit for Baby - Health Monitoring System</div>
    </div>
  </div>
  <div class="meta">
    <b>Period:</b> ${start} to ${end} &nbsp;|&nbsp;
    <b>Records:</b> ${rowCount} &nbsp;|&nbsp;
    <b>Generated:</b> ${new Date().toLocaleString()}
  </div>
  <table>
    <thead>${tableHead}</thead>
    <tbody>${tableBody || '<tr><td colspan="12">No data found for this selection.</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <p>Fit for Baby - ${title}</p>
    <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
</body>
</html>`;
}

/** Total row count for a given report data (used for empty checks). */
export function getRowCount(data: ReportData): number {
  switch (data.reportType) {
    case 'overall': return data.overall.length;
    case 'diet': return data.diet.length;
    case 'exercise': return data.exercise.length;
    case 'step': return data.step.length;
    default: return 0;
  }
}
