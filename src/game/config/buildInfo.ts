export const PLAYTEST_BUILD_ID = 'RC-2026-03-28';
export const PLAYTEST_BUILD_LABEL = 'Release Candidate';
export const PLAYTEST_BUILD_SCOPE = 'Base game pham gioi | Chuong 1-4 + 3 ending';

export function getBuildInfoLine(): string {
  return `${PLAYTEST_BUILD_LABEL} | ${PLAYTEST_BUILD_ID} | ${PLAYTEST_BUILD_SCOPE}`;
}
