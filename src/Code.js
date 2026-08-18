function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('MOSAIC Website Projects CMS');
}