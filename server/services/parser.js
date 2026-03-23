const { parse } = require('csv-parse/sync');
const mammoth = require('mammoth');
const fs = require('fs');

async function extractText(filePath, fileType) {
  const buffer = fs.readFileSync(filePath);

  if (fileType === 'csv') {
    return parseCSV(buffer);
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

  if (records.length === 0) return [];

  const columns = Object.keys(records[0]);

  // Try to find text/feedback columns by name
  const feedbackKeys = ['feedback', 'comment', 'quote', 'text', 'response', 'message', 'description', 'notes', 'text2', 'improvement', 'open_text', 'verbatim', 'remark', 'opmerking'];
  const feedbackCol = columns.find(c => feedbackKeys.includes(c.toLowerCase()));

  if (feedbackCol) {
    return records.map(r => r[feedbackCol]).filter(t => t && t.trim());
  }

  // Build a summary row from meaningful columns (skip metadata like URL, IP, Browser, etc.)
  const metaKeys = ['url', 'location', 'total time', 'device type', 'browser', 'system', 'ip', 'date', 'istargetgroup', 'total_time'];
  const meaningfulCols = columns.filter(c => !metaKeys.includes(c.toLowerCase()));

  return records.map(r => {
    const parts = [];
    for (const col of meaningfulCols) {
      const val = (r[col] || '').trim();
      if (val) parts.push(`${col}: ${val}`);
    }
    return parts.join(' | ');
  }).filter(t => t.length > 10);
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
