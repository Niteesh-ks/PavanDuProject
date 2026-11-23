/**
 * Haversine distance formula to calculate great-circle distance between two coordinates in kilometers.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers (rounded to 1 decimal place)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return null;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 10) / 10;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Filter events within a specified radius
 */
export function filterEventsByRadius(events, userLat, userLon, radiusKm = 10) {
  if (!userLat || !userLon || !Array.isArray(events)) {
    return events;
  }

  return events
    .map((event) => {
      if (event.latitude && event.longitude) {
        const distance = calculateHaversineDistance(userLat, userLon, event.latitude, event.longitude);
        return { ...event, distanceKm: distance };
      }
      return { ...event, distanceKm: null };
    })
    .filter((event) => event.distanceKm != null && event.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Verified Bengaluru landmark hubs for manual location fallback
 */
export const BENGALURU_HUBS = [
  { name: 'Bengaluru City Centre (Cubbon Park)', lat: 12.9742535, lon: 77.5921906 },
  { name: 'Koramangala (Sony World)', lat: 12.9352, lon: 77.6245 },
  { name: 'Indiranagar (100ft Road)', lat: 12.9784, lon: 77.6408 },
  { name: 'Electronic City Phase 1', lat: 12.8440, lon: 77.6635 },
  { name: 'Whitefield (ITPL)', lat: 12.9866, lon: 77.7314 },
  { name: 'Marathahalli Bridge', lat: 12.9566237, lon: 77.7013376 },
  { name: 'Hebbal', lat: 13.0382184, lon: 77.5919000 },
  { name: 'Malleshwaram / IISc', lat: 13.0035, lon: 77.5695 },
  { name: 'Basavanagudi (Bull Temple)', lat: 12.9421, lon: 77.5684 },
  { name: 'Jayanagar 4th Block', lat: 12.9299, lon: 77.5824 },
  { name: 'Rajajinagar (Navrang)', lat: 12.9982, lon: 77.5530 },
  { name: 'Yelahanka Satellite Town', lat: 13.1007, lon: 77.5963 },
];
