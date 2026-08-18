function validateWebP_(blob) {

  if (!blob) {
    throw new Error('An image is required.');
  }

  const contentType = blob.getContentType();

  const filename = String(blob.getName() || '')
    .toLowerCase();

  if (contentType !== CONFIG.ALLOWED_IMAGE_MIME) {
    throw new Error(
      'Only WebP images are allowed.'
    );
  }

  if (!filename.endsWith('.webp')) {
    throw new Error(
      'Image filename must end with .webp'
    );
  }

  return true;
}

function saveProjectImage_(blob, projectId) {

  validateWebP_(blob);

  const folder = DriveApp.getFolderById(
    CONFIG.IMAGE_FOLDER_ID
  );

  const timestamp = Date.now();

  const filename =
    `${projectId}-${timestamp}.webp`;

  blob.setName(filename);

  const file = folder.createFile(blob);

  return {
    fileId: file.getId(),
    name: file.getName()
  };
}

function getProjectImageUrl_(fileId) {
  if (!fileId) {
    return '';
  }

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
}