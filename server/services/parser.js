const { parse } = require('csv-parse/sync');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const fs = require('fs');

async function extractText(filePath, fileType) {
  const buffer = fs.readFileSync(filePath);

  if (fileType === 'csv') {
    return parseCSV(buffer);
  } else if (fileType === 'xlsx' || fileType === 'xls') {
    return parseExcel(buffer);
  } else if (fileType === 'docx') {
    return parseWord(buffer);
  } else if (fileType === 'pdf') {
    return parsePDF(buffer);
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

function decodeBuffer(buffer) {
  // Detect UTF-16 LE BOM (FF FE) or UTF-16 BE BOM (FE FF)
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    return buffer.toString('utf16le').slice(1); // skip BOM
  }
  if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
    // UTF-16 BE: swap bytes then decode as utf16le
    const swapped = Buffer.alloc(buffer.length);
    for (let i = 0; i < buffer.length - 1; i += 2) {
      swapped[i] = buffer[i + 1];
      swapped[i + 1] = buffer[i];
    }
    return swapped.toString('utf16le').slice(1);
  }
  // Detect null bytes (UTF-16 without BOM)
  if (buffer.length >= 4 && (buffer[0] === 0 || buffer[1] === 0)) {
    if (buffer[0] === 0) {
      // UTF-16 BE without BOM
      const swapped = Buffer.alloc(buffer.length);
      for (let i = 0; i < buffer.length - 1; i += 2) {
        swapped[i] = buffer[i + 1];
        swapped[i + 1] = buffer[i];
      }
      return swapped.toString('utf16le');
    }
    return buffer.toString('utf16le');
  }
  // UTF-8 (skip BOM if present)
  const str = buffer.toString('utf-8');
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

function detectDelimiter(content) {
  const firstLine = content.split(/\r?\n/)[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;

  const counts = [
    { delimiter: '\t', count: tabCount },
    { delimiter: ',', count: commaCount },
    { delimiter: ';', count: semiCount },
    { delimiter: '|', count: pipeCount },
  ];

  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delimiter : ',';
}

// Columns that are never feedback text — technical metadata, device info, etc.
const META_KEYS = new Set([
  'date', 'url', 'location', 'total time', 'total_time', 'device type', 'browser',
  'system', 'version', 'ip', 'istargetgroup', 'id', 'row', '#',
  'feedback id', 'app name', 'app version', 'rooted', 'battery', 'orientation',
  'language', 'connection', 'screensize', 'status', 'starred', 'public link',
  'screenshot', 'free space', 'total space', 'free memory', 'total memory',
  'labels', 'custom abonnee', 'custom locale', 'custom country', 'click_to_edit',
  'email', 'device', 'device_type',
]);

function extractFeedbackRows(records) {
  if (records.length === 0) return [];

  const columns = Object.keys(records[0]);

  // Check for a mood/rating column (1-5 scale)
  const moodCol = columns.find(c => ['mood', 'rating', 'score', 'nps', 'stars'].includes(c.toLowerCase()));

  // Find columns that are clearly open-text feedback by name
  const namedFeedbackKeys = [
    'feedback', 'comment', 'quote', 'text', 'response', 'message', 'description',
    'notes', 'text2', 'improvement', 'open_text', 'verbatim', 'remark', 'opmerking',
  ];
  const namedCols = columns.filter(c => namedFeedbackKeys.includes(c.toLowerCase()));

  // All remaining non-meta, non-mood columns are potential open-text columns
  const otherCols = columns.filter(c => {
    const lc = c.toLowerCase();
    return !META_KEYS.has(lc) && lc !== (moodCol || '').toLowerCase() && !namedFeedbackKeys.includes(lc);
  });

  // Use named cols if found, otherwise fall back to all non-meta columns
  const textCols = namedCols.length > 0 ? namedCols : otherCols;

  return records.map(r => {
    // Merge all non-empty text columns for this row
    const parts = textCols
      .map(col => String(r[col] || '').trim())
      .filter(v => v.length > 3 && v !== ' ');

    if (parts.length === 0) return null;

    const text = parts.join(' | ');

    // Prepend mood rating as context for the AI
    if (moodCol) {
      const rating = String(r[moodCol] || '').trim();
      if (rating && !isNaN(rating)) {
        return `[Rating: ${rating}/5] ${text}`;
      }
    }

    return text;
  }).filter(t => t && t.length > 10);
}

function parseCSV(buffer) {
  const content = decodeBuffer(buffer);
  const delimiter = detectDelimiter(content);

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    delimiter,
    relax_quotes: true,
    relax_column_count: true,
    quote: '"',
  });

  return extractFeedbackRows(records);
}

function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return extractFeedbackRows(records);
}

async function parseWord(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return splitTextIntoItems(result.value);
}

async function parsePDF(buffer) {
  const pdfParse = require('pdf-parse');
  const result = await pdfParse(buffer);
  return splitTextIntoItems(result.text);
}

function splitTextIntoItems(text) {
  // Split by double newlines, bullet points, or numbered lists
  const items = text
    .split(/\n{2,}|(?=^\s*[-•*]\s)/m)
    .map(s => s.replace(/^\s*[-•*\d.]+\s*/, '').trim())
    .filter(s => s.length > 10); // Filter out very short fragments

  return items;
}

module.exports = { extractText };
