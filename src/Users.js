function getCurrentUserEmail_() {
  const email = Session
    .getActiveUser()
    .getEmail();

  if (!email) {
    throw new Error(
      'Google account identity could not be determined.'
    );
  }

  return email.toLowerCase();
}

function getCurrentUser_() {
  const email = getCurrentUserEmail_();

  const users = getRowsAsObjects_(
    CONFIG.SHEETS.USERS
  );

  const user = users.find(row =>
    String(row.email).toLowerCase() === email &&
    String(row.active).toUpperCase() === 'TRUE'
  );

  if (!user) {
    throw new Error('You are not authorised to access this CMS.');
  }

  return {
    email: email,
    role: String(user.role).toUpperCase()
  };
}

function requireEditor_() {
  const user = getCurrentUser_();

  const allowed = [
    'EDITOR',
    'APPROVER',
    'ADMIN'
  ];

  if (!allowed.includes(user.role)) {
    throw new Error('Editor permission required.');
  }

  return user;
}

function requireApprover_() {
  const user = getCurrentUser_();

  if (
    user.role !== 'APPROVER' &&
    user.role !== 'ADMIN'
  ) {
    throw new Error('Approver permission required.');
  }

  return user;
}

function getMyUser() {
  return getCurrentUser_();
}