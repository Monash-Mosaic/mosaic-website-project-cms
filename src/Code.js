function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('MOSAIC Website Project CMS');
}