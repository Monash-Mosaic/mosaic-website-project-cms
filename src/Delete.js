function deleteRowsByPredicate_(sheetName, predicate) {
  const sheet = getSheet_(sheetName);
  const rows = getRowsAsObjects_(sheetName);

  const rowNumbers = rows
    .filter(predicate)
    .map(row => row._row)
    .sort((a, b) => b - a);

  rowNumbers.forEach(rowNumber => {
    sheet.deleteRow(rowNumber);
  });

  return rowNumbers.length;
}

function deleteProjectImages_(projectId) {
  const versions = getRowsAsObjects_(CONFIG.SHEETS.VERSIONS)
    .filter(version => version.projectId === projectId);

  const fileIds = versions
    .map(version => String(version.imageFileId || '').trim())
    .filter(Boolean);

  const uniqueFileIds = [...new Set(fileIds)];

  uniqueFileIds.forEach(fileId => {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch (error) {
      // Ignore missing or inaccessible files.
    }
  });
}

function deleteProject(projectId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const user = requireAdmin_();

    const normalizedProjectId =
      String(projectId || '').trim();

    if (!normalizedProjectId) {
      throw new Error('Project ID is required.');
    }

    const projects = getRowsAsObjects_(CONFIG.SHEETS.PROJECTS);
    const project = projects.find(
      row => row.projectId === normalizedProjectId
    );

    if (!project) {
      throw new Error('Project not found.');
    }

    deleteProjectImages_(normalizedProjectId);

    const deletedVersions = deleteRowsByPredicate_(
      CONFIG.SHEETS.VERSIONS,
      row => row.projectId === normalizedProjectId
    );

    deleteRowsByPredicate_(
      CONFIG.SHEETS.AUDIT,
      row => row.projectId === normalizedProjectId
    );

    getSheet_(CONFIG.SHEETS.PROJECTS)
      .deleteRow(project._row);

    writeAudit_(
      user.email,
      'DELETE',
      normalizedProjectId,
      '',
      `Deleted project and ${deletedVersions} version(s)`
    );

    return {
      success: true
    };

  } finally {
    lock.releaseLock();
  }
}
