# SOP: Lead row

## Goal

Append one row per booking to the "Leads" tab of the lead sheet, in the column order fixed by the Data Schema in `CLAUDE.md`.

## Tool

`execution/lead_row.js`:

- `buildLeadRow(booking, event, bookedAt)`: pure; returns the ten values in schema order.
- `appendLeadRow(row)`: appends through the Sheets API and returns `{ spreadsheet_id, row_number }`.

## Tool logic

1. `booked_at`, `slot_start`, `slot_end` are ISO 8601 with the Toronto offset.
2. Append to `Leads!A:J` with `valueInputOption=RAW` and `insertDataOption=INSERT_ROWS`. RAW stores every value as typed text, so a visitor who types `=SUM(...)` gets text, not a formula.
3. The row number comes from the `updatedRange` Google returns (for example `Leads!A7:J7` is row 7).

## Edge cases

- **Sheet renamed, deleted or tab renamed:** the append fails; the booking stands; the log has the error. The tab must stay named `Leads`.
- **Columns reordered by hand in the sheet:** values land under the wrong headings. The header row is the contract; do not reorder it.

## Lessons

None yet.
