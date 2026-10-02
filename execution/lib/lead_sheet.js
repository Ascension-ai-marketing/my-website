// The lead sheet's shape. Column order is the Data Schema in CLAUDE.md ("Lead sheet row").
export const LEAD_SHEET_TITLE = 'Website Leads';
export const LEAD_SHEET_TAB = 'Leads';
export const LEAD_SHEET_COLUMNS = [
  'booked_at',
  'slot_start',
  'slot_end',
  'name',
  'email',
  'phone',
  'company_or_website',
  'message',
  'event_id',
  'meet_link',
];

// Request body for the Sheets API spreadsheets.create call: one tab with the header row.
export function buildLeadSheetRequest() {
  return {
    properties: { title: LEAD_SHEET_TITLE },
    sheets: [
      {
        properties: { title: LEAD_SHEET_TAB, gridProperties: { frozenRowCount: 1 } },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: LEAD_SHEET_COLUMNS.map((column) => ({
                  userEnteredValue: { stringValue: column },
                  userEnteredFormat: { textFormat: { bold: true } },
                })),
              },
            ],
          },
        ],
      },
    ],
  };
}
