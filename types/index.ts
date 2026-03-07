export type Unit = 'pcs' | 'kg' | 'g' | 'L' | 'mL' | 'tbsp' | 'tsp' | 'cup';

export const UNITS: Unit[] = ['pcs', 'kg', 'g', 'L', 'mL', 'tbsp', 'tsp', 'cup'];

export type CuisineFilter = 'Indian' | 'Chinese' | 'Italian' | 'Mexican' | 'Other';
export const CUISINES: CuisineFilter[] = ['Indian', 'Chinese', 'Italian', 'Mexican', 'Other'];

export type RecipeMode = 'exact' | 'detailed';
export const RECIPE_MODES: { value: RecipeMode; label: string; description: string }[] = [
  { value: 'detailed', label: 'Detailed', description: 'Include extra pantry staples' },
  { value: 'exact', label: 'Exact', description: 'Only use selected ingredients' },
];

export interface GroceryList {
  listId: string;
  userId?: string;
  name: string;
  lastUpdated: string;
  isDeleted?: boolean;
}

export interface GroceryItem {
  itemId: string;
  listId: string;
  itemName: string;
  quantity: number;
  unit: Unit;
  lastUpdated: string;
  createdAt?: string;
  isDeleted?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListDetailResponse {
  listId: string;
  name: string;
  lastUpdated: string;
  items: GroceryItem[];
  pagination: Pagination;
}

export interface SearchResponse {
  listId: string;
  query: string;
  results: GroceryItem[];
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  name: string;
  cuisine?: string;
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
}

export interface ReccoResponse {
  fromCache: boolean;
  recipes: Recipe[];
}

export interface SyncList {
  listId: string;
  name: string;
  lastUpdated: string;
  isDeleted: boolean;
}

export interface SyncItem {
  itemId: string;
  listId: string;
  itemName: string;
  quantity: number;
  unit: string;
  lastUpdated: string;
  isDeleted: boolean;
}

export interface SyncResponse {
  synced: { lists: number; items: number };
  conflicts: Array<{ itemId: string; resolution: 'server_wins' | 'client_wins' }>;
}
