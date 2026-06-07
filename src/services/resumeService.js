require('dotenv').config();
const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');

// Resume text is truncated before being sent to GPT to bound token cost.
const MAX_RESUME_CHARS = 6000;

async function downloadFile(file) {
  const url = file.url_private_download || file.url_private;
  if (!url) return null;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Slack file download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Downloads an uploaded Slack file and extracts plain text from it.
// Best-effort: any failure (download, unsupported format, parse error) returns
// an empty string so the referral pipeline is never blocked by a bad file.
async function extractResumeText(file) {
  if (!file) return '';

  const type = (file.filetype || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  const isPdf = type === 'pdf' || mime.includes('pdf');
  const isDocx =
    type === 'docx' || mime.includes('officedocument.wordprocessingml');
  const isText = type === 'text' || mime.startsWith('text/');

  if (!isPdf && !isDocx && !isText) return '';

  try {
    const buf = await downloadFile(file);
    if (!buf) return '';

    let text = '';
    if (isPdf) {
      const parser = new PDFParse({ data: buf });
      text = (await parser.getText()).text || '';
    } else if (isDocx) {
      text = (await mammoth.extractRawText({ buffer: buf })).value || '';
    } else {
      text = buf.toString('utf8');
    }

    return text
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_RESUME_CHARS);
  } catch (err) {
    console.error('[resume] failed to extract text:', err.message);
    return '';
  }
}

module.exports = { extractResumeText, MAX_RESUME_CHARS };
