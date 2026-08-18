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

function requireCreator_() {
  const user = getCurrentUser_();

  const allowed = [
    CONFIG.ROLES.CREATOR,
    CONFIG.ROLES.ADMIN
  ];

  if (!allowed.includes(user.role)) {
    throw new Error('Creator permission required.');
  }

  return user;
}

function requireAdmin_() {
  const user = getCurrentUser_();

  if (user.role !== CONFIG.ROLES.ADMIN) {
    throw new Error('Admin permission required.');
  }

  return user;
}

function getMyUser() {
  return toClientPayload_(getCurrentUser_());
}
