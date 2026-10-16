/**
 * Emy contextual help — short, static tips keyed by screen. Emy is a guide,
 * not a chatbot: each screen gets at most a few concise tips, shown on
 * demand when the user taps the Emy button.
 *
 * No Email-specific tips yet — email screens intentionally have no key.
 */

export type EmyScreenKey =
  | 'home'
  | 'calendar'
  | 'courses'
  | 'events'
  | 'communities'
  | 'settings';

export interface EmyScreenHelp {
  title: string;
  tips: string[];
}

export const EMY_HELP: Record<EmyScreenKey, EmyScreenHelp> = {
  home: {
    title: 'Home',
    tips: [
      'Home shows what matters today — your next classes, events, and updates.',
      'Use the tabs below to move between Home, Calendar, and Chat.',
      'Tap the menu icon (top left) for Profile, Academic Setup, Campus Events, and Settings.',
    ],
  },
  calendar: {
    title: 'Calendar',
    tips: [
      'Switch between Day, Week, and Month to view your schedule differently.',
      'Your course schedule appears automatically after Academic Setup.',
      'Tap + to add a personal event — it never affects your official course data.',
    ],
  },
  courses: {
    title: 'Academic Setup',
    tips: [
      'Search for your courses and pick the exact sections you attend.',
      'Your selected sections build your schedule and unlock course communities.',
      'Professor details appear on course pages when the university publishes them.',
    ],
  },
  events: {
    title: 'Campus Events',
    tips: [
      'Browse student and university events for your campus.',
      'Tap an event for details, then open its location in Maps.',
      'Save events to your personal calendar so you don\'t miss them.',
    ],
  },
  communities: {
    title: 'Communities',
    tips: [
      'Each course section has a community for questions and discussion.',
      'Start a thread, or reply to keep a conversation in one place.',
      'You can report content or block a user anytime — be kind and stay on topic.',
    ],
  },
  settings: {
    title: 'Settings & Account',
    tips: [
      'Manage your profile, academic setup, and calendar preferences here.',
      'You can review your privacy options or log out from this screen.',
      'Deleting your account is permanent — your university data stays safe.',
    ],
  },
};

export const ABOUT_EMY =
  'Emy is your guide inside Study with Emy. Tap Emy whenever you need a quick ' +
  'explanation of the screen you\'re using.';
