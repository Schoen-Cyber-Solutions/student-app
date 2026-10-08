import { describe, expect, it } from 'vitest';
import {
  isAllowedHostUrl,
  isSafeExternalUrl,
  resolveExternalLinks,
} from '@/utils/externalLinks';
import { campusSourceHosts } from '@/utils/campusSource';

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

  it('emits a professor-profile link for a verified IIT directory URL', () => {
    const links = resolveExternalLinks({
      domain: 'hawk.illinoistech.edu',
      instructor: 'Matthew J Bauer',
      instructorProfileUrl: 'https://www.iit.edu/directory/people/matthew-bauer',
    });
    expect(links).toHaveLength(1);
    expect(links[0].kind).toBe('professor_profile');
    expect(links[0].url).toBe('https://www.iit.edu/directory/people/matthew-bauer');
  });

  it('rejects non-IIT hosts and non-profile IIT paths', () => {
    for (const url of [
      'http://www.iit.edu/directory/people/matthew-bauer',
      'https://iit.edu.evil.com/directory/people/matthew-bauer',
      'https://www.iit.edu/directory/people',
      'https://www.iit.edu/academics',
      'https://www.roosevelt.edu/directory/people/matthew-bauer', // RU host can't carry IIT paths
    ]) {
      expect(
        resolveExternalLinks({
          domain: 'hawk.illinoistech.edu',
          instructorProfileUrl: url,
        }),
        url,
      ).toHaveLength(0);
    }
  });

  it('does not let IIT URLs pass the Roosevelt validator (and vice versa)', () => {
    expect(
      resolveExternalLinks({
        domain: 'mail.roosevelt.edu',
        instructorProfileUrl: 'https://www.iit.edu/directory/people/matthew-bauer',
      }),
    ).toHaveLength(0);
    expect(
      resolveExternalLinks({
        domain: 'hawk.illinoistech.edu',
        instructorProfileUrl: 'https://www.roosevelt.edu/profile/mbauer',
      }),
    ).toHaveLength(0);
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

describe('isAllowedHostUrl — campus event source links', () => {
  const IIT_HOSTS = campusSourceHosts('iit_elevate')!;

  it('accepts elevate.iit.edu and iit.edu event pages', () => {
    expect(
      isAllowedHostUrl(
        'https://elevate.iit.edu/events/2027/01/05/insight-globals-sales-invitational/',
        IIT_HOSTS,
      ),
    ).toBe(true);
    expect(isAllowedHostUrl('https://www.iit.edu/events/m3-ip-workshop', IIT_HOSTS)).toBe(true);
    expect(isAllowedHostUrl('https://iit.edu/events/x', IIT_HOSTS)).toBe(true);
  });

  it('rejects non-https, unsafe schemes, and unrelated domains', () => {
    expect(isAllowedHostUrl('http://elevate.iit.edu/events/x', IIT_HOSTS)).toBe(false);
    expect(isAllowedHostUrl('javascript:alert(1)', IIT_HOSTS)).toBe(false);
    expect(isAllowedHostUrl('https://evil-iit.edu/x', IIT_HOSTS)).toBe(false);
    expect(isAllowedHostUrl('https://iit.edu.evil.com/x', IIT_HOSTS)).toBe(false);
    expect(isAllowedHostUrl('https://example.com/x', IIT_HOSTS)).toBe(false);
  });

  it('keeps Roosevelt Engage links on campuslabs/roosevelt hosts', () => {
    const RU_HOSTS = campusSourceHosts('engage_rss')!;
    expect(isAllowedHostUrl('https://roosevelt.campuslabs.com/engage/event/1', RU_HOSTS)).toBe(
      true,
    );
    // IIT hosts must not accept Laker links and vice versa — no mixing.
    expect(isAllowedHostUrl('https://roosevelt.campuslabs.com/engage/event/1', IIT_HOSTS)).toBe(
      false,
    );
    expect(isAllowedHostUrl('https://www.iit.edu/events/x', RU_HOSTS)).toBe(false);
  });

  it('maps saved-copy providers to the same hosts as their source', () => {
    expect(campusSourceHosts('campus_iit_elevate')).toEqual(campusSourceHosts('iit_elevate'));
    expect(campusSourceHosts('laker_connect')).toEqual(campusSourceHosts('engage_rss'));
    expect(campusSourceHosts('course_schedule')).toBeNull();
    expect(campusSourceHosts(null)).toBeNull();
  });
});
