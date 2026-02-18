export const DEFAULT_CATEGORIES = [
  'Groceries',
  'Transport',
  'Cafe',
  'Restaurants',
  'Home',
  'Health',
  'Pharmacy',
  'Entertainment',
  'Subscriptions',
  'Clothing',
  'Gifts',
  'Education',
  'Travel',
  'Sports',
  'Beauty',
  'Kids',
  'Taxi',
  'Mobile',
  'Other',
] as const;

export const CATEGORIES = DEFAULT_CATEGORIES;

export type ExpenseCategory = (typeof DEFAULT_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  Groceries: '#3B82F6',
  Transport: '#F97316',
  Cafe: '#EC4899',
  Restaurants: '#E11D48',
  Home: '#10B981',
  Health: '#22C55E',
  Pharmacy: '#14B8A6',
  Entertainment: '#F59E0B',
  Subscriptions: '#6366F1',
  Clothing: '#8B5CF6',
  Gifts: '#D946EF',
  Education: '#0EA5E9',
  Travel: '#06B6D4',
  Sports: '#84CC16',
  Beauty: '#F43F5E',
  Kids: '#A855F7',
  Taxi: '#F97316',
  Mobile: '#64748B',
  Other: '#94A3B8',
};

const CATEGORY_ALIASES: Record<string, ExpenseCategory> = {
  Продукты: 'Groceries',
  Транспорт: 'Transport',
  Кафе: 'Cafe',
  Рестораны: 'Restaurants',
  Дом: 'Home',
  Здоровье: 'Health',
  Аптека: 'Pharmacy',
  Развлечения: 'Entertainment',
  Подписки: 'Subscriptions',
  Одежда: 'Clothing',
  Подарки: 'Gifts',
  Образование: 'Education',
  Путешествия: 'Travel',
  Спорт: 'Sports',
  Красота: 'Beauty',
  Дети: 'Kids',
  Такси: 'Taxi',
  Связь: 'Mobile',
  Другое: 'Other',
};

export function getCategoryLabel(category: string) {
  return CATEGORY_ALIASES[category] ?? category;
}

export function getCategoryColor(category: string) {
  const normalized = getCategoryLabel(category);
  return CATEGORY_COLORS[normalized] ?? '#64748B';
}
