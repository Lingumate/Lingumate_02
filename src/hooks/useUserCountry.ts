import { useState, useEffect } from "react";

interface Country {
  iso2: string;
  name: string;
  source?: string;
  accuracy?: number;
}

interface UseUserCountryOptions {
  autoDetect?: boolean;
}

export function useUserCountry({ autoDetect = true }: UseUserCountryOptions = {}) {
  const [country, setCountry] = useState<Country | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!autoDetect) return;
    let aborted = false;

    async function detect() {
      setLoading(true);
      setError(null);

      if ("geolocation" in navigator) {
        const geoPromise = new Promise<{ lat: number; lng: number; accuracy: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            pos => resolve({ 
              lat: pos.coords.latitude, 
              lng: pos.coords.longitude, 
              accuracy: pos.coords.accuracy 
            }),
            err => reject(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30_000 }
          );
        });

        try {
          const { lat, lng, accuracy } = await geoPromise;
          if (aborted) return;
          
          // Call backend to resolve location to country
          const resp = await fetch("/api/location/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng, accuracy })
          });
          
          if (!resp.ok) {
            throw new Error('Failed to resolve location');
          }
          
          const json = await resp.json();
          if (!aborted) {
            setCountry({ ...json, source: "device-geolocation", accuracy });
            // Store in localStorage for persistence
            localStorage.setItem('userCountry', JSON.stringify({ ...json, source: "device-geolocation", accuracy }));
          }
          return;
        } catch (e: any) {
          if (e.code === e.PERMISSION_DENIED) {
            setPermissionDenied(true);
            return; // stop here → UI will ask manual input
          }
          console.error('Location detection error:', e);
        }
      }

      setError("Unable to detect location");
      setLoading(false);
    }

    // Check if we have a stored country first
    const storedCountry = localStorage.getItem('userCountry');
    if (storedCountry) {
      try {
        const parsed = JSON.parse(storedCountry);
        setCountry(parsed);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('userCountry');
      }
    }

    detect();
    return () => { aborted = true; };
  }, [autoDetect]);

  const updateCountry = (newCountry: Country) => {
    setCountry(newCountry);
    localStorage.setItem('userCountry', JSON.stringify(newCountry));
  };

  return { 
    country, 
    loading, 
    error, 
    setCountry: updateCountry, 
    permissionDenied,
    clearStoredCountry: () => {
      localStorage.removeItem('userCountry');
      setCountry(null);
    }
  };
}
