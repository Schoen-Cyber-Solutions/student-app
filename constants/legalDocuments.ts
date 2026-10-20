/**
 * Bundled copies of the published Student App legal documents.
 *
 * Source of truth: schoen-cyber-website/src/student-app/{Terms,Privacy}.jsx
 * (https://schoencybersolutions.com/student-app/terms/ and …/privacy/).
 * Keep this file in sync with those pages — it exists so the full text is
 * readable offline and inside the app without a web view.
 *
 * `acceptanceVersion` on the Terms document MUST match
 * TERMS_OF_SERVICE_VERSION in student-backend/src/services/emailVerification.ts
 * — it is the version string recorded server-side when a user accepts.
 */

export type LegalDocId = 'terms' | 'privacy';

export interface LegalSegment {
  text: string;
  /** External URL or mailto: opened via Linking. */
  url?: string;
  /** Internal legal document: pushed in-app. */
  doc?: LegalDocId;
}

export type LegalBlock =
  | { type: 'subheading'; text: string }
  | { type: 'paragraph'; segments: LegalSegment[] }
  | { type: 'bullets'; items: string[] };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  id: LegalDocId;
  title: string;
  intro: string;
  effectiveDate: string;
  acceptanceVersion?: string;
  sections: LegalSection[];
}

const CONTACT_EMAIL = 'contact@schoencybersolutions.com';

const TERMS: LegalDocument = {
  id: 'terms',
  title: 'Terms of Service',
  intro:
    'These Terms of Use govern your use of Student App, operated by Schoen Cyber Solutions LLC. By creating an account or using the app, you agree to these terms.',
  effectiveDate: 'October 12, 2026',
  acceptanceVersion: '2026-10-19',
  sections: [
    {
      title: 'Eligibility and accounts',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Student App is intended for university students. To use the app you must verify control of a supported university email address and provide accurate information during setup. You are responsible for keeping your account secure and for activity that occurs under it.',
            },
          ],
        },
      ],
    },
    {
      title: 'An independent service',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Student App is developed and operated independently by Schoen Cyber Solutions LLC. It is not an official university system and is not affiliated with, endorsed by, sponsored by, or operated by Roosevelt University, Illinois Institute of Technology, or any other educational institution unless explicitly stated otherwise.',
            },
          ],
        },
        {
          type: 'paragraph',
          segments: [
            {
              text: "Academic, schedule, and event information shown in the app comes from supported university systems and public sources. Always confirm important academic details — such as registration deadlines, exam times, and official announcements — through your university's official channels.",
            },
          ],
        },
      ],
    },
    {
      title: 'Acceptable use',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            { text: 'You agree to use Student App responsibly and lawfully. You may not:' },
          ],
        },
        {
          type: 'bullets',
          items: [
            'Harass, bully, threaten, or harm other users',
            'Post hate speech, sexual exploitation material, or illegal content',
            'Impersonate another person or misrepresent your identity',
            'Publish other people’s private information without consent',
            'Send spam, run scams, or misuse reporting tools',
            'Attempt to disrupt, probe, or gain unauthorized access to the service or its systems',
            'Use the app in a way that violates applicable law or your university’s policies',
          ],
        },
        {
          type: 'paragraph',
          segments: [
            { text: 'Our ' },
            {
              text: 'Community Guidelines',
              url: 'https://schoencybersolutions.com/student-app/community-guidelines/',
            },
            { text: ' describe expected behavior in more detail.' },
          ],
        },
      ],
    },
    {
      title: 'User-generated content',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'You retain ownership of the content you create in Student App. By posting content, you grant us a limited license to store, display, and transmit it as needed to operate the service — for example, to show your messages to other members of your communities.',
            },
          ],
        },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'You are responsible for the content you post. Do not post content you do not have the right to share.',
            },
          ],
        },
      ],
    },
    {
      title: 'Moderation and suspension',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'We may review reported content, remove content that violates these terms or the Community Guidelines, and suspend or restrict accounts that violate them. Moderation decisions are made at our discretion with the goal of protecting users and the integrity of the platform.',
            },
          ],
        },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Serious or repeated violations may result in permanent restriction of your account.',
            },
          ],
        },
      ],
    },
    {
      title: 'External systems and third-party services',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Student App integrates with supported university systems and public academic resources to display course, schedule, and event information. The availability and accuracy of that data depends on those external sources. We are not responsible for the content, availability, or policies of third-party systems or services.',
            },
          ],
        },
      ],
    },
    {
      title: 'Intellectual property',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'The Student App software, branding, and site content are owned by Schoen Cyber Solutions LLC or its licensors. University names and marks remain the property of their respective institutions; their use here is descriptive only.',
            },
          ],
        },
      ],
    },
    {
      title: 'Service availability and changes',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'We work to keep Student App reliable, but we do not guarantee uninterrupted or error-free operation. Features may change, be suspended, or be discontinued over time. We may update these terms; continued use of the app after changes take effect constitutes acceptance.',
            },
          ],
        },
      ],
    },
    {
      title: 'Account deletion and termination',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'You can delete your account at any time from within the app. Deletion removes or anonymizes your personal data as described in our ',
            },
            { text: 'Privacy Policy', doc: 'privacy' },
            { text: '. We may also suspend or terminate accounts that violate these terms.' },
          ],
        },
      ],
    },
    {
      title: 'Disclaimers',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Student App is provided "as is" and "as available" without warranties of any kind, express or implied, to the maximum extent permitted by law. We do not warrant that academic or event information is complete, accurate, or current.',
            },
          ],
        },
      ],
    },
    {
      title: 'Limitation of liability',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'To the maximum extent permitted by law, Schoen Cyber Solutions LLC will not be liable for indirect, incidental, consequential, or punitive damages, or for lost data, lost profits, or missed academic deadlines arising from your use of the app.',
            },
          ],
        },
      ],
    },
    {
      title: 'Governing law',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'These terms are governed by the laws of the State of Illinois, United States, without regard to conflict-of-law principles.',
            },
          ],
        },
      ],
    },
    {
      title: 'Contact',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            { text: 'Questions about these terms: ' },
            { text: CONTACT_EMAIL, url: `mailto:${CONTACT_EMAIL}` },
          ],
        },
        {
          type: 'paragraph',
          segments: [{ text: 'Schoen Cyber Solutions LLC' }],
        },
      ],
    },
  ],
};

