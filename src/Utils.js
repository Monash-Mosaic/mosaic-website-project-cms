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

  const headers = values[0].map(header =>
    String(header || '').trim()
  );

  return values.slice(1).map((row, index) => {
    const obj = {
      _row: index + 2
    };

    headers.forEach((header, columnIndex) => {
      if (!header) {
        return;
      }

      obj[header] = row[columnIndex];
    });

    return obj;
  });
}

function toClientPayload_(value) {
  return JSON.parse(
    JSON.stringify(value, function (key, nested) {
      if (nested === null || typeof nested === 'undefined') {
        return '';
      }

      if (typeof nested === 'number' && !isFinite(nested)) {
        return '';
      }

      if (
        typeof nested === 'object' &&
        Object.prototype.toString.call(nested) === '[object Date]'
      ) {
        return nested.toISOString();
      }

      return nested;
    })
  );
}

function getHeaderIndex_(sheetName, headerName) {
  const sheet = getSheet_(sheetName);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const index = headers.findIndex(
    header => String(header || '').trim() === headerName
  );

  if (index === -1) {
    throw new Error(
      `Column "${headerName}" was not found in sheet "${sheetName}".`
    );
  }

  return index + 1;
}

function setSheetValue_(sheetName, row, headerName, value) {
  const sheet = getSheet_(sheetName);
  const column = getHeaderIndex_(sheetName, headerName);
  sheet.getRange(row, column).setValue(value);
}

function generateId_(prefix) {
  return `${prefix}-${Utilities.getUuid()}`;
}

function now_() {
  return new Date();
}