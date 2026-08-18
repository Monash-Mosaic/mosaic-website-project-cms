(function () {

  const DATA_URL = '/dummy/data/dashboard.json';

  let dashboard = null;
  let loadPromise = null;


  function loadDashboard() {

    if (dashboard) {
      return Promise.resolve(dashboard);
    }

    if (!loadPromise) {

      loadPromise = fetch(DATA_URL)
        .then(response => {

          if (!response.ok) {
            throw new Error(
              `Failed to load dummy data (${response.status}).`
            );
          }

          return response.json();

        })
        .then(data => {

          dashboard = data;

          return dashboard;

        });

    }

    return loadPromise;

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

    return dashboard.projects.find(
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

        loadDashboard()
          .then(data => {
            this._resolve({
              user: data.user,
              projects: data.projects.slice()
            });
          })
          .catch(error => {
            this._reject(error);
          });

      },

      createProject(form) {

        loadDashboard()
          .then(() => {

            const values = readForm(form);

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

            dashboard.projects.unshift({
              projectId,
              latestVersionId: versionId,
              latestVersion: 1,
              name: values.name,
              description: values.description,
              imageFileId: `dummy-${projectId}`,
              imageUrl,
              link: values.link,
              status: 'DRAFT',
              changeType: 'CREATE',
              currentVersion: null,
              isLive: false,
              createdAt: new Date().toISOString(),
              submittedBy: '',
              approvedBy: '',
              rejectionReason: ''
            });

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

        loadDashboard()
          .then(() => {

            const values = readForm(form);
            const project = findProject(values.projectId);

            if (!project) {
              throw new Error('Project not found.');
            }

            if (project.status === 'PENDING_APPROVAL') {
              throw new Error(
                'This project already has a version awaiting approval.'
              );
            }

            const versionId = generateId('VER');
            const nextVersion = project.latestVersion + 1;

            let imageUrl = project.imageUrl;

            if (values.image) {
              imageUrl = URL.createObjectURL(values.image);
            }

            Object.assign(project, {
              latestVersionId: versionId,
              latestVersion: nextVersion,
              name: values.name,
              description: values.description,
              link: values.link,
              imageUrl,
              status: 'DRAFT',
              changeType: 'UPDATE',
              rejectionReason: ''
            });

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

        loadDashboard()
          .then(() => {

            const project = dashboard.projects.find(
              item => item.latestVersionId === versionId
            );

            if (!project) {
              throw new Error('Project version not found.');
            }

            if (
              project.status !== 'DRAFT' &&
              project.status !== 'REJECTED'
            ) {
              throw new Error(
                'Only draft or rejected versions can be submitted.'
              );
            }

            project.status = 'PENDING_APPROVAL';
            project.submittedBy = dashboard.user.email;

            this._resolve({ success: true });

          })
          .catch(error => {
            this._reject(error);
          });

      },

      requestArchive(projectId) {

        loadDashboard()
          .then(() => {

            const project = findProject(projectId);

            if (!project) {
              throw new Error('Project not found.');
            }

            if (project.status === 'PENDING_APPROVAL') {
              throw new Error(
                'This project already has a pending approval request.'
              );
            }

            project.latestVersionId = generateId('VER');
            project.latestVersion += 1;
            project.status = 'PENDING_APPROVAL';
            project.changeType = 'ARCHIVE';
            project.submittedBy = dashboard.user.email;

            this._resolve({ success: true });

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
