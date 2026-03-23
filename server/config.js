const path = require('path');

module.exports = {
  dbPath: path.join(__dirname, '../data/feedback.db'),
  uploadsDir: path.join(__dirname, '../data/uploads'),
  publicDir: path.join(__dirname, '../public'),
  uploadLimits: { fileSize: 10 * 1024 * 1024 },
  allowedMimeTypes: [
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
  ],
  claudeModel: 'claude-opus-4-6',
  batchSize: 10,
};
