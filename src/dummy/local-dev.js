(function () {

  const SCRIPT_BASE_URL = new URL(
    './',
    document.currentScript.src
  );

  const DATA_FILES = {
    projects: 'data/projects.json',
    versions: 'data/projectVersions.json',
    users: 'data/users.json',
    audit: 'data/auditLog.json'
  };

  let state = null;
  let loadPromise = null;


  function fetchJson(relativePath) {

    return fetch(
      new URL(relativePath, SCRIPT_BASE_URL).href
    )
      .then(response => {

        if (!response.ok) {
          throw new Error(
            `Failed to load dummy data (${response.status}).`
          );
        }

        return response.json();

      });

  }


  function isTrue(value) {
    return String(value).toUpperCase() === 'TRUE';
  }


  function getNowIso() {
    return new Date().toISOString();
  }


  function loadState() {

    if (state) {
      return Promise.resolve(state);
    }

    if (!loadPromise) {

      loadPromise = Promise.all([
        fetchJson(DATA_FILES.projects),
        fetchJson(DATA_FILES.versions),
        fetchJson(DATA_FILES.users),
        fetchJson(DATA_FILES.audit)
      ])
        .then(([projects, versions, users, audit]) => {

          state = {
            projects,
            versions,
            users,
            audit
          };

          return state;

        });

    }

    return loadPromise;

  }


  function getCurrentUser() {

    const activeUser = state.users.find(
      user => isTrue(user.active)
    );

    if (!activeUser) {
      throw new Error(
        'No active dummy user found in Users data.'
      );
    }

    return {
      email: String(activeUser.email).toLowerCase(),
      role: String(activeUser.role).toUpperCase()
    };

  }


  function getProjectVersions(projectId) {

    return state.versions
      .filter(version => version.projectId === projectId)
      .sort((a, b) => Number(b.version) - Number(a.version));

  }


  function buildDashboard() {

    const user = getCurrentUser();

    const projects = state.projects
      .map(project => {

        const projectVersions =
          getProjectVersions(project.projectId);

        if (!projectVersions.length) {
          return null;
        }

        const latestVersion = projectVersions[0];

        const liveVersion =
          project.currentVersion === '' ||
          project.currentVersion === null
            ? null
            : projectVersions.find(
                version =>
                  Number(version.version) ===
                  Number(project.currentVersion)
              ) || null;

        return {
          projectId: project.projectId,
          archived: isTrue(project.archived),
          latestVersionId: latestVersion.versionId,
          latestVersion: Number(latestVersion.version),
          name: latestVersion.name,
          description: latestVersion.description,
          imageFileId: latestVersion.imageFileId,
          imageUrl: latestVersion.imageUrl,
          link: latestVersion.link,
          status: latestVersion.status,
          changeType: latestVersion.changeType,
          currentVersion:
            project.currentVersion === '' ||
            project.currentVersion === null
              ? null
              : Number(project.currentVersion),
          isLive: Boolean(liveVersion),
          createdAt: String(project.createdAt || ''),
          submittedBy: latestVersion.submittedBy || '',
          approvedBy: latestVersion.approvedBy || '',
          rejectionReason:
            latestVersion.rejectionReason || ''
        };

      })
      .filter(Boolean)
      .sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt))
      );

    return {
      user,
      projects
    };

  }


  function appendAudit(
    userEmail,
    action,
    projectId,
    versionId,
    details
  ) {

    state.audit.push({
      timestamp: getNowIso(),
      user: userEmail,
      action,
      projectId: projectId || '',
      versionId: versionId || '',
      details: details || ''
    });

  }


  function generateId(prefix) {

    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  }


  function readForm(form) {

    const imageInput = form.image;
    const imageFile = imageInput?.files?.[0] || null;

    return {
      projectId: String(form.projectId?.value || '').trim(),
      name: String(form.name?.value || '').trim(),
      description: String(form.description?.value || '').trim(),
      link: String(form.link?.value || '').trim(),
      image: imageFile
    };

  }


  function findProject(projectId) {

    return state.projects.find(
      project => project.projectId === projectId
    );

  }


  function createRunner() {

    const runner = {

      _successHandler: null,
      _failureHandler: null,

      withSuccessHandler(handler) {
        this._successHandler = handler;
        return this;
      },

      withFailureHandler(handler) {
        this._failureHandler = handler;
        return this;
      },

      _resolve(value) {
        if (this._successHandler) {
          this._successHandler(value);
        }
      },

      _reject(error) {
        if (this._failureHandler) {
          this._failureHandler(error);
        }
      },

      getDashboardProjects() {

        loadState()
          .then(() => {
            this._resolve({
              user: buildDashboard().user,
              projects: buildDashboard().projects
            });
          })
          .catch(error => {
            this._reject(error);
          });

      },

      listUsers() {

        loadState()
          .then(() => {
            this._resolve(
              state.users.map(user => ({
                email: String(user.email).toLowerCase(),
                role: String(user.role).toUpperCase(),
                active: isTrue(user.active)
              }))
            );
          })
          .catch(error => {
            this._reject(error);
          });

      },

      createProject(form) {

        loadState()
          .then(() => {

            const values = readForm(form);
            const currentUser = getCurrentUser();

            if (!values.name) {
              throw new Error('Project name is required.');
            }

            if (!values.description) {
              throw new Error(
                'Project description is required.'
              );
            }

            if (!values.link) {
              throw new Error('Project link is required.');
            }

            if (!values.image) {
              throw new Error('Project image is required.');
            }

            const projectId = generateId('PRJ');
            const versionId = generateId('VER');
            const imageUrl = URL.createObjectURL(values.image);

            state.projects.unshift({
              projectId,
              currentVersion: '',
              createdAt: getNowIso(),
              createdBy: currentUser.email,
              archived: 'FALSE'
            });

            state.versions.unshift({
              versionId,
              projectId,
              version: 1,
              name: values.name,
              description: values.description,
              imageFileId: `dummy-${projectId}`,
              imageUrl,
              link: values.link,
              status: 'DRAFT',
              changeType: 'CREATE',
              submittedBy: '',
              submittedAt: '',
              approvedBy: '',
              approvedAt: '',
              rejectionReason: '',
              createdAt: getNowIso()
            });

            appendAudit(
              currentUser.email,
              'CREATE_DRAFT',
              projectId,
              versionId,
              `Created project "${values.name}"`
            );

            this._resolve({
              success: true,
              projectId,
              versionId
            });

          })
          .catch(error => {
            this._reject(error);
          });

      },

      updateProject(form) {

        loadState()
          .then(() => {

            const values = readForm(form);
            const project = findProject(values.projectId);
            const currentUser = getCurrentUser();

            if (!project) {
              throw new Error('Project not found.');
            }

            const projectVersions =
              getProjectVersions(values.projectId);

            const latestVersion = projectVersions[0];

            if (
              projectVersions.some(
                version =>
                  version.status === 'PENDING_APPROVAL'
              )
            ) {
              throw new Error(
                'This project already has a version awaiting approval.'
              );
            }

            const versionId = generateId('VER');
            const nextVersion =
              Number(latestVersion.version) + 1;

            let imageUrl = latestVersion.imageUrl;
            let imageFileId = latestVersion.imageFileId;

            if (values.image) {
              imageFileId = `dummy-${project.projectId}-${versionId}`;
              imageUrl = URL.createObjectURL(values.image);
            }

            state.versions.unshift({
              versionId,
              projectId: project.projectId,
              version: nextVersion,
              name: values.name,
              description: values.description,
              imageFileId,
              link: values.link,
              imageUrl,
              status: 'DRAFT',
              changeType: 'UPDATE',
              submittedBy: '',
              submittedAt: '',
              approvedBy: '',
              approvedAt: '',
              rejectionReason: '',
              createdAt: getNowIso()
            });

            appendAudit(
              currentUser.email,
              'CREATE_UPDATE_DRAFT',
              project.projectId,
              versionId,
              `Created update version ${nextVersion}`
            );

            this._resolve({
              success: true,
              projectId: project.projectId,
              versionId
            });

          })
          .catch(error => {
            this._reject(error);
          });

      },

      submitForApproval(versionId) {

        loadState()
          .then(() => {

            const version = state.versions.find(
              item => item.versionId === versionId
            );

            if (!version) {
              throw new Error('Project version not found.');
            }

            if (
              version.status !== 'DRAFT' &&
              version.status !== 'REJECTED'
            ) {
              throw new Error(
                'Only draft or rejected versions can be submitted.'
              );
            }

            version.status = 'PENDING_APPROVAL';
            version.submittedBy = getCurrentUser().email;
            version.submittedAt = getNowIso();

            appendAudit(
              getCurrentUser().email,
              'SUBMIT_FOR_APPROVAL',
              version.projectId,
              version.versionId,
              'Submitted for approval'
            );

            this._resolve({ success: true });

          })
          .catch(error => {
            this._reject(error);
          });

      },

      requestArchive(projectId) {

        loadState()
          .then(() => {

            const project = findProject(projectId);
            const currentUser = getCurrentUser();

            if (!project) {
              throw new Error('Project not found.');
            }

            const projectVersions =
              getProjectVersions(projectId);

            if (
              projectVersions.some(
                version =>
                  version.status === 'PENDING_APPROVAL'
              )
            ) {
              throw new Error(
                'This project already has a pending approval request.'
              );
            }

            const versionId = generateId('VER');
            const sourceVersion =
              project.currentVersion === '' ||
              project.currentVersion === null
                ? projectVersions[0]
                : projectVersions.find(
                    version =>
                      Number(version.version) ===
                      Number(project.currentVersion)
                  ) || projectVersions[0];

            const nextVersion =
              Math.max(
                ...projectVersions.map(
                  version => Number(version.version)
                )
              ) + 1;

            state.versions.unshift({
              versionId,
              projectId,
              version: nextVersion,
              name: sourceVersion.name,
              description: sourceVersion.description,
              imageFileId: sourceVersion.imageFileId,
              imageUrl: sourceVersion.imageUrl,
              link: sourceVersion.link,
              status: 'PENDING_APPROVAL',
              changeType: 'ARCHIVE',
              submittedBy: currentUser.email,
              submittedAt: getNowIso(),
              approvedBy: '',
              approvedAt: '',
              rejectionReason: '',
              createdAt: getNowIso()
            });

            appendAudit(
              currentUser.email,
              'REQUEST_ARCHIVE',
              projectId,
              versionId,
              'Requested project archive'
            );

            this._resolve({ success: true });

          })
          .catch(error => {
            this._reject(error);
          });

      },

      approveVersion(versionId) {

        loadState()
          .then(() => {

            const version = state.versions.find(
              item => item.versionId === versionId
            );

            if (!version) {
              throw new Error('Project version not found.');
            }

            if (version.status !== 'PENDING_APPROVAL') {
              throw new Error(
                'Only pending versions can be approved.'
              );
            }

            const currentUser = getCurrentUser();
            const project = findProject(version.projectId);

            version.status = 'APPROVED';
            version.approvedBy = currentUser.email;
            version.approvedAt = getNowIso();
            version.rejectionReason = '';

            if (version.changeType === 'ARCHIVE') {
              project.archived = 'TRUE';
            } else {
              project.currentVersion = Number(version.version);
            }

            appendAudit(
              currentUser.email,
              'APPROVE',
              version.projectId,
              version.versionId,
              'Project version approved'
            );

            this._resolve({ success: true });

          })
          .catch(error => {
            this._reject(error);
          });

      },

      rejectVersion(versionId, rejectionReason) {

        loadState()
          .then(() => {

            if (
              !rejectionReason ||
              !String(rejectionReason).trim()
            ) {
              throw new Error(
                'A rejection reason is required.'
              );
            }

            const version = state.versions.find(
              item => item.versionId === versionId
            );

            if (!version) {
              throw new Error('Project version not found.');
            }

            if (version.status !== 'PENDING_APPROVAL') {
              throw new Error(
                'Only pending versions can be rejected.'
              );
            }

            version.status = 'REJECTED';
            version.rejectionReason =
              String(rejectionReason).trim();

            appendAudit(
              getCurrentUser().email,
              'REJECT',
              version.projectId,
              version.versionId,
              String(rejectionReason).trim()
            );

            this._resolve({ success: true });

          })
          .catch(error => {
            this._reject(error);
          });

      },

      deleteProject(projectId) {

        loadState()
          .then(() => {

            const index = state.projects.findIndex(
              project => project.projectId === projectId
            );

            if (index === -1) {
              throw new Error('Project not found.');
            }

            state.projects.splice(index, 1);
            state.versions = state.versions.filter(
              version => version.projectId !== projectId
            );
            state.audit = state.audit.filter(
              row => row.projectId !== projectId
            );

            this._resolve({ success: true });

          })
          .catch(error => {
            this._reject(error);
          });

      },

      addUser(form) {

        loadState()
          .then(() => {

            const email = String(form.email || '')
              .trim()
              .toLowerCase();

            const role = String(form.role || '')
              .trim()
              .toUpperCase();

            if (!email) {
              throw new Error('User email is required.');
            }

            const allowedRoles = [
              'ADMIN',
              'VIEWER',
              'CREATOR'
            ];

            if (!allowedRoles.includes(role)) {
              throw new Error(
                'Role must be ADMIN, VIEWER, or CREATOR.'
              );
            }

            if (
              state.users.some(
                user =>
                  String(user.email).toLowerCase() ===
                  email
              )
            ) {
              throw new Error(
                'This user already exists in the CMS.'
              );
            }

            state.users.push({
              email,
              role,
              active: 'TRUE'
            });

            appendAudit(
              getCurrentUser().email,
              'ADD_USER',
              '',
              '',
              `Added user ${email} with role ${role}`
            );

            this._resolve({
              success: true,
              email,
              role
            });

          })
          .catch(error => {
            this._reject(error);
          });

      },

      updateUser(form) {

        loadState()
          .then(() => {

            const originalEmail = String(form.originalEmail || '')
              .trim()
              .toLowerCase();

            const email = String(form.email || '')
              .trim()
              .toLowerCase();

            const role = String(form.role || '')
              .trim()
              .toUpperCase();

            const active = form.active === true ||
              String(form.active).toUpperCase() === 'TRUE';

            if (!originalEmail) {
              throw new Error('Original user email is required.');
            }

            const userIndex = state.users.findIndex(
              user =>
                String(user.email).toLowerCase() ===
                originalEmail
            );

            if (userIndex === -1) {
              throw new Error('User not found.');
            }

            const allowedRoles = [
              'ADMIN',
              'VIEWER',
              'CREATOR'
            ];

            if (!allowedRoles.includes(role)) {
              throw new Error(
                'Role must be ADMIN, VIEWER, or CREATOR.'
              );
            }

            if (
              email !== originalEmail &&
              state.users.some(
                user =>
                  String(user.email).toLowerCase() ===
                  email
              )
            ) {
              throw new Error(
                'This user already exists in the CMS.'
              );
            }

            const currentUser = getCurrentUser();
            const targetUser = state.users[userIndex];
            const wasActiveAdmin =
              String(targetUser.role).toUpperCase() === 'ADMIN' &&
              isTrue(targetUser.active);

            const willBeActiveAdmin =
              role === 'ADMIN' && active;

            if (wasActiveAdmin && !willBeActiveAdmin) {
              const remainingAdmins = state.users.filter(
                user =>
                  String(user.role).toUpperCase() === 'ADMIN' &&
                  isTrue(user.active) &&
                  String(user.email).toLowerCase() !==
                  originalEmail
              ).length;

              if (remainingAdmins === 0) {
                throw new Error(
                  'At least one active admin must remain in the CMS.'
                );
              }
            }

            state.users[userIndex] = {
              email,
              role,
              active: active ? 'TRUE' : 'FALSE'
            };

            appendAudit(
              currentUser.email,
              'UPDATE_USER',
              '',
              '',
              `Updated user ${originalEmail} to ${email} (${role}, active=${active})`
            );

            this._resolve({
              success: true,
              email,
              role,
              active
            });

          })
          .catch(error => {
            this._reject(error);
          });

      },

      deleteUser(email) {

        loadState()
          .then(() => {

            const targetEmail = String(email || '')
              .trim()
              .toLowerCase();

            if (!targetEmail) {
              throw new Error('User email is required.');
            }

            const currentUser = getCurrentUser();

            if (targetEmail === currentUser.email) {
              throw new Error('You cannot delete your own account.');
            }

            const userIndex = state.users.findIndex(
              user =>
                String(user.email).toLowerCase() ===
                targetEmail
            );

            if (userIndex === -1) {
              throw new Error('User not found.');
            }

            const targetUser = state.users[userIndex];
            const isActiveAdmin =
              String(targetUser.role).toUpperCase() === 'ADMIN' &&
              isTrue(targetUser.active);

            if (isActiveAdmin) {
              const remainingAdmins = state.users.filter(
                user =>
                  String(user.role).toUpperCase() === 'ADMIN' &&
                  isTrue(user.active) &&
                  String(user.email).toLowerCase() !==
                  targetEmail
              ).length;

              if (remainingAdmins === 0) {
                throw new Error(
                  'At least one active admin must remain in the CMS.'
                );
              }
            }

            state.users.splice(userIndex, 1);

            appendAudit(
              currentUser.email,
              'DELETE_USER',
              '',
              '',
              `Deleted user ${targetEmail}`
            );

            this._resolve({
              success: true
            });

          })
          .catch(error => {
            this._reject(error);
          });

      }

    };

    return runner;

  }


  window.google = {
    script: {
      get run() {
        return createRunner();
      }
    }
  };

  window.__CMS_LOCAL_DEV__ = true;

})();
