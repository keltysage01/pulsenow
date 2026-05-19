# Pulsenow Qualifier Storage Decision

## Decision

For v1, Pulsenow will store contact qualifier answers as a JSON map keyed by stable qualifier ids.

```json
{
  "married_spouse": "unknown",
  "age_25_plus": "unknown",
  "has_children": "unknown",
  "homeowner": "unknown"
}
```

Each value must be one of:

- `yes`
- `no`
- `unknown`

## Rationale

This shape supports tri-state capture without forcing the Phase 1 and early Contacts builds into a heavier relational model. It lets the product capture meaningful qualification answers immediately while still allowing fast iteration on which qualifiers matter, how they are labeled in the UI, and how they are collected.

Using stable keys keeps the data consistent across imports, forms, automation rules, and future reporting work. The JSON map is also flexible enough to add or retire qualifier ids without a schema migration for every early product change.

## Stable v1 Keys

- `married_spouse`
- `age_25_plus`
- `has_children`
- `homeowner`

## Future Migration Path

If qualifier reporting, filtering, segmentation, or cross-account analytics become heavier, Pulsenow can migrate this JSON map into a normalized join table later. The stable qualifier ids should be preserved so historical data can be transformed cleanly into rows such as contact id, qualifier id, answer, source, and captured timestamp.