const PRIVACY: LegalDocument = {
  id: 'privacy',
  title: 'Privacy Policy',
  intro:
    'This Privacy Policy explains what information Student App collects, how it is used, and the choices you have. Student App is operated by Schoen Cyber Solutions LLC.',
  effectiveDate: 'October 12, 2026',
  sections: [
    {
      title: 'Overview',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Student App is a mobile application that brings together class schedules, campus events, academic information, and student communities. This policy applies to the Student App mobile application and its supporting backend services.',
            },
          ],
        },
        {
          type: 'paragraph',
          segments: [
            {
              text: "We aim to collect and retain only the information needed to provide the application's features.",
            },
          ],
        },
      ],
    },
    {
      title: 'Information we collect',
      blocks: [
        { type: 'subheading', text: 'Account and login data' },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'To create and secure your account, we store your chosen username, optional profile details you provide (such as display name, bio, or program of study), and session data used to keep you signed in. We also record the date and time and the version of the Terms of Service you accepted at registration.',
            },
          ],
        },
        { type: 'subheading', text: 'Email verification' },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'We verify that you control a university email address before completing registration. Verification codes and the associated email address are processed for this purpose. Verification confirms control of the email address; it is not, by itself, proof of enrollment.',
            },
          ],
        },
        { type: 'subheading', text: 'University affiliation and academic setup' },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'When you select your institution, academic term, program, and course sections, we store those selections so the app can build your schedule and grant access to the correct communities.',
            },
          ],
        },
        { type: 'subheading', text: 'Course and schedule data' },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Official course offerings, section details, and academic calendar information are retrieved from supported university systems and public academic sources. Your specific section selections are stored as part of your account.',
            },
          ],
        },
        { type: 'subheading', text: 'Calendar data' },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Personal events you create are stored with your account. If you choose to connect an external calendar (for example, a learning management system feed), we access that data only to display and synchronize your events. External calendar credentials and feed addresses are stored in encrypted form where they are retained at all.',
            },
          ],
        },
        { type: 'subheading', text: 'Community content' },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Messages, posts, replies, and other content you create in student communities are stored so they can be displayed to other members of those communities.',
            },
          ],
        },
        { type: 'subheading', text: 'Uploaded images' },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Images you attach to messages are stored in private object storage and are served only through the app to authorized users. When content or your account is deleted, the associated files are scheduled for removal.',
            },
          ],
        },
        { type: 'subheading', text: 'Reports, moderation, and blocks' },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'If you report content or block another user, we store those records to enforce your preferences and moderate the platform. Moderation actions, suspensions, and related audit records are retained to protect the community and platform integrity.',
            },
          ],
        },
        { type: 'subheading', text: 'Technical data' },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Our servers process standard technical information such as IP addresses and request metadata for security, abuse prevention, rate limiting, and operational monitoring. We do not run advertising or behavioral tracking in the app.',
            },
          ],
        },
      ],
    },
    {
      title: 'How we use information',
      blocks: [
        {
          type: 'bullets',
          items: [
            'Provide and operate the app features you use',
            'Verify your university email and configure your academic setup',
            'Display your schedule, events, and community content',
            'Enforce community guidelines, reports, blocks, and suspensions',
            'Maintain the security and reliability of the service',
            'Respond to support and privacy requests',
          ],
        },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'We do not sell your personal information, and we do not use it for advertising.',
            },
          ],
        },
      ],
    },
    {
      title: 'User-generated content vs. university data',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Content you create (messages, images, profile details, personal events) is your content stored on our systems. Course catalogs, schedules, and campus event listings come from supported university systems and public academic sources; that source data is not your personal data and may be retained independently of your account.',
            },
          ],
        },
      ],
    },
    {
      title: 'Third-party service providers',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'We use a small number of service providers to operate Student App, including cloud infrastructure and database hosting, a private S3-compatible object store for uploaded images, a transactional email provider for verification emails, and in-memory data services for caching and rate limiting. These providers process data only as needed to deliver their services to us.',
            },
          ],
        },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Optional connections you configure, such as a university learning management system calendar feed, are fetched on your behalf and used only to provide the related feature.',
            },
          ],
        },
      ],
    },
    {
      title: 'Data retention',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'We retain account information while your account is active. Moderation and audit records may be retained after account deletion in anonymized form where needed for platform integrity. Server logs and security data are retained for limited operational periods.',
            },
          ],
        },
      ],
    },
    {
      title: 'Account deletion',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'You can delete your account directly from within Student App. When an account is deleted, your personal profile data, sessions, verification data, enrollments, calendar data, and uploaded media are removed or scheduled for removal. Community content you created may remain visible under an anonymized "Deleted User" attribution so existing discussions stay intact, and moderation audit records may be retained in anonymized form.',
            },
          ],
        },
        {
          type: 'paragraph',
          segments: [
            {
              text: 'If you cannot access your account and need help with deletion, contact us and we will assist you.',
            },
          ],
        },
      ],
    },
    {
      title: 'Your rights and privacy requests',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: "Depending on where you live, you may have rights to access, correct, export, or delete your personal information. The app's account controls cover the most common actions directly; for anything else, contact us and we will respond within a reasonable timeframe.",
            },
          ],
        },
      ],
    },
    {
      title: 'Children and minors',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Student App is intended for university students. It is not directed at children under 13, and we do not knowingly collect personal information from children under 13.',
            },
          ],
        },
      ],
    },
    {
      title: 'Security',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'We take reasonable technical and organizational measures to protect your information, including encrypted transport, private media storage, access controls, and limited data retention. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
            },
          ],
        },
      ],
    },
    {
      title: 'Independence from universities',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'Student App is developed and operated independently by Schoen Cyber Solutions LLC. It is not affiliated with, endorsed by, sponsored by, or operated by Roosevelt University, Illinois Institute of Technology, or any other educational institution unless explicitly stated otherwise.',
            },
          ],
        },
      ],
    },
    {
      title: 'Changes to this policy',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            {
              text: 'We may update this Privacy Policy as the app and its features evolve. Material changes will be reflected on this page with an updated effective date.',
            },
          ],
        },
      ],
    },
    {
      title: 'Contact',
      blocks: [
        {
          type: 'paragraph',
          segments: [
            { text: 'Privacy questions and requests: ' },
            { text: CONTACT_EMAIL, url: `mailto:${CONTACT_EMAIL}` },
          ],
        },
        {
          type: 'paragraph',
          segments: [{ text: 'Schoen Cyber Solutions LLC' }],
        },
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDocId, LegalDocument> = {
  terms: TERMS,
  privacy: PRIVACY,
};
