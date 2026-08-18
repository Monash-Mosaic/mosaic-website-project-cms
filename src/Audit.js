function writeAudit_(
  user,
  action,
  projectId,
  versionId,
  details
) {

  const sheet = getSheet_(CONFIG.SHEETS.AUDIT);

  sheet.appendRow([
    now_(),
    user,
    action,
    projectId || '',
    versionId || '',
    details || ''
  ]);
}