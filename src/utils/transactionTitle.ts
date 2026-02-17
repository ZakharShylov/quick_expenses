import { getCategoryLabel } from '@/src/constants/categories';

export function formatTitle(category: string, item?: string) {
  const categoryLabel = getCategoryLabel(category);
  const normalizedItem = item?.trim();

  if (!normalizedItem) {
    return categoryLabel;
  }

  return `${categoryLabel} (${normalizedItem})`;
}
