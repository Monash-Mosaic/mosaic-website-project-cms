function submitForApproval(versionId) {

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const user = requireCreator_();

    const versionsSheet =
      getSheet_(CONFIG.SHEETS.VERSIONS);

    const versions =
      getRowsAsObjects_(CONFIG.SHEETS.VERSIONS);

    const version = versions.find(
      row => row.versionId === versionId
    );

    if (!version) {
      throw new Error(
        'Project version not found.'
      );
    }

    if (
      version.status !== CONFIG.STATUS.DRAFT &&
      version.status !== CONFIG.STATUS.REJECTED
    ) {
      throw new Error(
        'Only draft or rejected versions can be submitted.'
      );
    }

    versionsSheet
      .getRange(version._row, 9)
      .setValue(CONFIG.STATUS.PENDING);

    versionsSheet
      .getRange(version._row, 11)
      .setValue(user.email);

    versionsSheet
      .getRange(version._row, 12)
      .setValue(now_());

    writeAudit_(
      user.email,
      'SUBMIT_FOR_APPROVAL',
      version.projectId,
      version.versionId,
      'Submitted for approval'
    );

    return {
      success: true
    };

  } finally {

    lock.releaseLock();

  }
}

function approveVersion(versionId) {

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const user = requireAdmin_();

    const versions =
      getRowsAsObjects_(CONFIG.SHEETS.VERSIONS);

    const version = versions.find(
      row => row.versionId === versionId
    );

    if (!version) {
      throw new Error('Version not found.');
    }

    if (
      version.status !== CONFIG.STATUS.PENDING
    ) {
      throw new Error(
        'Only pending versions can be approved.'
      );
    }

    const versionsSheet =
      getSheet_(CONFIG.SHEETS.VERSIONS);

    versionsSheet
      .getRange(version._row, 9)
      .setValue(CONFIG.STATUS.APPROVED);

    versionsSheet
      .getRange(version._row, 13)
      .setValue(user.email);

    versionsSheet
      .getRange(version._row, 14)
      .setValue(now_());


    const projects =
      getRowsAsObjects_(CONFIG.SHEETS.PROJECTS);

    const project = projects.find(
      row => row.projectId === version.projectId
    );

    if (!project) {
      throw new Error('Project not found.');
    }

    const projectsSheet =
      getSheet_(CONFIG.SHEETS.PROJECTS);


    if (
      version.changeType ===
      CONFIG.CHANGE_TYPE.ARCHIVE
    ) {

      projectsSheet
        .getRange(project._row, 5)
        .setValue(true);

    } else {

      projectsSheet
        .getRange(project._row, 2)
        .setValue(version.version);

    }


    writeAudit_(
      user.email,
      'APPROVE',
      version.projectId,
      version.versionId,
      'Project version approved'
    );

    return {
      success: true
    };

  } finally {

    lock.releaseLock();

  }
}

function rejectVersion(
  versionId,
  rejectionReason
) {

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const user = requireAdmin_();

    if (
      !rejectionReason ||
      !String(rejectionReason).trim()
    ) {
      throw new Error(
        'A rejection reason is required.'
      );
    }

    const versions =
      getRowsAsObjects_(CONFIG.SHEETS.VERSIONS);

    const version = versions.find(
      row => row.versionId === versionId
    );

    if (!version) {
      throw new Error('Version not found.');
    }

    if (
      version.status !== CONFIG.STATUS.PENDING
    ) {
      throw new Error(
        'Only pending versions can be rejected.'
      );
    }

    const sheet =
      getSheet_(CONFIG.SHEETS.VERSIONS);

    sheet
      .getRange(version._row, 9)
      .setValue(CONFIG.STATUS.REJECTED);

    sheet
      .getRange(version._row, 15)
      .setValue(
        String(rejectionReason).trim()
      );

    writeAudit_(
      user.email,
      'REJECT',
      version.projectId,
      version.versionId,
      rejectionReason
    );

    return {
      success: true
    };

  } finally {

    lock.releaseLock();

  }
}

function requestArchive(projectId) {

  const lock =
    LockService.getScriptLock();

  lock.waitLock(10000);

  try {

    const user =
      requireCreator_();


    const projects =
      getRowsAsObjects_(
        CONFIG.SHEETS.PROJECTS
      );

    const project = projects.find(
      p => p.projectId === projectId
    );

    if (!project) {
      throw new Error(
        'Project not found.'
      );
    }


    if (
      String(project.archived)
        .toUpperCase() === 'TRUE'
    ) {
      throw new Error(
        'Project is already archived.'
      );
    }


    const versions =
      getRowsAsObjects_(
        CONFIG.SHEETS.VERSIONS
      );

    const projectVersions =
      versions
        .filter(
          v =>
            v.projectId === projectId
        )
        .sort(
          (a, b) =>
            Number(b.version) -
            Number(a.version)
        );


    const pending =
      projectVersions.find(
        v =>
          v.status ===
          CONFIG.STATUS.PENDING
      );

    if (pending) {
      throw new Error(
        'This project already has a pending approval request.'
      );
    }


    let sourceVersion;

    if (project.currentVersion !== '') {

      sourceVersion =
        projectVersions.find(
          v =>
            Number(v.version) ===
            Number(project.currentVersion)
        );

    } else {

      sourceVersion =
        projectVersions[0];

    }


    if (!sourceVersion) {
      throw new Error(
        'Unable to determine project version.'
      );
    }


    const nextVersion =
      Math.max(
        ...projectVersions.map(
          v => Number(v.version)
        )
      ) + 1;


    const versionId =
      generateId_('VER');

    const createdAt =
      now_();


    const versionsSheet =
      getSheet_(
        CONFIG.SHEETS.VERSIONS
      );


    versionsSheet.appendRow([
      versionId,
      projectId,
      nextVersion,

      sourceVersion.name,
      sourceVersion.subtitle || '',
      sourceVersion.description,
      sourceVersion.imageFileId,
      sourceVersion.imageUrl,
      sourceVersion.link,

      CONFIG.STATUS.PENDING,

      CONFIG.CHANGE_TYPE.ARCHIVE,

      user.email,
      createdAt,

      '',
      '',
      '',
      createdAt
    ]);


    writeAudit_(
      user.email,
      'REQUEST_ARCHIVE',
      projectId,
      versionId,
      'Requested project archive'
    );


    return {
      success: true
    };

  } finally {

    lock.releaseLock();

  }
}