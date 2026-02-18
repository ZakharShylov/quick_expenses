import { DEFAULT_CATEGORIES } from '@/src/constants/categories';

import { getDbAsync } from './db';
import { getSetting, setSetting } from './settings';
import { initDatabaseAsync } from './schema';

const RECENT_CATEGORIES_SETTING_KEY = 'recentCategoriesJson';
const MAX_RECENT_CATEGORIES = 5;

type CustomCategoryRow = {
  name: string;
};

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function dedupeCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeCategoryName(value);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export async function getCustomCategories() {
  await initDatabaseAsync();
  const db = await getDbAsync();

  const rows = await db.getAllAsync<CustomCategoryRow>(
    `SELECT name
     FROM custom_categories
     ORDER BY datetime(created_at) DESC, id DESC`
  );

  return rows
    .map((row) => normalizeCategoryName(row.name))
    .filter((value) => value.length > 0);
}

export async function addCustomCategory(name: string) {
  await initDatabaseAsync();
  const db = await getDbAsync();

  const normalizedName = normalizeCategoryName(name);
  if (!normalizedName) {
    throw new Error('Category name is required');
  }

  const normalizedNameKey = normalizedName.toLowerCase();
  const hasDefaultCategory = DEFAULT_CATEGORIES.some(
    (value) => value.toLowerCase() === normalizedNameKey
  );
  if (hasDefaultCategory) {
    throw new Error('This default category already exists');
  }

  const currentCustomCategories = await getCustomCategories();
  const hasCustomCategory = currentCustomCategories.some(
    (value) => value.toLowerCase() === normalizedNameKey
  );
  if (hasCustomCategory) {
    throw new Error('This custom category already exists');
  }

  await db.runAsync(
    `INSERT INTO custom_categories (name, created_at)
     VALUES (?, ?)`,
    normalizedName,
    new Date().toISOString()
  );

  return normalizedName;
}

export async function deleteCustomCategory(name: string) {
  await initDatabaseAsync();
  const db = await getDbAsync();
  const normalizedName = normalizeCategoryName(name);
  if (!normalizedName) return;

  await db.runAsync(`DELETE FROM custom_categories WHERE name = ?`, normalizedName);
}

export async function getRecentCategories() {
  const stored = await getSetting(RECENT_CATEGORIES_SETTING_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return dedupeCaseInsensitive(parsed).slice(0, MAX_RECENT_CATEGORIES);
  } catch {
    return [];
  }
}

export async function recordRecentCategory(name: string) {
  const normalizedName = normalizeCategoryName(name);
  if (!normalizedName) return;

  const currentRecent = await getRecentCategories();
  const normalizedNameKey = normalizedName.toLowerCase();
  const nextRecent = [
    normalizedName,
    ...currentRecent.filter((value) => value.toLowerCase() !== normalizedNameKey),
  ].slice(0, MAX_RECENT_CATEGORIES);

  await setSetting(RECENT_CATEGORIES_SETTING_KEY, JSON.stringify(nextRecent));
}
