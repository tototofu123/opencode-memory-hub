# Memory Hub Test Questions

Use these in a new OpenCode session to validate behavior.

## Basic Save/List Load

1. `/memory-save title:Auth Fix category:backend tags:auth,jwt content:Refresh token bug fixed by rotating token on each login and storing jti.`
2. `/memory-list auth`
3. `/memory-list auth --mode all`
4. `/memory-list 5`

## Preference Flow

5. `/memory-setting`
6. `/memory-setting summary`
7. `/memory-setting all`
8. `/memory-setting off`
9. `/memory-list auth` (should indicate memory loading is off unless mode is explicitly passed)
10. `/memory-list auth --mode summary`

## Category Filter

11. `/memory-save title:UI Polish category:frontend tags:ui,spacing content:Adjusted table spacing and row height for readability.`
12. `/memory-list category:frontend`

## Load By ID (full content)

13. `/memory-list id:1`

## New Sequential Layout (no args)

14. `/memory-list`

Expected structure:
- `SEQ1 GLOBAL_RECENT_10`
- `SEQ2 CURRENT_DIR_RECENT_2`
- `SEQ3 PATH_RELATED_RECENT_1`

Each memory result should be 2 lines:
- line 1 = `#id [relative-directory] title`
- line 2 = `summary: ... | latest: ...`
