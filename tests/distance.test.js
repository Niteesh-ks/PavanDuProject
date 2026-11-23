import { describe, it, expect } from 'vitest';
import { calculateHaversineDistance, filterEventsByRadius } from '../src/utils/distance.js';

describe('Campus Radar - Haversine Distance Calculations', () => {
  it('correctly calculates distance between IISc and RVCE', () => {
    // IISc: 13.0219, 77.5671
    // RVCE: 12.9237, 77.4987
    const dist = calculateHaversineDistance(13.0219, 77.5671, 12.9237, 77.4987);
    expect(dist).toBeGreaterThan(12);
    expect(dist).toBeLessThan(15);
  });

  it('calculates 0 distance for identical coordinates', () => {
    const dist = calculateHaversineDistance(12.9344, 77.5345, 12.9344, 77.5345);
    expect(dist).toBe(0);
  });

  it('handles null/undefined coordinates gracefully', () => {
    expect(calculateHaversineDistance(null, 77.5, 12.9, 77.5)).toBeNull();
    expect(calculateHaversineDistance(12.9, 77.5, null, null)).toBeNull();
  });

  it('filters events strictly within the specified radius threshold', () => {
    const testEvents = [
      { id: 'near_1', latitude: 12.9345, longitude: 77.5350 }, // ~0.1 km away
      { id: 'near_2', latitude: 12.9416, longitude: 77.5658 }, // ~3.5 km away
      { id: 'far_1', latitude: 13.0219, longitude: 77.5671 },  // ~10.5 km away
    ];

    const results5km = filterEventsByRadius(testEvents, 12.9344, 77.5345, 5);
    expect(results5km.map((e) => e.id)).toEqual(['near_1', 'near_2']);

    const results15km = filterEventsByRadius(testEvents, 12.9344, 77.5345, 15);
    expect(results15km.length).toBe(3);
  });
});
