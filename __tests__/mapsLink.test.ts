import { describe, expect, it } from 'vitest';
import {
  buildAppleMapsUrl,
  buildGoogleMapsUrl,
  isMappableLocation,
  mapsQuery,
} from '@/utils/mapsLink';

describe('isMappableLocation', () => {
  it('accepts physical locations', () => {
    expect(isMappableLocation('AUD 560')).toBe(true);
    expect(isMappableLocation('Stuart Building 107')).toBe(true);
    expect(isMappableLocation('10 W 35th St, Chicago, IL')).toBe(true);
  });

  it('rejects empty and non-physical locations', () => {
    for (const loc of ['', '  ', null, undefined, 'TBA', 'tba', 'Online', 'ONLINE', 'Remote', 'Internet']) {
      expect(isMappableLocation(loc), String(loc)).toBe(false);
    }
  });
});

describe('mapsQuery', () => {
  it('appends university context when available', () => {
    expect(mapsQuery('AUD 560', 'Roosevelt University')).toBe('AUD 560, Roosevelt University');
    expect(mapsQuery('Wishnick Hall', 'Illinois Institute of Technology')).toBe(
      'Wishnick Hall, Illinois Institute of Technology',
    );
  });

  it('falls back to bare location', () => {
    expect(mapsQuery('AUD 560')).toBe('AUD 560');
    expect(mapsQuery('AUD 560', null)).toBe('AUD 560');
    expect(mapsQuery('AUD 560', '  ')).toBe('AUD 560');
  });
});

describe('maps URL builders', () => {
  it('builds a native Apple Maps URL', () => {
    expect(buildAppleMapsUrl('AUD 560, Roosevelt University')).toBe(
      'https://maps.apple.com/?q=AUD%20560%2C%20Roosevelt%20University',
    );
  });

  it('builds the universal HTTPS Google Maps search URL', () => {
    expect(buildGoogleMapsUrl('Wishnick Hall, Illinois Institute of Technology, Chicago, IL')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Wishnick%20Hall%2C%20Illinois%20Institute%20of%20Technology%2C%20Chicago%2C%20IL',
    );
    // No custom scheme — iOS routes the https link to the app or Safari.
    expect(buildGoogleMapsUrl('AUD 560')).toMatch(/^https:\/\/www\.google\.com\/maps\/search\//);
  });

  it('encodes special characters in the Google Maps query', () => {
    const url = buildGoogleMapsUrl("O'Brien Hall & Café, 10 W 35th St");
    expect(url).not.toContain(' ');
    expect(decodeURIComponent(url.split('query=')[1])).toBe("O'Brien Hall & Café, 10 W 35th St");
  });

  it('encodes unsafe characters in the query', () => {
    const url = buildAppleMapsUrl('Café "A" & B <Hall>');
    expect(url).not.toContain(' ');
    expect(url).not.toContain('"');
    expect(url).not.toContain('<');
    expect(decodeURIComponent(url.split('?q=')[1])).toBe('Café "A" & B <Hall>');
  });
});
