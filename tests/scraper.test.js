import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import {
  createDedupKey,
  isValidDate,
  runEventRaiderScan,
  DEFAULT_COLLEGE_SOURCES,
  scrapeSource,
} from '../server/services/eventRaider.js';

describe('Event Raider Ingestion Engine', () => {
  it('correctly creates deduplication keys normalizing punctuation and case', () => {
    const key1 = createDedupKey('Pravega 2026: Quantum Summit!', '2026-11-20', 'Indian Institute of Science');
    const key2 = createDedupKey('pravega 2026 quantum summit', '2026-11-20', 'indian institute of science');
    expect(key1).toBe(key2);
  });

  it('validates ISO and standard dates properly', () => {
    expect(isValidDate('2026-11-20')).toBe(true);
    expect(isValidDate('2026-12-05T10:00:00Z')).toBe(true);
    expect(isValidDate('invalid-date-string')).toBe(false);
    expect(isValidDate(null)).toBe(false);
  });

  it('runs crawler cycle and marks all scraped events in pending review status', async () => {
    const summary = await runEventRaiderScan();
    expect(summary.totalSources).toBeGreaterThan(0);
    expect(summary.newPendingEvents.length).toBeGreaterThan(0);

    for (const evt of summary.newPendingEvents) {
      expect(evt.reviewStatus).toBe('pending');
      expect(evt.title).toBeTruthy();
      expect(evt.collegeName).toBeTruthy();
      expect(evt.originalSourceUrl).toBeTruthy();
    }
  });

  it('falls back to the curated college feed when a source is blocked and skips duplicates', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockRejectedValue(new Error('Request failed with status code 403'));

    try {
      const source = DEFAULT_COLLEGE_SOURCES[0];
      const firstScan = await scrapeSource(source, new Set());
      expect(firstScan.events.length).toBeGreaterThan(0);
      expect(firstScan.events.every((evt) => evt.reviewStatus === 'pending')).toBe(true);

      const seenKeys = new Set(firstScan.events.map((evt) => createDedupKey(evt.title, evt.eventDate, evt.collegeName)));
      const secondScan = await scrapeSource(source, seenKeys);
      expect(secondScan.events).toHaveLength(0);
    } finally {
      getSpy.mockRestore();
    }
  });

  it('uses the configured source selectors to parse real event markup', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      data: `
        <div class="listing">
          <article class="entry">
            <h4 class="event-heading">Robotics Meetup</h4>
            <time class="starts" datetime="2026-11-20">Nov 20</time>
            <span class="hall">Innovation Lab</span>
            <p class="details">Student robotics showcase.</p>
            <a href="/register">Register</a>
          </article>
        </div>
      `,
    });

    try {
      const result = await scrapeSource({
        id: 'database-source-id',
        name: 'Test source',
        collegeName: 'Test College',
        url: 'https://example.test/events',
        selectorConfig: {
          container: '.entry',
          title: '.event-heading',
          date: '.starts',
          venue: '.hall',
          description: '.details',
        },
      });

      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        sourceId: 'database-source-id',
        title: 'Robotics Meetup',
        eventDate: '2026-11-20',
        venue: 'Innovation Lab',
        description: 'Student robotics showcase.',
        registrationUrl: 'https://example.test/register',
      });
    } finally {
      getSpy.mockRestore();
    }
  });
});
