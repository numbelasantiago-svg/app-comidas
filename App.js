import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const T = {
  ink: '#12141C', slate: '#1B1F2B', line: '#2A2F3D', paper: '#E8E9ED', mist: '#8891A5',
  amber: '#F0A83D', mint: '#4ADE9C', coral: '#FF6B5E',
};

const STORAGE_KEY = 'comidas-app-data';

const ACTIVITY_FACTORS = { sedentario: 1.2, ligero: 1.375, moderado: 1.55, activo: 1.725, muy_activo: 1.9 };
const GOAL_FACTORS = { bajar: 0.8, mantener: 1.0, subir: 1.12 };
function calculateMacrosFromProfile(profile) {
  const w = Number(profile.weight) || 0, h = Number(profile.height) || 0, a = Number(profile.age) || 0;
  if (w <= 0 || h <= 0 || a <= 0) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + (profile.sex === 'Mujer' ? -161 : 5);
  const tdee = bmr * (ACTIVITY_FACTORS[profile.activityLevel] || 1.55);
  const calories = Math.round(tdee * (GOAL_FACTORS[profile.goal] || 1.0));
  const protein = Math.round(w * 2.0);
  const fat = Math.round((calories * 0.28) / 9);
  const carbs = Math.max(Math.round((calories - protein * 4 - fat * 9) / 4), 0);
  return { calories, protein, carbs, fat };
}

/* ---- Base de datos de alimentos ---- */
const FOOD_DB = {
  pollo: { name: 'Pechuga de pollo (cocida)', kcal: 165, protein: 31, carbs: 0, fat: 3.6, per: 100, cost: 0.0065, purchase: g => ({ qty: (g / 0.75).toFixed(0), unit: 'g crudos' }) },
  pavo: { name: 'Pechuga de pavo (cocida)', kcal: 135, protein: 29, carbs: 0, fat: 1, per: 100, cost: 0.009, purchase: g => ({ qty: (g / 0.75).toFixed(0), unit: 'g crudos' }) },
  salmon: { name: 'Salmón (cocido)', kcal: 208, protein: 20, carbs: 0, fat: 13, per: 100, cost: 0.016, purchase: g => ({ qty: (g / 0.80).toFixed(0), unit: 'g crudos' }) },
  atun: { name: 'Atún en agua (lata)', kcal: 116, protein: 26, carbs: 0, fat: 1, per: 100, cost: 1.10, purchase: g => ({ qty: Math.ceil(g / 80), unit: 'latas (80g)' }) },
  lentejas: { name: 'Lentejas cocidas', kcal: 116, protein: 9, carbs: 20, fat: 0.4, per: 100, cost: 0.0018, purchase: g => ({ qty: (g / 2.5).toFixed(0), unit: 'g secas' }) },
  huevo: { name: 'Huevo', kcal: 70, protein: 6, carbs: 0.6, fat: 5, per: 1, cost: 0.22, purchase: u => ({ qty: Math.ceil(u), unit: 'unidades' }) },
  yogur: { name: 'Yogur griego 0%', kcal: 59, protein: 10, carbs: 3.6, fat: 0.4, per: 100, cost: 0.0038, purchase: g => ({ qty: g.toFixed(0), unit: 'g' }) },
  cottage: { name: 'Queso cottage', kcal: 98, protein: 11, carbs: 3.4, fat: 4.3, per: 100, cost: 0.0045, purchase: g => ({ qty: g.toFixed(0), unit: 'g' }) },
  whey: { name: 'Proteína en polvo', kcal: 400, protein: 80, carbs: 8, fat: 6, per: 100, cost: 0.028, purchase: g => ({ qty: g.toFixed(0), unit: 'g' }) },
  arroz: { name: 'Arroz integral cocido', kcal: 130, protein: 2.7, carbs: 28, fat: 1, per: 100, cost: 0.0016, purchase: g => ({ qty: (g / 2.75).toFixed(0), unit: 'g crudos' }) },
  quinoa: { name: 'Quinoa cocida', kcal: 120, protein: 4.4, carbs: 21, fat: 1.9, per: 100, cost: 0.0065, purchase: g => ({ qty: (g / 2.8).toFixed(0), unit: 'g crudas' }) },
  patata: { name: 'Patata cocida', kcal: 90, protein: 2, carbs: 20, fat: 0.1, per: 100, cost: 0.0011, purchase: g => ({ qty: (g * 1.05).toFixed(0), unit: 'g' }) },
  batata: { name: 'Batata asada', kcal: 90, protein: 2, carbs: 21, fat: 0.1, per: 100, cost: 0.0021, purchase: g => ({ qty: (g * 1.05).toFixed(0), unit: 'g' }) },
  avena: { name: 'Avena', kcal: 380, protein: 13, carbs: 67, fat: 7, per: 100, cost: 0.0017, purchase: g => ({ qty: g.toFixed(0), unit: 'g (dura semanas)' }) },
  brocoli: { name: 'Brócoli', kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, per: 100, cost: 0.0021, purchase: g => ({ qty: g.toFixed(0), unit: 'g' }) },
  verduras: { name: 'Verduras mix', kcal: 35, protein: 2, carbs: 7, fat: 0.3, per: 100, cost: 0.0024, purchase: g => ({ qty: g.toFixed(0), unit: 'g' }) },
  ensalada: { name: 'Ensalada verde', kcal: 20, protein: 1, carbs: 4, fat: 0.2, per: 100, cost: 0.0024, purchase: g => ({ qty: g.toFixed(0), unit: 'g' }) },
  platano: { name: 'Plátano', kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, per: 100, cost: 0.17, purchase: g => ({ qty: (g / 120).toFixed(1), unit: 'unidades' }) },
  manzana: { name: 'Manzana', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, per: 100, cost: 0.28, purchase: g => ({ qty: (g / 150).toFixed(1), unit: 'unidades' }) },
  aceite: { name: 'Aceite de oliva', kcal: 884, protein: 0, carbs: 0, fat: 100, per: 100, cost: 0.0053, purchase: g => ({ qty: g.toFixed(0), unit: 'g (dura semanas)' }) },
  almendras: { name: 'Almendras', kcal: 579, protein: 21, carbs: 22, fat: 50, per: 100, cost: 0.010, purchase: g => ({ qty: g.toFixed(0), unit: 'g (dura semanas)' }) },
  mani: { name: 'Mantequilla de maní', kcal: 588, protein: 25, carbs: 20, fat: 50, per: 100, cost: 0.007, purchase: g => ({ qty: g.toFixed(0), unit: 'g (dura semanas)' }) },
};

