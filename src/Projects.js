function createProject(form) {

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {

    const user = requireCreator_();

    if (!form.name || !String(form.name).trim()) {
      throw new Error('Project name is required.');
    }

    if (
      !form.description ||
      !String(form.description).trim()
    ) {
      throw new Error(
        'Project description is required.'
      );
    }

    if (!form.link || !String(form.link).trim()) {
      throw new Error('Project link is required.');
    }

    if (!form.image) {
      throw new Error('Project image is required.');
    }

    const projectId =
      generateId_('PRJ');

    const versionId =
      generateId_('VER');

    const image = saveProjectImage_(
      form.image,
      projectId
    );

    const createdAt = now_();

    const projectsSheet =
      getSheet_(CONFIG.SHEETS.PROJECTS);

    projectsSheet.appendRow([
      projectId,
      '',
      createdAt,
      user.email,
      false
    ]);

    const versionsSheet =
      getSheet_(CONFIG.SHEETS.VERSIONS);

    versionsSheet.appendRow([
      versionId,
      projectId,
      1,
      String(form.name).trim(),
      String(form.description).trim(),
      image.fileId,
      '',
      String(form.link).trim(),
      CONFIG.STATUS.DRAFT,
      CONFIG.CHANGE_TYPE.CREATE,
      user.email,
      '',
      '',
      '',
      '',
      createdAt
    ]);

    writeAudit_(
      user.email,
      'CREATE_DRAFT',
      projectId,
      versionId,
      `Created project "${form.name}"`
    );

    return {
      success: true,
      projectId,
      versionId
    };

  } finally {

    lock.releaseLock();

  }
}

function getDashboardProjects() {
  const user = getCurrentUser_();

  const projects = getRowsAsObjects_(CONFIG.SHEETS.PROJECTS);
  const versions = getRowsAsObjects_(CONFIG.SHEETS.VERSIONS);

  const result = projects
    .map(project => {

      const projectVersions = versions
        .filter(v => v.projectId === project.projectId)
        .sort((a, b) => Number(b.version) - Number(a.version));

      if (projectVersions.length === 0) {
        return null;
      }

      // Latest version is what the CMS user sees.
      const latestVersion = projectVersions[0];

      // Current approved/live version.
      let liveVersion = null;

      if (project.currentVersion !== '') {
        liveVersion = projectVersions.find(
          v =>
            Number(v.version) ===
            Number(project.currentVersion)
        );
      }

      return {
        projectId: project.projectId,

        archived:
          String(project.archived).toUpperCase() === 'TRUE',

        latestVersionId: latestVersion.versionId,
        latestVersion: Number(latestVersion.version),

        name: latestVersion.name,
        description: latestVersion.description,

        imageFileId: latestVersion.imageFileId,
        imageUrl: getProjectImageUrl_(
          latestVersion.imageFileId
        ),

        link: latestVersion.link,

        status: latestVersion.status,
        changeType: latestVersion.changeType,

        currentVersion:
          project.currentVersion === ''
            ? null
            : Number(project.currentVersion),

        isLive: Boolean(liveVersion),

        createdAt: project.createdAt
          ? String(project.createdAt)
          : '',

        submittedBy:
          latestVersion.submittedBy || '',

        approvedBy:
          latestVersion.approvedBy || '',

        rejectionReason:
          latestVersion.rejectionReason || ''
      };

    })
    .filter(Boolean);

  return {
    user: user,
    projects: result
  };
}

function updateProject(form) {

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {

    const user = requireCreator_();

    const projectId =
      String(form.projectId || '').trim();

    if (!projectId) {
      throw new Error('Project ID is required.');
    }

    if (!form.name || !String(form.name).trim()) {
      throw new Error('Project name is required.');
    }

    if (
      !form.description ||
      !String(form.description).trim()
    ) {
      throw new Error(
        'Project description is required.'
      );
    }

    if (!form.link || !String(form.link).trim()) {
      throw new Error('Project link is required.');
    }


    const projects =
      getRowsAsObjects_(CONFIG.SHEETS.PROJECTS);

    const project = projects.find(
      p => p.projectId === projectId
    );

    if (!project) {
      throw new Error('Project not found.');
    }


    const allVersions =
      getRowsAsObjects_(CONFIG.SHEETS.VERSIONS);

    const projectVersions = allVersions
      .filter(v => v.projectId === projectId)
      .sort(
        (a, b) =>
          Number(b.version) - Number(a.version)
      );

    if (projectVersions.length === 0) {
      throw new Error(
        'No project versions were found.'
      );
    }


    const pendingVersion =
      projectVersions.find(v =>
        v.status === CONFIG.STATUS.PENDING
      );

    if (pendingVersion) {
      throw new Error(
        'This project already has a version awaiting approval.'
      );
    }


    const latestVersion =
      projectVersions[0];

    const nextVersionNumber =
      Number(latestVersion.version) + 1;

    const versionId =
      generateId_('VER');


    let imageFileId =
      latestVersion.imageFileId;

    let imageUrl =
      latestVersion.imageUrl || '';


    // Image is optional when updating.
    if (
      form.image &&
      typeof form.image.getBytes === 'function' &&
      form.image.getBytes().length > 0
    ) {

      const newImage =
        saveProjectImage_(
          form.image,
          projectId
        );

      imageFileId =
        newImage.fileId;

      imageUrl = '';
    }


    const createdAt = now_();

    const versionsSheet =
      getSheet_(CONFIG.SHEETS.VERSIONS);


    versionsSheet.appendRow([
      versionId,
      projectId,
      nextVersionNumber,

      String(form.name).trim(),

      String(form.description).trim(),

      imageFileId,
      imageUrl,

      String(form.link).trim(),

      CONFIG.STATUS.DRAFT,

      CONFIG.CHANGE_TYPE.UPDATE,

      user.email,

      '',
      '',
      '',
      '',
      createdAt
    ]);


    writeAudit_(
      user.email,
      'CREATE_UPDATE_DRAFT',
      projectId,
      versionId,
      `Created update version ${nextVersionNumber}`
    );


    return {
      success: true,
      projectId: projectId,
      versionId: versionId
    };

  } finally {

    lock.releaseLock();

  }
}

