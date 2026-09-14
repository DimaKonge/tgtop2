export const CATALOG_SUBCATEGORIES = {
  "Каналы": ["General", "News", "Crypto", "Technology", "Business", "Education", "Entertainment", "Games", "Memes"],
  "Чаты": ["General", "Community", "Dating", "City", "Support", "Work", "Hobbies", "Learning", "Games"],
} as const;

export type CatalogCategory = keyof typeof CATALOG_SUBCATEGORIES;
export type CatalogSubcategory = (typeof CATALOG_SUBCATEGORIES)[CatalogCategory][number];

export function isCatalogSubcategory(category: CatalogCategory, value: string) {
  return (CATALOG_SUBCATEGORIES[category] as readonly string[]).includes(value);
}
