function doGet(e) {
  const action = e && e.parameter
    ? e.parameter.action
    : '';

  if (action === 'projects') {
    return getPublishedProjectsResponse_();
  }

  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Project CMS');
}