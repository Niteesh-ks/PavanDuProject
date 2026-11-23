import { describe, it, expect } from 'vitest';
import { calculateEventRecommendations } from '../src/utils/recommendations.js';

describe('Smart Recommendations Engine', () => {
  const sampleEvents = [
    {
      id: 'e1',
      title: 'Autonomous Robotics Derby',
      categoryName: 'Robotics & Hardware',
      subcategory: 'Autonomous Hardware',
      collegeId: 'college_rvce',
      collegeCode: 'RVCE',
      registrationsCount: 50,
      startDate: '2026-11-20',
    },
    {
      id: 'e2',
      title: 'Inter-College AI Hackathon',
      categoryName: 'Hackathons & AI',
      subcategory: 'Generative AI',
      collegeId: 'college_pesu',
      collegeCode: 'PESU',
      registrationsCount: 250, // Trending
      startDate: '2026-11-25',
    },
    {
      id: 'e3',
      title: 'Classical Music Night',
      categoryName: 'Cultural Fests',
      subcategory: 'Music',
      collegeId: 'college_bmsce',
      collegeCode: 'BMSCE',
      registrationsCount: 30,
      startDate: '2026-12-30',
    },
  ];

  it('boosts events matching user selected interests', () => {
    const results = calculateEventRecommendations({
      events: sampleEvents,
      userInterests: ['Hackathons & AI'],
      userCollegeId: null,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('e2');
    expect(results[0].recommendationReasons.some((r) => r.text.includes('selected interests'))).toBe(true);
  });

  it('awards trending bonus to events with high registrations', () => {
    const results = calculateEventRecommendations({
      events: sampleEvents,
      userInterests: [],
    });

    const trendingEvent = results.find((e) => e.id === 'e2');
    expect(trendingEvent).toBeDefined();
    expect(trendingEvent.recommendationReasons.some((r) => r.text.includes('Trending'))).toBe(true);
  });

  it('gives priority to home college campus events', () => {
    const results = calculateEventRecommendations({
      events: sampleEvents,
      userInterests: [],
      userCollegeId: 'college_rvce',
    });

    expect(results[0].id).toBe('e1');
    expect(results[0].recommendationReasons.some((r) => r.text.includes('home campus'))).toBe(true);
  });
});
