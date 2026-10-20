import { describe, expect, it } from 'vitest';
import { LEGAL_DOCUMENTS, LegalBlock } from '@/constants/legalDocuments';

describe('bundled legal documents', () => {
  it('ships terms and privacy', () => {
    expect(Object.keys(LEGAL_DOCUMENTS).sort()).toEqual(['privacy', 'terms']);
    for (const doc of Object.values(LEGAL_DOCUMENTS)) {
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.effectiveDate.length).toBeGreaterThan(0);
      expect(doc.sections.length).toBeGreaterThan(0);
    }
  });

  it('in-app Terms match the version recorded at registration', () => {
    // Must equal TERMS_OF_SERVICE_VERSION in
    // student-backend/src/services/emailVerification.ts — bumping the
    // backend version requires updating this document (and vice versa).
    expect(LEGAL_DOCUMENTS.terms.acceptanceVersion).toBe('2026-10-19');
  });

  it('contains only well-formed blocks', () => {
    for (const doc of Object.values(LEGAL_DOCUMENTS)) {
      for (const section of doc.sections) {
        expect(section.title.length).toBeGreaterThan(0);
        for (const block of section.blocks as LegalBlock[]) {
          if (block.type === 'bullets') {
            expect(block.items.length).toBeGreaterThan(0);
          } else if (block.type === 'paragraph') {
            expect(block.segments.length).toBeGreaterThan(0);
            for (const seg of block.segments) {
              expect(seg.text.length).toBeGreaterThan(0);
            }
          } else {
            expect(block.text.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('Terms links back to the bundled privacy document', () => {
    const links = LEGAL_DOCUMENTS.terms.sections
      .flatMap((s) => s.blocks)
      .flatMap((b) => (b.type === 'paragraph' ? b.segments : []))
      .filter((seg) => seg.doc === 'privacy');
    expect(links.length).toBe(1);
  });
});
