import { supabase } from './supabaseClient';

const DB_NAME = 'BarberPro_OfflineDB';
const STORE_NAME = 'sync_queue';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e) => reject(e);
  });
};

export type OfflineAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';

export interface OfflineItem {
    id?: number;
    table: string;
    action: OfflineAction;
    payload: any;
    createdAt: number;
}

export const addToOfflineQueue = async (table: string, action: OfflineAction, payload: any) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const item: OfflineItem = {
      table,
      action,
      payload,
      createdAt: Date.now()
    };
    store.add(item);
    console.info(`[Offline] Action queued: ${action} on ${table}`);
  } catch (e) {
    console.error('[Offline] Failed to queue action', e);
  }
};

export const processOfflineQueue = async (): Promise<boolean> => {
  if (!navigator.onLine) return false;

  console.info('[Sync] Starting synchronization...');
  
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve) => {
      request.onsuccess = async () => {
        const items: OfflineItem[] = request.result;
        if (items.length === 0) {
            console.info('[Sync] Queue empty.');
            resolve(true);
            return;
        }

        let successCount = 0;

        for (const item of items) {
          try {
            let error = null;
            
            if (item.action === 'INSERT') {
              const { error: err } = await supabase.from(item.table).insert(item.payload);
              error = err;
            } else if (item.action === 'UPDATE') {
              const { match, data } = item.payload;
              let query = supabase.from(item.table).update(data);
              if (match) {
                  Object.keys(match).forEach(key => {
                      query = query.eq(key, match[key]);
                  });
              }
              const { error: err } = await query;
              error = err;
            } else if (item.action === 'DELETE') {
               const { id } = item.payload;
               const { error: err } = await supabase.from(item.table).delete().eq('id', id);
               error = err;
            } else if (item.action === 'UPSERT') {
               const { error: err } = await supabase.from(item.table).upsert(item.payload);
               error = err;
            }

            if (!error) {
              const delTx = db.transaction(STORE_NAME, 'readwrite');
              delTx.objectStore(STORE_NAME).delete(item.id!);
              successCount++;
            } else {
               console.warn(`[Sync] Failed item (ID: ${item.id}) - ${item.table} ${item.action}`, error);
            }
          } catch (e) {
             console.error('[Sync] Exception processing item', e);
          }
        }
        
        console.info(`[Sync] Completed. Processed ${successCount}/${items.length}`);
        resolve(true);
      };
      
      request.onerror = () => {
          console.error('[Sync] Failed to read queue');
          resolve(false);
      }
    });
  } catch (e) {
      console.error('[Sync] DB Error', e);
      return false;
  }
};