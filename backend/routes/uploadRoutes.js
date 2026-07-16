import express from "express";
import multer from "multer";
import fs from "fs";
import cloudinary from "../config/cloudinary.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Make sure the temp upload folder exists — multer throws ENOENT otherwise
const UPLOAD_DIR = "uploads/";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Cloudinary's SDK doesn't always reject with a plain Error — auth/config
// failures (bad cloud_name, bad api_key/secret, etc.) often come back as
// { error: { message, http_code } } instead of a top-level .message. This
// pulls the real message out of either shape so it's never just "undefined".
function extractErrorMessage(error) {
  return error?.message || error?.error?.message || "Unknown upload error";
}

const upload = multer({
  dest: UPLOAD_DIR,
  // 20MB cap — the frontend already compresses images before sending, but
  // this gives headroom for anything that reaches the server uncompressed
  // (e.g. a direct API call) instead of failing modern phone-camera photos.
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  }
});

const uploadDoc = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB cap
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  }
});

// UPLOAD IMAGE
router.post("/", protect, upload.single("image"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const result = await cloudinary.uploader.upload(file.path, {
      folder: "portfolio"
    });

    fs.unlinkSync(file.path); // delete temp file now that it's safely on Cloudinary

    res.json({
      url: result.secure_url,
      public_id: result.public_id
    });

  } catch (error) {
    // Log the full error server-side so it's visible in your terminal, not just the client
    const message = extractErrorMessage(error);
    console.error("❌ Upload failed:", message, "\nFull error:", error);

    // Clean up the temp file even on failure, so uploads/ doesn't fill up with orphaned files
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ message });
  }
});

// UPLOAD DOCUMENT (CV / resume PDF)
router.post("/document", protect, uploadDoc.single("document"), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // resource_type "raw" — Cloudinary treats PDFs as a non-image asset,
    // so this must be set explicitly or the upload is rejected.
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "portfolio/documents",
      resource_type: "raw",
    });

    fs.unlinkSync(file.path);

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    const message = extractErrorMessage(error);
    console.error("❌ Document upload failed:", message, "\nFull error:", error);

    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ message });
  }
});

// Multer errors (file too large, wrong type) don't go through the try/catch above —
// they're thrown before the handler runs, so they need their own error handler here.
router.use((error, req, res, next) => {
  if (
    error instanceof multer.MulterError ||
    error.message === "Only image files are allowed" ||
    error.message === "Only PDF files are allowed"
  ) {
    return res.status(400).json({ message: error.message });
  }
  next(error);
});

export default router;
