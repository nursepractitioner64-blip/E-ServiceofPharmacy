# Branch ID editing fix

- Admin can edit the existing `BRANCH_ID` and branch name from Branch Management.
- The server rejects blank IDs, IDs longer than 60 characters, malformed IDs, and duplicate IDs.
- When an ID changes, the server updates exact references in `BRANCH_IDS` assignments and sheets containing a `BRANCH_ID` column, and updates the legacy `BRANCHES` master if present.
- Sheets whose names indicate vaccine, vaccination, or immunization are explicitly skipped.
- Existing branch data is not deleted automatically. Back up the spreadsheet before changing a branch ID.
- The edit UI submits the new ID in the PATCH request; the server remains authoritative for duplicate validation.
