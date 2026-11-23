import { calculateHaversineDistance } from './distance.js';

/**
 * Smart Rule-Based Event Recommendation Engine
 * Calculates transparent match score and explanation badges.
 *
 * Scoring weights:
 * - Direct Interest Match: +40 pts
 * - Same College / Campus: +25 pts
 * - Bookmarked Category Affinity: +20 pts
 * - High Registration Popularity (>= 200 attendees): +15 pts
 * - Nearby Proximity (<= 5 km): +15 pts
 * - Imminent Date (within 14 days): +10 pts
 */
export function calculateEventRecommendations({
  events = [],
  userInterests = [],
  userCollegeId = null,
  bookmarkedCategoryIds = [],
  registeredCategoryIds = [],
  userCoordinates = null,
}) {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  const normalizedInterests = (userInterests || []).map((i) => i.toLowerCase().trim());
  const now = new Date();

  const scoredEvents = events.map((event) => {
    let score = 0;
    const reasons = [];

    // 1. Direct Interest Match (Category or Subcategory matches user's interests)
    const categoryName = (event.categoryName || '').toLowerCase();
    const subcategory = (event.subcategory || '').toLowerCase();
    const title = (event.title || '').toLowerCase();

    const matchesInterest = normalizedInterests.some(
      (interest) =>
        categoryName.includes(interest) ||
        subcategory.includes(interest) ||
        title.includes(interest)
    );

    if (matchesInterest) {
      score += 40;
      reasons.push({ text: 'Matches your selected interests', priority: 'high', icon: 'Sparkles' });
    }

    // 2. College Host Affinity
    if (userCollegeId && event.collegeId === userCollegeId) {
      score += 25;
      reasons.push({ text: `Hosted at your home campus (${event.collegeCode || 'College'})`, priority: 'high', icon: 'School' });
    }

    // 3. Category affinity from bookmarks or previous registrations
    if (event.categoryId && (bookmarkedCategoryIds.includes(event.categoryId) || registeredCategoryIds.includes(event.categoryId))) {
      score += 20;
      reasons.push({ text: 'Similar to events you saved or attended', priority: 'medium', icon: 'Bookmark' });
    }

    // 4. Proximity / Campus Radar closeness
    if (userCoordinates && event.latitude && event.longitude) {
      const dist = calculateHaversineDistance(userCoordinates.lat, userCoordinates.lon, event.latitude, event.longitude);
      if (dist != null && dist <= 5) {
        score += 15;
        reasons.push({ text: `Close to you (${dist} km)`, priority: 'medium', icon: 'MapPin' });
      }
    }

    // 5. Popularity momentum (actual registration numbers)
    const attendeeCount = event.registrationsCount || 0;
    if (attendeeCount >= 200) {
      score += 15;
      reasons.push({ text: `Trending (${attendeeCount}+ registered)`, priority: 'popular', icon: 'Flame' });
    }

    // 6. Imminent Date (happening soon)
    if (event.startDate) {
      const eventDate = new Date(event.startDate);
      const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 14) {
        score += 10;
        reasons.push({ text: diffDays === 0 ? 'Happening today!' : `Happening in ${diffDays} days`, priority: 'imminent', icon: 'Calendar' });
      }
    }

    return {
      ...event,
      matchScore: score,
      recommendationReasons: reasons,
    };
  });

  // Sort descending by score, only return events with at least one matching reason
  return scoredEvents
    .filter((e) => e.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}
