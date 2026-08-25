# Legacy content migration

The migration reads the two legacy SQLite databases without modifying them and
generates deterministic application artifacts.

## Commands

- `npm run content:proof` regenerates the small regression fixture.
- `npm run content:migrate` regenerates all 366 bilingual readings, QA reports,
  and the versioned offline runtime library under `public/content`.
- `npm run test:content` verifies the proof fixture.
- `npm run test:content:full` verifies the full generated library.

## Editorial corrections

Approved source repairs belong in `corrections.json`; never edit the databases
or generated output by hand. Each entry must provide:

```json
{
  "key": "ro-019-encoding-1",
  "locale": "ro",
  "id": 19,
  "field": "lesson",
  "find": "exact source fragment",
  "replace": "approved replacement",
  "reason": "Editorial approval reference"
}
```

The converter requires `find` to occur exactly once and fails when any declared
correction is not applied. The correction-manifest checksum participates in the
content version. The known Romanian replacement characters remain reported and
unchanged until their intended text receives editorial approval.

## Runtime library

Production content is split into 12 month files per locale plus one search index
per locale. The runtime files omit source checksums, validation records, fallback
copies, and duplicated plain text. No file may exceed 1 MiB and the complete
runtime library may not exceed 12 MiB uncompressed. The root manifest identifies
the active content version and gives the URL, byte size, and SHA-256 checksum for
every file.
