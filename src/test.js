function testSetup() {

  console.log(
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getName()
  );

  console.log(
    DriveApp
      .getFolderById(
        CONFIG.IMAGE_FOLDER_ID
      )
      .getName()
  );

}