const PROTEIN_TIERS = [
  ['salmon', 'salmon', 'pavo', 'salmon', 'pavo', 'salmon', 'pavo'],
  ['pavo', 'salmon', 'pavo', 'pollo', 'pavo', 'salmon', 'pollo'],
  ['pollo', 'atun', 'pollo', 'pavo', 'pollo', 'atun', 'pollo'],
  ['lentejas', 'lentejas', 'pollo', 'lentejas', 'lentejas', 'pollo', 'lentejas'],
];
const CARB_TIERS = [
  ['quinoa', 'batata', 'quinoa', 'batata', 'quinoa', 'batata', 'quinoa'],
  ['quinoa', 'arroz', 'batata', 'arroz', 'quinoa', 'arroz', 'batata'],
  ['arroz', 'patata', 'arroz', 'quinoa', 'arroz', 'patata', 'arroz'],
  ['arroz', 'patata', 'arroz', 'patata', 'arroz', 'patata', 'arroz'],
];
const VEG_ROTATION = ['brocoli', 'verduras'];

/* 2-3 variantes por franja de precio para desayuno/snack — rotan durante la semana */
const BREAKFAST_TEMPLATES = [
  [
    [{ food: 'yogur', qty: 250 }, { food: 'avena', qty: 40 }, { food: 'platano', qty: 100 }, { food: 'almendras', qty: 20 }],
    [{ food: 'huevo', qty: 3 }, { food: 'avena', qty: 35 }, { food: 'platano', qty: 100 }, { food: 'mani', qty: 15 }],
    [{ food: 'cottage', qty: 200 }, { food: 'avena', qty: 40 }, { food: 'manzana', qty: 100 }, { food: 'almendras', qty: 15 }],
  ],
  [
    [{ food: 'huevo', qty: 3 }, { food: 'avena', qty: 40 }, { food: 'platano', qty: 100 }, { food: 'mani', qty: 15 }],
    [{ food: 'yogur', qty: 200 }, { food: 'avena', qty: 40 }, { food: 'platano', qty: 100 }, { food: 'almendras', qty: 15 }],
    [{ food: 'huevo', qty: 2 }, { food: 'avena', qty: 45 }, { food: 'manzana', qty: 120 }, { food: 'mani', qty: 10 }],
  ],
  [
    [{ food: 'huevo', qty: 3 }, { food: 'avena', qty: 45 }, { food: 'platano', qty: 100 }],
    [{ food: 'yogur', qty: 200 }, { food: 'avena', qty: 45 }, { food: 'platano', qty: 100 }],
    [{ food: 'huevo', qty: 2 }, { food: 'avena', qty: 50 }, { food: 'manzana', qty: 120 }],
  ],
  [
    [{ food: 'huevo', qty: 2 }, { food: 'avena', qty: 50 }, { food: 'platano', qty: 100 }],
    [{ food: 'huevo', qty: 3 }, { food: 'avena', qty: 45 }, { food: 'platano', qty: 80 }],
    [{ food: 'avena', qty: 60 }, { food: 'platano', qty: 120 }, { food: 'mani', qty: 10 }],
  ],
];
const SNACK_TEMPLATES = [
  [
    [{ food: 'whey', qty: 30 }, { food: 'manzana', qty: 120 }, { food: 'almendras', qty: 15 }],
    [{ food: 'yogur', qty: 200 }, { food: 'platano', qty: 100 }, { food: 'almendras', qty: 10 }],
    [{ food: 'cottage', qty: 150 }, { food: 'manzana', qty: 120 }, { food: 'mani', qty: 10 }],
  ],
  [
    [{ food: 'cottage', qty: 150 }, { food: 'manzana', qty: 120 }],
    [{ food: 'yogur', qty: 200 }, { food: 'platano', qty: 100 }],
    [{ food: 'huevo', qty: 2 }, { food: 'manzana', qty: 100 }],
  ],
  [
    [{ food: 'yogur', qty: 200 }, { food: 'manzana', qty: 120 }],
    [{ food: 'huevo', qty: 2 }, { food: 'platano', qty: 100 }],
    [{ food: 'cottage', qty: 150 }, { food: 'manzana', qty: 100 }],
  ],
  [
    [{ food: 'huevo', qty: 2 }, { food: 'manzana', qty: 120 }],
    [{ food: 'platano', qty: 150 }, { food: 'mani', qty: 10 }],
    [{ food: 'manzana', qty: 150 }, { food: 'mani', qty: 8 }],
  ],
];

