/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

module.exports = {
  getHasteName(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    if (
      /node_modules_.+\//.test(normalized) ||
      /node_modules_backup/.test(normalized) ||
      /security-fix-backup-/.test(normalized)
    ) {
      return null;
    }
    return path.basename(filePath, path.extname(filePath));
  },
};
