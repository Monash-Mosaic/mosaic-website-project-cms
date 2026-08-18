function validateUserFields_(email, role) {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();

  const normalizedRole = String(role || '')
    .trim()
    .toUpperCase();

  if (!normalizedEmail) {
    throw new Error('User email is required.');
  }

  if (
    !normalizedEmail.includes('@') ||
    normalizedEmail.startsWith('@') ||
    normalizedEmail.endsWith('@')
  ) {
    throw new Error('Enter a valid email address.');
  }

  const allowedRoles = [
    CONFIG.ROLES.ADMIN,
    CONFIG.ROLES.VIEWER,
    CONFIG.ROLES.CREATOR
  ];

  if (!allowedRoles.includes(normalizedRole)) {
    throw new Error(
      'Role must be ADMIN, VIEWER, or CREATOR.'
    );
  }

  return {
    email: normalizedEmail,
    role: normalizedRole
  };
}

function normalizeActive_(value) {
  return (
    value === true ||
    String(value).toUpperCase() === 'TRUE'
  );
}

function countActiveAdmins_(users, excludeEmail) {
  const excluded = String(excludeEmail || '')
    .trim()
    .toLowerCase();

  return users.filter(user =>
    String(user.role).toUpperCase() === CONFIG.ROLES.ADMIN &&
    normalizeActive_(user.active) &&
    String(user.email).toLowerCase() !== excluded
  ).length;
}

function ensureAdminCanBeChanged_(
  users,
  targetEmail,
  nextRole,
  nextActive
) {
  const email = String(targetEmail).toLowerCase();
  const user = users.find(
    row => String(row.email).toLowerCase() === email
  );

  if (!user) {
    throw new Error('User not found.');
  }

  const wasActiveAdmin =
    String(user.role).toUpperCase() === CONFIG.ROLES.ADMIN &&
    normalizeActive_(user.active);

  const willBeActiveAdmin =
    nextRole === CONFIG.ROLES.ADMIN &&
    nextActive;

  if (wasActiveAdmin && !willBeActiveAdmin) {
    const remainingAdmins =
      countActiveAdmins_(users, email);

    if (remainingAdmins === 0) {
      throw new Error(
        'At least one active admin must remain in the CMS.'
      );
    }
  }
}

function listUsers() {
  requireAdmin_();

  const users = getRowsAsObjects_(CONFIG.SHEETS.USERS);

  return users.map(row => ({
    email: String(row.email).toLowerCase(),
    role: String(row.role).toUpperCase(),
    active: normalizeActive_(row.active)
  }));
}

function addUser(form) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const admin = requireAdmin_();
    const validated = validateUserFields_(
      form.email,
      form.role
    );

    const users = getRowsAsObjects_(CONFIG.SHEETS.USERS);
    const existing = users.find(
      row =>
        String(row.email).toLowerCase() ===
        validated.email
    );

    if (existing) {
      throw new Error('This user already exists in the CMS.');
    }

    getSheet_(CONFIG.SHEETS.USERS).appendRow([
      validated.email,
      validated.role,
      'TRUE'
    ]);

    writeAudit_(
      admin.email,
      'ADD_USER',
      '',
      '',
      `Added user ${validated.email} with role ${validated.role}`
    );

    return {
      success: true,
      email: validated.email,
      role: validated.role
    };

  } finally {
    lock.releaseLock();
  }
}

function updateUser(form) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const admin = requireAdmin_();

    const originalEmail = String(form.originalEmail || '')
      .trim()
      .toLowerCase();

    if (!originalEmail) {
      throw new Error('Original user email is required.');
    }

    const validated = validateUserFields_(
      form.email,
      form.role
    );

    const active = normalizeActive_(form.active);

    const users = getRowsAsObjects_(CONFIG.SHEETS.USERS);
    const user = users.find(
      row =>
        String(row.email).toLowerCase() ===
        originalEmail
    );

    if (!user) {
      throw new Error('User not found.');
    }

    if (
      validated.email !== originalEmail &&
      users.some(
        row =>
          String(row.email).toLowerCase() ===
          validated.email
      )
    ) {
      throw new Error('This user already exists in the CMS.');
    }

    ensureAdminCanBeChanged_(
      users,
      originalEmail,
      validated.role,
      active
    );

    const sheet = getSheet_(CONFIG.SHEETS.USERS);

    sheet
      .getRange(user._row, 1)
      .setValue(validated.email);

    sheet
      .getRange(user._row, 2)
      .setValue(validated.role);

    sheet
      .getRange(user._row, 3)
      .setValue(active ? 'TRUE' : 'FALSE');

    writeAudit_(
      admin.email,
      'UPDATE_USER',
      '',
      '',
      `Updated user ${originalEmail} to ${validated.email} (${validated.role}, active=${active})`
    );

    return {
      success: true,
      email: validated.email,
      role: validated.role,
      active: active
    };

  } finally {
    lock.releaseLock();
  }
}

function deleteUser(email) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const admin = requireAdmin_();

    const targetEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!targetEmail) {
      throw new Error('User email is required.');
    }

    if (targetEmail === admin.email) {
      throw new Error('You cannot delete your own account.');
    }

    const users = getRowsAsObjects_(CONFIG.SHEETS.USERS);
    const user = users.find(
      row =>
        String(row.email).toLowerCase() ===
        targetEmail
    );

    if (!user) {
      throw new Error('User not found.');
    }

    ensureAdminCanBeChanged_(
      users,
      targetEmail,
      CONFIG.ROLES.VIEWER,
      false
    );

    getSheet_(CONFIG.SHEETS.USERS)
      .deleteRow(user._row);

    writeAudit_(
      admin.email,
      'DELETE_USER',
      '',
      '',
      `Deleted user ${targetEmail}`
    );

    return {
      success: true
    };

  } finally {
    lock.releaseLock();
  }
}
