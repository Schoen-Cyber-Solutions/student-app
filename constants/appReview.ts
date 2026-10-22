/**
 * The email address Apple's App Review team enters during review.
 *
 * NOT a secret — it is also printed in App Store Connect review notes.
 * What it does: when this address is entered, the verification-code field
 * relaxes into a paste-friendly text field so the reviewer can paste the
 * high-entropy review credential issued for them. The credential itself is
 * never in this repo; it is verified server-side and the whole path is
 * inert unless the backend enables it via environment configuration.
 */
export const APP_REVIEW_EMAIL = 'applereview@review.studywithemy.dev';
