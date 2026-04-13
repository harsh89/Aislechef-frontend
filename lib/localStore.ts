import { getDatabase } from './database';
import type { GroceryItem, GroceryList } from '../types';

// ── Row types (SQLite stores booleans as integers) ─────────────────────────

type ListRow = {
  listId: string;
  name: string;
  lastUpdated: string;
  createdAt: string;
  isDeleted: number;
  synced: number;
};

type ItemRow = {
  itemId: string;
  listId: string;
  itemName: string;
  quantity: number;
  unit: string;
  lastUpdated: string;
  createdAt: string;
  isDeleted: number;
  isCompleted: number;
  synced: number;
};

// ── Row → domain type mappers ──────────────────────────────────────────────

function rowToList(row: ListRow): GroceryList {
  return {
    listId: row.listId,
    name: row.name,
    lastUpdated: row.lastUpdated,
    isDeleted: Boolean(row.isDeleted),
  };
}

function rowToItem(row: ItemRow): GroceryItem {
  return {
    itemId: row.itemId,
    listId: row.listId,
    itemName: row.itemName,
    quantity: row.quantity,
    unit: row.unit as GroceryItem['unit'],
    lastUpdated: row.lastUpdated,
    createdAt: row.createdAt,
    isDeleted: Boolean(row.isDeleted),
    isCompleted: Boolean(row.isCompleted),
  };
}

// ── Data access ────────────────────────────────────────────────────────────

export const localStore = {
  // ── Lists ──────────────────────────────────────────────────────────────

  async getLists(): Promise<GroceryList[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ListRow>(
      'SELECT * FROM lists WHERE isDeleted = 0 ORDER BY lastUpdated DESC',
    );
    return rows.map(rowToList);
  },

  async upsertList(list: GroceryList, synced = 1): Promise<void> {
    const db = await getDatabase();
    const now = list.lastUpdated ?? new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO lists (listId, name, lastUpdated, createdAt, isDeleted, synced)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [list.listId, list.name, now, now, list.isDeleted ? 1 : 0, synced],
    );
  },

  async softDeleteList(listId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE lists SET isDeleted = 1, synced = 0, lastUpdated = ? WHERE listId = ?',
      [new Date().toISOString(), listId],
    );
  },

  async updateList(listId: string, patch: Partial<Pick<GroceryList, 'name'>>, synced = 0): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    if (patch.name !== undefined) {
      await db.runAsync(
        'UPDATE lists SET name = ?, lastUpdated = ?, synced = ? WHERE listId = ?',
        [patch.name, now, synced, listId],
      );
    }
  },

  // ── Items ──────────────────────────────────────────────────────────────

  async getItems(listId: string): Promise<GroceryItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ItemRow>(
      'SELECT * FROM items WHERE listId = ? AND isDeleted = 0 ORDER BY isCompleted ASC, lastUpdated DESC',
      [listId],
    );
    return rows.map(rowToItem);
  },

  async upsertItem(item: GroceryItem, synced = 1): Promise<void> {
    const db = await getDatabase();
    const now = item.lastUpdated ?? new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO items
         (itemId, listId, itemName, quantity, unit, lastUpdated, createdAt, isDeleted, isCompleted, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.itemId, item.listId, item.itemName, item.quantity, item.unit,
        now, item.createdAt ?? now,
        item.isDeleted ? 1 : 0,
        item.isCompleted ? 1 : 0,
        synced,
      ],
    );
  },

  async updateItem(itemId: string, patch: Partial<GroceryItem>, synced = 0): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = ['lastUpdated = ?', 'synced = ?'];
    const values: unknown[] = [now, synced];

    if (patch.itemName !== undefined) { fields.push('itemName = ?'); values.push(patch.itemName); }
    if (patch.quantity !== undefined) { fields.push('quantity = ?'); values.push(patch.quantity); }
    if (patch.unit !== undefined) { fields.push('unit = ?'); values.push(patch.unit); }
    if (patch.isCompleted !== undefined) { fields.push('isCompleted = ?'); values.push(patch.isCompleted ? 1 : 0); }

    values.push(itemId);
    await db.runAsync(`UPDATE items SET ${fields.join(', ')} WHERE itemId = ?`, values);
  },

  async softDeleteItem(itemId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE items SET isDeleted = 1, synced = 0, lastUpdated = ? WHERE itemId = ?',
      [new Date().toISOString(), itemId],
    );
  },

  // Replace a temp local ID with the server's ID after a successful online create
  async replaceItemId(tempId: string, serverItem: GroceryItem): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM items WHERE itemId = ?', [tempId]);
    await localStore.upsertItem(serverItem, 1);
  },

  async replaceListId(tempId: string, serverList: GroceryList): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM lists WHERE listId = ?', [tempId]);
    await localStore.upsertList(serverList, 1);
  },

  // ── Sync helpers ───────────────────────────────────────────────────────

  async getUnsyncedLists() {
    const db = await getDatabase();
    return db.getAllAsync<{
      listId: string; name: string; lastUpdated: string; isDeleted: number;
    }>('SELECT listId, name, lastUpdated, isDeleted FROM lists WHERE synced = 0');
  },

  async getUnsyncedItems() {
    const db = await getDatabase();
    return db.getAllAsync<{
      itemId: string; listId: string; itemName: string; quantity: number;
      unit: string; lastUpdated: string; isDeleted: number; isCompleted: number;
    }>(
      'SELECT itemId, listId, itemName, quantity, unit, lastUpdated, isDeleted, isCompleted FROM items WHERE synced = 0',
    );
  },

  async markListsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE lists SET synced = 1 WHERE listId IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
  },

  async markItemsSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE items SET synced = 1 WHERE itemId IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
  },
};
