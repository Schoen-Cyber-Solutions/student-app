import { describe, expect, it } from 'vitest';
import { resolveExternalLinks, isSafeExternalUrl } from '@/utils/externalLinks';

const DOMAIN = 'roosevelt.edu';

describe('resolveExternalLinks', () => {
  it('emits a professor-profile link for a verified roosevelt.edu URL', () => {
    const links = resolveExternalLinks({
      domain: DOMAIN,
      instructor: 'Patel, B.',
      instructorProfileUrl: 'https://www.roosevelt.edu/profile/bpatel55',
    });
    expect(links).toHaveLength(1);
    expect(links[0].kind).toBe('professor_profile');
    expect(links[0].label).toBe('View Professor Profile');
    expect(links[0].url).toBe('https://www.roosevelt.edu/profile/bpatel55');
  });

  it('shows nothing when the event has no stored profile URL', () => {
    expect(
      resolveExternalLinks({ domain: DOMAIN, instructor: 'Smith, J.' }),
    ).toHaveLength(0);
  });

  it('rejects non-https and untrusted hosts', () => {
    for (const url of [
      'http://www.roosevelt.edu/profile/bpatel55',
      'https://evil.example.com/profile/bpatel55',
      'https://roosevelt.edu.evil.com/profile/bpatel55',
      'javascript:alert(1)',
      'data:text/html;base64,x',
      'not a url',
    ]) {
      expect(
        resolveExternalLinks({ domain: DOMAIN, instructor: 'Patel, B.', instructorProfileUrl: url }),
        url,
      ).toHaveLength(0);
    }
  });

  it('rejects non-profile paths on the trusted host', () => {
    for (const url of [
      'https://www.roosevelt.edu/contact/directory',
      'https://www.roosevelt.edu/',
      'https://www.roosevelt.edu/profile/../about',
    ]) {
      expect(
        resolveExternalLinks({ domain: DOMAIN, instructorProfileUrl: url }),
        url,
      ).toHaveLength(0);
    }
  });

  it('emits nothing for universities without a resolver or without a domain', () => {
    const url = 'https://www.roosevelt.edu/profile/bpatel55';
    expect(
      resolveExternalLinks({ domain: 'other.edu', instructorProfileUrl: url }),
    ).toHaveLength(0);
    expect(resolveExternalLinks({ domain: null, instructorProfileUrl: url })).toHaveLength(0);
  });
});

describe('isSafeExternalUrl', () => {
  it('allows only https URLs for Linking.openURL', () => {
    expect(isSafeExternalUrl('https://roosevelt.campuslabs.com/engage/event/123')).toBe(true);
    expect(isSafeExternalUrl('  https://example.com/x  ')).toBe(true);
    expect(isSafeExternalUrl('http://example.com/x')).toBe(false);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeExternalUrl('studentappdevelopment://oauth')).toBe(false);
    expect(isSafeExternalUrl('not a url')).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
  });
});
