'use strict';

const { LANDMARK_ROLES, ALL_LANDMARK_ROLES } = require('../../../lib/utils/landmark-roles');

describe('ALL_LANDMARK_ROLES', () => {
  it('contains exactly the 8 WAI-ARIA 1.2 §5.3.4 landmark roles', () => {
    expect([...ALL_LANDMARK_ROLES].sort()).toEqual([
      'banner',
      'complementary',
      'contentinfo',
      'form',
      'main',
      'navigation',
      'region',
      'search',
    ]);
  });

  it('excludes DPub-ARIA doc-* roles', () => {
    for (const role of ALL_LANDMARK_ROLES) {
      expect(role.startsWith('doc-')).toBe(false);
    }
  });
});

describe('LANDMARK_ROLES (the statically-verifiable subset)', () => {
  it('is the 7-role subset of ALL_LANDMARK_ROLES excluding region', () => {
    expect([...LANDMARK_ROLES].sort()).toEqual([
      'banner',
      'complementary',
      'contentinfo',
      'form',
      'main',
      'navigation',
      'search',
    ]);
  });

  it('excludes region (cannot verify accessible-name presence statically)', () => {
    expect(LANDMARK_ROLES.has('region')).toBe(false);
    expect(ALL_LANDMARK_ROLES.has('region')).toBe(true);
  });

  it('excludes non-landmark roles (button, link, article)', () => {
    expect(LANDMARK_ROLES.has('button')).toBe(false);
    expect(LANDMARK_ROLES.has('link')).toBe(false);
    expect(LANDMARK_ROLES.has('article')).toBe(false);
  });
});
