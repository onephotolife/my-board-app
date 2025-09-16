/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

module.exports = function hasteImpl(filePath) {
  if (
    filePath.includes('node_modules_old') ||
    filePath.includes('node_modules_backup_') ||
    filePath.includes('node_modules_stale_') ||
    filePath.includes('security-fix-backup-')
  ) {
    return null;
  }
  return path.basename(filePath);
};
