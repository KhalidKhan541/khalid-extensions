/**
 * Dark Mode Plus - Scheduler Module
 * Handles time-based automation, sunset/sunrise calculation, and smooth transitions.
 */

const Scheduler = (() => {
  // Cache of calculated sun times per day
  let sunTimesCache = null;
  let cacheDate = null;

  /**
   * Calculate sunrise and sunset times based on latitude and date.
   * Uses a simplified astronomical algorithm.
   */
  function calculateSunTimes(latitude, date = new Date()) {
    const cacheKey = `${latitude}-${date.toDateString()}`;
    if (cacheDate === cacheKey && sunTimesCache) {
      return sunTimesCache;
    }

    const dayOfYear = getDayOfYear(date);
    const latRad = latitude * (Math.PI / 180);

    // Solar declination approximation
    const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
    const decRad = declination * (Math.PI / 180);

    // Hour angle calculation
    const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);
    const hourAngle = Math.acos(Math.min(1, Math.max(-1, cosHourAngle)));

    // Convert to minutes from midnight (UTC)
    const sunriseUTC = 720 - 4 * (hourAngle * (180 / Math.PI));
    const sunsetUTC = 720 + 4 * (hourAngle * (180 / Math.PI));

    const result = {
      sunrise: Math.round(sunriseUTC),
      sunset: Math.round(sunsetUTC),
      sunriseFormatted: minutesToTime(Math.round(sunriseUTC)),
      sunsetFormatted: minutesToTime(Math.round(sunsetUTC))
    };

    sunTimesCache = result;
    cacheDate = cacheKey;

    return result;
  }

  function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / 86400000);
  }

  function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Parse location string to latitude.
   * Supports: "New York", "40.7128,-74.0060", etc.
   */
  function parseLocation(location) {
    if (!location) return 40.7128; // Default: New York

    const coords = location.split(',').map(s => parseFloat(s.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      return coords[0];
    }

    // Simple city name mapping
    const cityCoords = {
      'new york': 40.7128, 'los angeles': 34.0522, 'chicago': 41.8781,
      'houston': 29.7604, 'phoenix': 33.4484, 'philadelphia': 39.9526,
      'san antonio': 29.4241, 'san diego': 32.7157, 'dallas': 32.7767,
      'london': 51.5074, 'paris': 48.8566, 'berlin': 52.52, 'tokyo': 35.6762,
      'sydney': -33.8688, 'mumbai': 19.076, 'beijing': 39.9042,
      'moscow': 55.7558, 'cairo': 30.0444, 'toronto': 43.6532,
      'singapore': 1.3521, 'dubai': 25.2048, 'rome': 41.9028,
      'seoul': 37.5665, 'bangkok': 13.7563, 'amsterdam': 52.3676
    };

    const lower = location.toLowerCase().trim();
    return cityCoords[lower] || 40.7128;
  }

  /**
   * Determine if it's currently dark based on the schedule configuration.
   */
  function isCurrentlyDark(schedule) {
    if (!schedule || !schedule.enabled) return null; // null = schedule not active

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (schedule.type === 'sunset') {
      const latitude = parseLocation(schedule.location);
      const sunTimes = calculateSunTimes(latitude, now);
      return currentMinutes >= sunTimes.sunset || currentMinutes < sunTimes.sunrise;
    }

    if (schedule.type === 'custom') {
      const [onH, onM] = (schedule.onTime || '18:00').split(':').map(Number);
      const [offH, offM] = (schedule.offTime || '07:00').split(':').map(Number);
      const onMinutes = onH * 60 + onM;
      const offMinutes = offH * 60 + offM;

      if (onMinutes < offMinutes) {
        return currentMinutes >= onMinutes && currentMinutes < offMinutes;
      } else {
        return currentMinutes >= onMinutes || currentMinutes < offMinutes;
      }
    }

    return null;
  }

  /**
   * Get the next transition time and whether it's enabling or disabling.
   */
  function getNextTransition(schedule) {
    if (!schedule || !schedule.enabled) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (schedule.type === 'sunset') {
      const latitude = parseLocation(schedule.location);
      const sunTimes = calculateSunTimes(latitude, now);

      if (currentMinutes < sunTimes.sunset) {
        const diff = sunTimes.sunset - currentMinutes;
        return {
          type: 'enable',
          time: minutesToTime(sunTimes.sunset),
          minutesUntil: diff,
          reason: 'Sunset'
        };
      } else if (currentMinutes < sunTimes.sunrise) {
        const diff = sunTimes.sunrise - currentMinutes;
        return {
          type: 'disable',
          time: minutesToTime(sunTimes.sunrise),
          minutesUntil: diff,
          reason: 'Sunrise'
        };
      } else {
        const diff = (24 * 60 - currentMinutes) + sunTimes.sunset;
        return {
          type: 'enable',
          time: minutesToTime(sunTimes.sunset),
          minutesUntil: diff,
          reason: 'Sunset'
        };
      }
    }

    if (schedule.type === 'custom') {
      const [onH, onM] = (schedule.onTime || '18:00').split(':').map(Number);
      const [offH, offM] = (schedule.offTime || '07:00').split(':').map(Number);
      const onMinutes = onH * 60 + onM;
      const offMinutes = offH * 60 + offM;

      if (currentMinutes < onMinutes) {
        return {
          type: 'enable',
          time: schedule.onTime,
          minutesUntil: onMinutes - currentMinutes,
          reason: 'Scheduled on-time'
        };
      } else if (currentMinutes < offMinutes) {
        return {
          type: 'disable',
          time: schedule.offTime,
          minutesUntil: offMinutes - currentMinutes,
          reason: 'Scheduled off-time'
        };
      } else {
        return {
          type: 'enable',
          time: schedule.onTime,
          minutesUntil: (24 * 60 - currentMinutes) + onMinutes,
          reason: 'Scheduled on-time'
        };
      }
    }

    return null;
  }

  /**
   * Smooth transition between themes by interpolating CSS variables.
   */
  function smoothTransition(element, fromOpacity, toOpacity, duration = 300) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const step = (timestamp) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;
        const current = fromOpacity + (toOpacity - fromOpacity) * eased;
        element.style.opacity = current;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  /**
   * Check system prefers-color-scheme preference.
   */
  function getSystemPreference() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }

  return {
    calculateSunTimes,
    parseLocation,
    isCurrentlyDark,
    getNextTransition,
    smoothTransition,
    getSystemPreference,
    minutesToTime
  };
})();

if (typeof window !== 'undefined') {
  window.Scheduler = Scheduler;
}
