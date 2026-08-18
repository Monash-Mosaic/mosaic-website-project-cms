function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);

  if (!sheet) {
    throw new Error(`Sheet "${name}" was not found.`);
  }

  return sheet;
}

function getRowsAsObjects_(sheetName) {
  const sheet = getSheet_(sheetName);

  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const headers = values[0];

  return values.slice(1).map((row, index) => {
    const obj = {
      _row: index + 2
    };

    headers.forEach((header, columnIndex) => {
      obj[header] = row[columnIndex];
    });

    return obj;
  });
}

function generateId_(prefix) {
  return `${prefix}-${Utilities.getUuid()}`;
}

function now_() {
  return new Date();
}