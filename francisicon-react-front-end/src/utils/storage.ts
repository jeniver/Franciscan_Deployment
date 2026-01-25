export function getStoredJSON<T>(key: string): T | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function setStoredJSON<T>(key: string, value: T | null): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Ignore storage write errors (storage might be unavailable or full)
  }
}


