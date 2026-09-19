import { MainOrder, FMSVehicleRecord } from '../types';

const DB_NAME = 'FleetMaintenanceDB';
const DB_VERSION = 1;

const STORES = {
  MAIN_ORDERS: 'main_orders',
  FMS_VEHICLES: 'fms_vehicles',
  SYSTEM_DATA: 'system_data',
} as const;

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

/**
 * Initializes and opens the IndexedDB database.
 * Supports massive datasets (15,000+ orders / vehicles) without browser storage quota crashes.
 */
export function openFleetDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store for Main Orders (keyed by orderNumber)
      if (!db.objectStoreNames.contains(STORES.MAIN_ORDERS)) {
        db.createObjectStore(STORES.MAIN_ORDERS, { keyPath: 'orderNumber' });
      }

      // Store for FMS Vehicles (keyed by carCode)
      if (!db.objectStoreNames.contains(STORES.FMS_VEHICLES)) {
        db.createObjectStore(STORES.FMS_VEHICLES, { keyPath: 'carCode' });
      }

      // Store for settings, metadata, templates
      if (!db.objectStoreNames.contains(STORES.SYSTEM_DATA)) {
        db.createObjectStore(STORES.SYSTEM_DATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
        dbInitPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbInitPromise;
}

/**
 * Bulk saves all Main Orders into IndexedDB.
 * Handles 15,000+ records cleanly in transactions.
 */
export async function idbSaveAllMainOrders(orders: MainOrder[]): Promise<void> {
  const db = await openFleetDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORES.MAIN_ORDERS, 'readwrite');
      const store = tx.objectStore(STORES.MAIN_ORDERS);

      // Clear existing records and replace with full updated dataset
      store.clear();

      let fallbackSeq = 100000;
      for (let i = 0; i < orders.length; i++) {
        const item = orders[i];
        let num = Number(item.orderNumber);
        if (isNaN(num) || num <= 0) {
          num = ++fallbackSeq;
        }
        item.orderNumber = num;
        store.put(item);
      }

      tx.oncomplete = () => {
        resolve();
      };
      tx.onerror = () => {
        reject(tx.error || new Error('Transaction failed while saving main orders'));
      };
      tx.onabort = () => {
        reject(tx.error || new Error('Transaction aborted while saving main orders'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves all Main Orders from IndexedDB.
 */
export async function idbGetAllMainOrders(): Promise<MainOrder[]> {
  const db = await openFleetDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORES.MAIN_ORDERS, 'readonly');
      const store = tx.objectStore(STORES.MAIN_ORDERS);
      const req = store.getAll();

      req.onsuccess = () => {
        const result = req.result as MainOrder[];
        // Sort descending by orderNumber to maintain natural order
        result.sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
        resolve(result);
      };
      req.onerror = () => {
        reject(req.error || new Error('Failed to get main orders from IndexedDB'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Bulk saves all FMS Vehicles into IndexedDB.
 */
export async function idbSaveAllVehicles(vehicles: FMSVehicleRecord[]): Promise<void> {
  const db = await openFleetDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORES.FMS_VEHICLES, 'readwrite');
      const store = tx.objectStore(STORES.FMS_VEHICLES);

      store.clear();
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (v && v.carCode) {
          store.put(v);
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to save FMS vehicles to IndexedDB'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted while saving FMS vehicles'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieves all FMS Vehicles from IndexedDB.
 */
export async function idbGetAllVehicles(): Promise<FMSVehicleRecord[]> {
  const db = await openFleetDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORES.FMS_VEHICLES, 'readonly');
      const store = tx.objectStore(STORES.FMS_VEHICLES);
      const req = store.getAll();

      req.onsuccess = () => {
        resolve((req.result as FMSVehicleRecord[]) || []);
      };
      req.onerror = () => {
        reject(req.error || new Error('Failed to get FMS vehicles from IndexedDB'));
      };
    } catch (err) {
      reject(err);
    }
  });
}