function pickTemplate(templates, dayIdx, excluded) {
  const valid = templates.filter(tpl => !tpl.some(it => excluded.has(it.food)));
  const pool = valid.length > 0 ? valid : templates;
  return pool[dayIdx % pool.length];
}
const PROTEIN_FALLBACK_ORDER = ['salmon', 'pavo', 'pollo', 'atun', 'lentejas'];
const CARB_FALLBACK_ORDER = ['quinoa', 'arroz', 'batata', 'patata'];
function pickProtein(preferredKey, excluded) {
  if (!excluded.has(preferredKey)) return preferredKey;
  return PROTEIN_FALLBACK_ORDER.find(k => !excluded.has(k)) || preferredKey;
}
function pickCarb(preferredKey, excluded) {
  if (!excluded.has(preferredKey)) return preferredKey;
  return CARB_FALLBACK_ORDER.find(k => !excluded.has(k)) || preferredKey;
}

function scaleFood(key, qty) { const d = FOOD_DB[key]; const f = qty / d.per; return { kcal: d.kcal * f, protein: d.protein * f, carbs: d.carbs * f, fat: d.fat * f }; }
function sumTotals(list) { return list.reduce((a, c) => ({ kcal: a.kcal + c.kcal, protein: a.protein + c.protein, carbs: a.carbs + c.carbs, fat: a.fat + c.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }); }

function computeProteinItems(proteinKey, targetProteinG, mealName, excluded) {
  if (proteinKey === 'lentejas') {
    const secondaryOptions = ['pollo', 'pavo', 'atun'].filter(k => !excluded.has(k));
    if (secondaryOptions.length === 0) {
      const lentejasG = (targetProteinG / FOOD_DB.lentejas.protein) * 100;
      return [{ food: 'lentejas', qty: lentejasG, meal: mealName }];
    }
    const secondary = secondaryOptions[0];
    const lentejasTargetP = targetProteinG * 0.5;
    const lentejasG = (Math.max(lentejasTargetP, 15) / FOOD_DB.lentejas.protein) * 100;
    const lentejasC = scaleFood('lentejas', lentejasG);
    const remainingP = Math.max(targetProteinG - lentejasC.protein, 10);
    const secG = (remainingP / FOOD_DB[secondary].protein) * 100;
    return [{ food: 'lentejas', qty: lentejasG, meal: mealName }, { food: secondary, qty: secG, meal: mealName }];
  }
  if (proteinKey === 'salmon') {
    const secondaryOptions = ['atun', 'pollo', 'pavo'].filter(k => !excluded.has(k));
    if (secondaryOptions.length === 0) {
      const salmonG = (targetProteinG / FOOD_DB.salmon.protein) * 100;
      return [{ food: 'salmon', qty: salmonG, meal: mealName }];
    }
    const secondary = secondaryOptions[0];
    const salmonG = ((targetProteinG * 0.5) / FOOD_DB.salmon.protein) * 100;
    const salmonC = scaleFood('salmon', salmonG);
    const remainingP = Math.max(targetProteinG - salmonC.protein, 10);
    const secG = (remainingP / FOOD_DB[secondary].protein) * 100;
    return [{ food: 'salmon', qty: salmonG, meal: mealName }, { food: secondary, qty: secG, meal: mealName }];
  }
  const food = FOOD_DB[proteinKey];
  const grams = (targetProteinG / food.protein) * 100;
  return [{ food: proteinKey, qty: grams, meal: mealName }];
}

function buildDay(targets, breakfastTpl, snackTpl, proteinKey, carbKey, vegKey, excluded) {
  const breakfastItems = breakfastTpl.map(it => ({ ...it, meal: 'breakfast' }));
  const snackItems = snackTpl.map(it => ({ ...it, meal: 'snack' }));
  const bTotals = sumTotals(breakfastItems.map(it => scaleFood(it.food, it.qty)));
  const sTotals = sumTotals(snackItems.map(it => scaleFood(it.food, it.qty)));

  const remP = Math.max(targets.protein - bTotals.protein - sTotals.protein, 40);
  const lunchP = remP * 0.55, dinnerP = remP * 0.45;
  const lunchProteinItems = computeProteinItems(proteinKey, lunchP, 'lunch', excluded);
  const dinnerProteinItems = computeProteinItems(proteinKey, dinnerP, 'dinner', excluded);
  const proteinTotals = sumTotals([...lunchProteinItems, ...dinnerProteinItems].map(it => scaleFood(it.food, it.qty)));

  const vegItems = [{ food: vegKey, qty: 120, meal: 'lunch' }, { food: 'ensalada', qty: 100, meal: 'dinner' }];
  const baseOilItems = [{ food: 'aceite', qty: 5, meal: 'lunch' }, { food: 'aceite', qty: 5, meal: 'dinner' }];
  const vegOilTotals = sumTotals([...vegItems, ...baseOilItems].map(it => scaleFood(it.food, it.qty)));

  const kcalBeforeCarbs = bTotals.kcal + sTotals.kcal + proteinTotals.kcal + vegOilTotals.kcal;
  const kcalRoomForCarbs = Math.max(targets.calories - kcalBeforeCarbs, 100);
  const carbFood = FOOD_DB[carbKey];
  const remCarbTarget = Math.max(targets.carbs - bTotals.carbs - sTotals.carbs, 40);
  const carbGramsFromTarget = (remCarbTarget / carbFood.carbs) * 100;
  const carbGramsFromKcalRoom = (kcalRoomForCarbs / carbFood.kcal) * 100;
  const totalCarbGrams = Math.min(carbGramsFromTarget, carbGramsFromKcalRoom);
  const lunchCarbG = totalCarbGrams * 0.55, dinnerCarbG = totalCarbGrams * 0.45;
  const carbTotals = sumTotals([{ food: carbKey, qty: lunchCarbG }, { food: carbKey, qty: dinnerCarbG }].map(it => scaleFood(it.food, it.qty)));

  const kcalSoFar = kcalBeforeCarbs + carbTotals.kcal;
  const fatSoFar = bTotals.fat + sTotals.fat + proteinTotals.fat + vegOilTotals.fat + carbTotals.fat;
  const kcalRoomForFat = Math.max(targets.calories - kcalSoFar, 0);
  const fatGapG = Math.max(targets.fat - fatSoFar, 0);
  const extraOilG = Math.min(fatGapG, kcalRoomForFat / 9, 35);

  const lunchItems = [...lunchProteinItems, { food: carbKey, qty: lunchCarbG, meal: 'lunch' }, { food: vegKey, qty: 120, meal: 'lunch' }, { food: 'aceite', qty: 5, meal: 'lunch' }];
  const dinnerItems = [...dinnerProteinItems, { food: carbKey, qty: dinnerCarbG, meal: 'dinner' }, { food: 'ensalada', qty: 100, meal: 'dinner' }, { food: 'aceite', qty: 5 + extraOilG, meal: 'dinner' }];

  const finalTotals = sumTotals([...breakfastItems, ...snackItems, ...lunchItems, ...dinnerItems].map(it => scaleFood(it.food, it.qty)));
  return { breakfast: breakfastItems, snack: snackItems, lunch: lunchItems, dinner: dinnerItems, totals: finalTotals };
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function computeWeeklyCost(plan) {
  const totals = {};
  plan.days.forEach(day => {
    ['breakfast', 'snack', 'lunch', 'dinner'].forEach(mealKey => {
      day[mealKey].forEach(it => { totals[it.food] = (totals[it.food] || 0) + it.qty; });
    });
  });
  let cost = 0;
  Object.entries(totals).forEach(([key, qty]) => {
    const d = FOOD_DB[key];
    cost += parseFloat(d.purchase(qty).qty) * d.cost;
  });
  return cost;
}

function generateWeekPlan(tierIndex, targets, excludedSet) {
  const days = DAYS.map((dayName, dayIdx) => {
    const preferredProtein = PROTEIN_TIERS[tierIndex][dayIdx % PROTEIN_TIERS[tierIndex].length];
    const proteinKey = pickProtein(preferredProtein, excludedSet);
    const preferredCarb = CARB_TIERS[tierIndex][dayIdx % CARB_TIERS[tierIndex].length];
    const carbKey = pickCarb(preferredCarb, excludedSet);
    const vegKey = VEG_ROTATION[dayIdx % VEG_ROTATION.length];
    const breakfastTpl = pickTemplate(BREAKFAST_TEMPLATES[tierIndex], dayIdx, excludedSet);
    const snackTpl = pickTemplate(SNACK_TEMPLATES[tierIndex], dayIdx, excludedSet);
    const day = buildDay(targets, breakfastTpl, snackTpl, proteinKey, carbKey, vegKey, excludedSet);
    return { dayName, ...day };
  });
  const plan = { id: tierIndex, days };
  plan.weeklyCost = computeWeeklyCost(plan);
  return plan;
}

function mealText(items) {
  return items.map(it => `${FOOD_DB[it.food].name} ${Math.round(it.qty)}${FOOD_DB[it.food].per === 1 ? 'u' : 'g'}`).join(' + ');
}

const PACKAGE_INFO = {
  pollo: { size: 450, label: 'paquete de 450g' }, pavo: { size: 400, label: 'paquete de 400g' },
  salmon: { size: 130, label: 'filete (~130g)' }, lentejas: { size: 500, label: 'bolsa de 500g' },
  huevo: { size: 12, label: 'docena' }, yogur: { size: 500, label: 'tarrina de 500g' },
  cottage: { size: 250, label: 'tarrina de 250g' }, whey: { size: 1000, label: 'bote de 1kg' },
  arroz: { size: 1000, label: 'paquete de 1kg' }, quinoa: { size: 500, label: 'paquete de 500g' },
  patata: { size: 2000, label: 'malla de 2kg' }, batata: { size: 1000, label: 'malla de 1kg' },
  avena: { size: 500, label: 'paquete de 500g' }, brocoli: { size: 350, label: 'unidad (~350g)' },
  verduras: { size: 400, label: 'bolsa congelada 400g' }, ensalada: { size: 200, label: 'bolsa de 200g' },
  aceite: { size: 750, label: 'botella de 750ml' }, almendras: { size: 200, label: 'bolsa de 200g' },
  mani: { size: 350, label: 'frasco de 350g' },
};
const WHOLE_UNIT_FOODS = ['platano', 'manzana'];
const FOOD_CATEGORY = {
  pollo: 'Proteínas', pavo: 'Proteínas', salmon: 'Proteínas', atun: 'Proteínas', lentejas: 'Proteínas',
  huevo: 'Lácteos y huevos', yogur: 'Lácteos y huevos', cottage: 'Lácteos y huevos', whey: 'Lácteos y huevos',
  arroz: 'Carbohidratos', quinoa: 'Carbohidratos', patata: 'Carbohidratos', batata: 'Carbohidratos', avena: 'Carbohidratos',
  brocoli: 'Frutas y verduras', verduras: 'Frutas y verduras', ensalada: 'Frutas y verduras', platano: 'Frutas y verduras', manzana: 'Frutas y verduras',
  aceite: 'Despensa', almendras: 'Despensa', mani: 'Despensa',
};
const CATEGORY_ORDER = ['Proteínas', 'Lácteos y huevos', 'Carbohidratos', 'Frutas y verduras', 'Despensa'];

function aggregateShoppingList(plan, household) {
  const totals = {};
  plan.days.forEach(day => {
    ['breakfast', 'snack', 'lunch', 'dinner'].forEach(mealKey => {
      day[mealKey].forEach(it => { totals[it.food] = (totals[it.food] || 0) + it.qty; });
    });
  });
  return Object.entries(totals).map(([key, qty]) => {
    const scaledQty = qty * household;
    const d = FOOD_DB[key];
    const p = d.purchase(scaledQty);
    const pkg = PACKAGE_INFO[key];
    let practical = `${p.qty} ${p.unit}`;
    if (WHOLE_UNIT_FOODS.includes(key)) {
      practical = `${Math.max(1, Math.ceil(parseFloat(p.qty)))} unidades`;
    } else if (pkg) {
      const numPkgs = Math.max(1, Math.ceil(parseFloat(p.qty) / pkg.size));
      practical = `${numPkgs} × ${pkg.label}`;
    }
    return { key, name: d.name, preciseQty: p.qty, preciseUnit: p.unit, practical, category: FOOD_CATEGORY[key] || 'Otros' };
  });
}

/* ---- UI ---- */
function SelectorRow({ options, value, onChange }) {
  return (
    <View style={styles.selectorRow}>
      {options.map(opt => {
        const key = typeof opt === 'string' || typeof opt === 'number' ? opt : opt.key;
        const label = typeof opt === 'string' || typeof opt === 'number' ? opt : opt.label;
        return (
          <TouchableOpacity key={key} onPress={() => onChange(key)} style={[styles.selBtn, value === key && styles.selBtnActive]}>
            <Text style={[styles.selBtnText, value === key && styles.selBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ExcludeChip({ label, active, onToggle }) {
  return (
    <TouchableOpacity onPress={onToggle} style={[styles.selBtn, active && styles.excludeBtnActive]}>
      <Text style={[styles.selBtnText, active && styles.excludeBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const SEXOS = ['Hombre', 'Mujer'];
const NIVELES = [{ key: 'sedentario', label: 'Sedentario' }, { key: 'ligero', label: 'Ligero' }, { key: 'moderado', label: 'Moderado' }, { key: 'activo', label: 'Activo' }, { key: 'muy_activo', label: 'Muy activo' }];
const OBJETIVOS = [{ key: 'bajar', label: 'Bajar grasa' }, { key: 'mantener', label: 'Mantener' }, { key: 'subir', label: 'Ganar músculo' }];
const TIER_LABELS = ['Premium', 'Alto', 'Moderado', 'Económico'];
const HOUSEHOLD_OPTIONS = [{ key: 1, label: '1' }, { key: 2, label: '2' }, { key: 3, label: '3' }, { key: 4, label: '4+' }];

function PlanDetail({ plan, household, bought, toggleBought }) {
  const shopping = aggregateShoppingList(plan, household);
  const boughtCount = shopping.filter(item => bought[item.key]).length;
  const totalCost = plan.weeklyCost * household;

  return (
    <View>
      <View style={[styles.panel, styles.panelSpacing]}>
        <Text style={styles.panelTitle}>MENÚ SEMANAL</Text>
        {plan.days.map((d, i) => (
          <View key={i} style={styles.dayCard}>
            <Text style={styles.dayCardTitle}>{d.dayName}</Text>
            <Text style={styles.mealLabel}>Desayuno</Text>
            <Text style={styles.mealTextRow}>{mealText(d.breakfast)}</Text>
            <Text style={styles.mealLabel}>Almuerzo</Text>
            <Text style={styles.mealTextRow}>{mealText(d.lunch)}</Text>
            <Text style={styles.mealLabel}>Cena</Text>
            <Text style={styles.mealTextRow}>{mealText(d.dinner)}</Text>
            <Text style={styles.mealLabel}>Snack</Text>
            <Text style={styles.mealTextRow}>{mealText(d.snack)}</Text>
            <View style={styles.dayCardStats}>
              <Text style={styles.dayStat}>{d.totals.kcal.toFixed(0)} kcal</Text>
              <Text style={styles.dayStat}>{d.totals.protein.toFixed(0)}g prot</Text>
              <Text style={styles.dayStat}>{d.totals.carbs.toFixed(0)}g carb</Text>
              <Text style={styles.dayStat}>{d.totals.fat.toFixed(0)}g grasa</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>LISTA DE COMPRAS ({household} {household === 1 ? 'PERSONA' : 'PERSONAS'}, 7 DÍAS)</Text>
        <View style={styles.shoppingTotalRow}>
          <View>
            <Text style={styles.shoppingTotalLabel}>Costo total</Text>
            <Text style={styles.shoppingTotalValue}>€{totalCost.toFixed(2)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.shoppingTotalLabel}>Por día</Text>
            <Text style={styles.shoppingTotalValueSmall}>€{(totalCost / 7).toFixed(2)}</Text>
          </View>
        </View>
        <Text style={styles.shoppingNote}>Precios de supermercados en España (Mercadona/Dia/Lidl) — pueden variar por tienda.</Text>
        <Text style={styles.shoppingProgress}>{boughtCount} de {shopping.length} comprados</Text>
        {CATEGORY_ORDER.map(cat => {
          const items = shopping.filter(s => s.category === cat);
          if (items.length === 0) return null;
          return (
            <View key={cat}>
              <Text style={styles.shoppingCategoryLabel}>{cat}</Text>
              {items.map(item => {
                const isBought = !!bought[item.key];
                return (
                  <TouchableOpacity key={item.key} style={styles.shoppingRow} onPress={() => toggleBought(item.key)}>
                    <View style={[styles.shopCheckbox, isBought && styles.shopCheckboxDone]}>
                      {isBought && <Text style={styles.checkmarkSmall}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.shoppingName, isBought && styles.shoppingDone]}>{item.name}</Text>
                      <Text style={styles.shoppingPrecise}>Necesitas: {item.preciseQty} {item.preciseUnit}</Text>
                    </View>
                    <Text style={[styles.shoppingQty, isBought && styles.shoppingDone]}>{item.practical}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ComidasScreen() {
  const [profile, setProfile] = useState({ weight: '', height: '', age: '', sex: 'Hombre', activityLevel: 'moderado', goal: 'mantener' });
  const [targets, setTargets] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const [msg, setMsg] = useState('');
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [household, setHousehold] = useState(1);
  const [excluded, setExcluded] = useState([]);
  const [showPreferencias, setShowPreferencias] = useState(false);
  const [bought, setBought] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.profile) setProfile(saved.profile);
          if (saved.targets) setTargets(saved.targets);
          if (Array.isArray(saved.plans)) setPlans(saved.plans);
          if (typeof saved.selectedPlan === 'number') setSelectedPlan(saved.selectedPlan);
          if (Array.isArray(saved.excluded)) setExcluded(saved.excluded);
          if (typeof saved.household === 'number') setHousehold(saved.household);
          if (saved.bought) setBought(saved.bought);
        }
      } catch (e) {
        console.log('No se pudo cargar lo guardado:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, targets, plans, selectedPlan, excluded, household, bought })).catch(() => {});
  }, [loaded, profile, targets, plans, selectedPlan, excluded, household, bought]);

  const updateProfile = (field, value) => setProfile(prev => ({ ...prev, [field]: value }));
  const toggleExcluded = (key) => setExcluded(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  const toggleBought = (key) => setBought(prev => ({ ...prev, [key]: !prev[key] }));

  const handleCalcular = () => {
    const result = calculateMacrosFromProfile(profile);
    if (!result) { setMsg('Completa peso, altura y edad para calcular.'); return; }
    setTargets({ calories: String(result.calories), protein: String(result.protein), carbs: String(result.carbs), fat: String(result.fat) });
    setMsg(`Calculado: ${result.calories} kcal · ${result.protein}g proteína. Puedes ajustar los valores abajo.`);
  };

  const generarPlanes = () => {
    setGenerating(true);
    const t = {
      calories: Number(targets.calories) || 1800,
      protein: Number(targets.protein) || 150,
      carbs: Number(targets.carbs) || 175,
      fat: Number(targets.fat) || 55,
    };
    const excludedSet = new Set(excluded);
    const raw = [0, 1, 2, 3].map(i => generateWeekPlan(i, t, excludedSet));
    raw.sort((a, b) => b.weeklyCost - a.weeklyCost);
    setPlans(raw.map((p, i) => ({ ...p, tierLabel: TIER_LABELS[i] })));
    setSelectedPlan(0);
    setBought({});
    setGenerating(false);
  };

  const avgFor = (plan, key) => plan.days.reduce((s, d) => s + d.totals[key], 0) / 7;

  return (
    <View>
      <View style={[styles.panel, styles.panelSpacing]}>
        <Text style={styles.panelTitle}>CALCULA TUS MACROS</Text>
        <View style={styles.rowInputs}>
          <TextInput style={[styles.input, styles.flexInput]} placeholder="Peso (kg)" placeholderTextColor={T.mist} keyboardType="numeric" value={profile.weight} onChangeText={v => updateProfile('weight', v)} />
          <TextInput style={[styles.input, styles.flexInput]} placeholder="Altura (cm)" placeholderTextColor={T.mist} keyboardType="numeric" value={profile.height} onChangeText={v => updateProfile('height', v)} />
          <TextInput style={[styles.input, styles.flexInput]} placeholder="Edad" placeholderTextColor={T.mist} keyboardType="numeric" value={profile.age} onChangeText={v => updateProfile('age', v)} />
        </View>
        <Text style={styles.fieldLabel}>Sexo</Text>
        <SelectorRow options={SEXOS} value={profile.sex} onChange={v => updateProfile('sex', v)} />
        <Text style={styles.fieldLabel}>Nivel de actividad</Text>
        <SelectorRow options={NIVELES} value={profile.activityLevel} onChange={v => updateProfile('activityLevel', v)} />
        <Text style={styles.fieldLabel}>Objetivo</Text>
        <SelectorRow options={OBJETIVOS} value={profile.goal} onChange={v => updateProfile('goal', v)} />
        <TouchableOpacity style={[styles.addBtnFull, { marginTop: 10 }]} onPress={handleCalcular}><Text style={styles.addBtnText}>Calcular</Text></TouchableOpacity>
        {msg ? <Text style={styles.calcMsg}>{msg}</Text> : null}
      </View>

      <View style={[styles.panel, styles.panelSpacing]}>
        <Text style={styles.panelTitle}>OBJETIVO DIARIO</Text>
        <View style={styles.rowInputs}>
          <TextInput style={[styles.input, styles.flexInput]} placeholder="Kcal" placeholderTextColor={T.mist} keyboardType="numeric" value={targets.calories} onChangeText={v => setTargets(prev => ({ ...prev, calories: v }))} />
          <TextInput style={[styles.input, styles.flexInput]} placeholder="Prot(g)" placeholderTextColor={T.mist} keyboardType="numeric" value={targets.protein} onChangeText={v => setTargets(prev => ({ ...prev, protein: v }))} />
          <TextInput style={[styles.input, styles.flexInput]} placeholder="Carb(g)" placeholderTextColor={T.mist} keyboardType="numeric" value={targets.carbs} onChangeText={v => setTargets(prev => ({ ...prev, carbs: v }))} />
          <TextInput style={[styles.input, styles.flexInput]} placeholder="Grasa(g)" placeholderTextColor={T.mist} keyboardType="numeric" value={targets.fat} onChangeText={v => setTargets(prev => ({ ...prev, fat: v }))} />
        </View>
      </View>

      <TouchableOpacity style={[styles.prefToggle, styles.panelSpacing]} onPress={() => setShowPreferencias(s => !s)}>
        <Text style={styles.prefToggleText}>
          {showPreferencias ? 'Ocultar preferencias' : `Preferencias${excluded.length > 0 || household > 1 ? ' · ' + (household > 1 ? household + ' personas' : '') + (excluded.length > 0 ? (household > 1 ? ', ' : '') + excluded.length + ' excluidos' : '') : ''}`}
        </Text>
      </TouchableOpacity>

      {showPreferencias && (
        <View style={[styles.panel, styles.panelSpacing]}>
          <Text style={styles.panelTitle}>¿PARA CUÁNTAS PERSONAS COCINAS?</Text>
          <SelectorRow options={HOUSEHOLD_OPTIONS} value={household} onChange={setHousehold} />

          <Text style={[styles.panelTitle, { marginTop: 6 }]}>ALIMENTOS A EXCLUIR</Text>
          {CATEGORY_ORDER.map(cat => (
            <View key={cat}>
              <Text style={styles.fieldLabel}>{cat}</Text>
              <View style={styles.selectorRow}>
                {Object.entries(FOOD_DB).filter(([k]) => FOOD_CATEGORY[k] === cat).map(([k, d]) => (
                  <ExcludeChip key={k} label={d.name} active={excluded.includes(k)} onToggle={() => toggleExcluded(k)} />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={[styles.addBtnFull, styles.panelSpacing]} onPress={generarPlanes}>
        <Text style={styles.addBtnText}>{generating ? 'Generando...' : 'Generar 4 planes de comida'}</Text>
      </TouchableOpacity>

      {plans.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>TUS 4 PLANES</Text>
          {plans.map((p, i) => (
            <TouchableOpacity key={i} onPress={() => setSelectedPlan(i)} style={[styles.planCard, selectedPlan === i && styles.planCardActive]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planCardTitle}>Plan {i + 1} · {p.tierLabel}</Text>
                <Text style={styles.planCardMeta}>{avgFor(p, 'kcal').toFixed(0)} kcal/día · {avgFor(p, 'protein').toFixed(0)}g proteína/día</Text>
              </View>
              <Text style={styles.planCardCost}>€{p.weeklyCost.toFixed(0)}/sem</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {plans.length > 0 && plans[selectedPlan] && (
        <View style={{ marginTop: 16 }}>
          <PlanDetail plan={plans[selectedPlan]} household={household} bought={bought} toggleBought={toggleBought} />
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Plan de Comidas</Text>
        <Text style={styles.subtitle}>Calcula, genera y compra con precisión</Text>
        <View style={styles.screen}>
          <ComidasScreen />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.ink },
  container: { flex: 1, backgroundColor: T.ink, paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 22, fontWeight: '800', color: T.paper, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: T.amber, marginTop: 4, marginBottom: 18 },
  screen: { paddingTop: 4 },
  panel: { backgroundColor: T.slate, borderRadius: 14, borderWidth: 1, borderColor: T.line, padding: 16 },
  panelSpacing: { marginBottom: 16 },
  panelTitle: { fontSize: 12, fontWeight: '700', color: T.mist, letterSpacing: 0.5, marginBottom: 12 },
  input: { backgroundColor: T.ink, borderWidth: 1, borderColor: T.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, color: T.paper, fontSize: 14 },
  rowInputs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  flexInput: { flex: 1 },
  addBtnFull: { backgroundColor: T.amber, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addBtnText: { color: T.ink, fontSize: 14, fontWeight: '700' },
  fieldLabel: { fontSize: 11, color: T.mist, marginBottom: 6 },
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  selBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 7, borderWidth: 1, borderColor: T.line },
  selBtnActive: { backgroundColor: T.amber, borderColor: T.amber },
  selBtnText: { fontSize: 12.5, fontWeight: '600', color: T.mist },
  selBtnTextActive: { color: T.ink },
  excludeBtnActive: { backgroundColor: T.coral, borderColor: T.coral },
  excludeBtnTextActive: { color: T.ink },
  calcMsg: { color: T.mist, fontSize: 12, marginTop: 10 },
  prefToggle: { backgroundColor: T.slate, borderWidth: 1, borderColor: T.line, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  prefToggleText: { color: T.paper, fontSize: 13, fontWeight: '600' },
  planCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.ink, borderRadius: 10, borderWidth: 1, borderColor: T.line, padding: 12, marginBottom: 8 },
  planCardActive: { borderColor: T.amber },
  planCardTitle: { color: T.paper, fontSize: 14, fontWeight: '700' },
  planCardMeta: { color: T.mist, fontSize: 11.5, marginTop: 3 },
  planCardCost: { color: T.amber, fontSize: 15, fontWeight: '800' },
  dayCard: { backgroundColor: T.ink, borderRadius: 10, borderWidth: 1, borderColor: T.line, padding: 12, marginBottom: 10 },
  dayCardTitle: { color: T.paper, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  mealLabel: { color: T.amber, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 6, letterSpacing: 0.3 },
  mealTextRow: { color: T.mist, fontSize: 12, marginTop: 2, lineHeight: 17 },
  dayCardStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.line },
  dayStat: { color: T.paper, fontSize: 11.5, fontWeight: '700' },
  shoppingCategoryLabel: { color: T.amber, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 12, marginBottom: 4, letterSpacing: 0.4 },
  shoppingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: T.line },
  shopCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: T.mist, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  shopCheckboxDone: { backgroundColor: T.mint, borderColor: T.mint },
  checkmarkSmall: { color: T.ink, fontSize: 12, fontWeight: '700' },
  shoppingName: { color: T.paper, fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  shoppingPrecise: { color: T.mist, fontSize: 10.5, marginTop: 1 },
  shoppingQty: { color: T.amber, fontSize: 13, fontWeight: '700' },
  shoppingDone: { color: T.mist, textDecorationLine: 'line-through' },
  shoppingTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: T.ink, borderRadius: 8, padding: 10, marginBottom: 6 },
  shoppingTotalLabel: { color: T.mist, fontSize: 11, fontWeight: '600' },
  shoppingTotalValue: { color: T.amber, fontSize: 18, fontWeight: '800', marginTop: 2 },
  shoppingTotalValueSmall: { color: T.paper, fontSize: 14, fontWeight: '700', marginTop: 2 },
  shoppingNote: { color: T.mist, fontSize: 10.5, marginBottom: 8, fontStyle: 'italic' },
  shoppingProgress: { color: T.mint, fontSize: 11.5, fontWeight: '700', marginBottom: 6 },
});
