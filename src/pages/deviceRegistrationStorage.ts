export interface StoredRegisteredDevice {
  deviceCode: string;
  locationId: number;
  locationName: string;
  landmark: string;
  brand?: string;
  orientation?: string;
  deviceSize?: number;
}

const STORAGE_KEY = "registeredDevice";
const DB_NAME = "dmrc-kiosk";
const STORE_NAME = "registered-device";
const STORE_RECORD_KEY = "current";

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveRegisteredDevice(
  device: StoredRegisteredDevice,
): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(device));

  const database = await openDatabase();
  if (!database) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(device, STORE_RECORD_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadStoredRegisteredDevice(): Promise<StoredRegisteredDevice | null> {
  const localValue = localStorage.getItem(STORAGE_KEY);
  if (localValue) {
    try {
      return JSON.parse(localValue) as StoredRegisteredDevice;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const database = await openDatabase();
  if (!database) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(STORE_RECORD_KEY);

    request.onsuccess = () =>
      resolve((request.result as StoredRegisteredDevice | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearStoredRegisteredDevice(): Promise<void> {
  localStorage.removeItem(STORAGE_KEY);

  const database = await openDatabase();
  if (!database) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
