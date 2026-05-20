// src/routes/resume.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { requireAuth } from '../middleware/auth';
import { parseResumeFromText, parseResumeFromImage } from '../lib/groqClient';

const router = Router();
router.use(requireAuth);

// Store files in memory — no disk writes on Render
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, and WEBP files are supported'));
    }
  },
});

// ─── POST /api/profile/parse-resume ──────────────────────────────────────────
router.post('/', upload.single('resume'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Send a PDF or image as form-data field "resume".' });
    return;
  }

  const { mimetype, buffer } = req.file;

  try {
    let extracted: Record<string, unknown>;

    if (mimetype === 'application/pdf') {
      // Text-based PDF — extract text then send to LLaMA 3.3
      const parsed = await pdfParse(buffer);
      const text = parsed.text?.trim();

      if (!text || text.length < 50) {
        // PDF has no extractable text (scanned/image PDF) — fall back to vision
        const base64 = buffer.toString('base64');
        extracted = await parseResumeFromImage(base64, 'application/pdf');
      } else {
        extracted = await parseResumeFromText(text);
      }
    } else {
      // Image file — use Groq vision model
      const base64 = buffer.toString('base64');
      extracted = await parseResumeFromImage(base64, mimetype);
    }

    res.json({ extracted, success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`❌ Resume parse error: ${msg}`);

    if (msg.includes('JSON')) {
      res.status(422).json({ error: 'Could not extract structured data from resume. Please fill the form manually.' });
    } else {
      res.status(500).json({ error: 'Resume parsing failed. Please try again or fill manually.' });
    }
  }
});

export default router;
