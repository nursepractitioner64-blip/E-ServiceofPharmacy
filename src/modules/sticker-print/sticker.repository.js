const { getSheets, getSpreadsheetId } =
  require("../../config/google");

exports.getMovement = async () => {

  const sheets = await getSheets();

  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: "INVENTORY_MOVEMENT!A1:P"
    });

  const rows =
    response.data.values || [];

  if (rows.length <= 1) {
    return [];
  }

  const headers = rows[0];

  return rows
    .slice(1)
    .map(row => {

      const obj = {};

      headers.forEach((header, index) => {
        obj[header] = row[index] ?? "";
      });

      return obj;

    });
};