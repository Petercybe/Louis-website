import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import siteContentRoutes from "./routes/siteContentRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

// 0. Clean up stale temp files in uploads/ — these are only meant to live
// for the split-second between multer saving them and the Cloudinary
// upload finishing. If the server ever restarts or crashes mid-request
// (or an upload times out) a leftover file can get stranded here forever.
// This clears anything older than an hour on boot and once every hour
// after that, so the disk never quietly fills up.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_TMP_DIR = path.join(__dirname, "uploads");

const ONE_HOUR_MS = 60 * 60 * 1000;

function cleanupStaleUploads() {
  if (!fs.existsSync(UPLOAD_TMP_DIR)) return;
  const now = Date.now();
  for (const name of fs.readdirSync(UPLOAD_TMP_DIR)) {
    if (name === ".gitkeep") continue;
    const filePath = path.join(UPLOAD_TMP_DIR, name);
    try {
      const stats = fs.statSync(filePath);
      if (stats.isFile() && now - stats.mtimeMs > ONE_HOUR_MS) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Removed stale temp upload: ${name}`);
      }
    } catch {
      // File may have been removed by the request that created it; ignore.
    }
  }
}

cleanupStaleUploads();
setInterval(cleanupStaleUploads, ONE_HOUR_MS);

// 1. connect DB first
connectDB();

// 2. middleware
app.use(cors());
app.use(express.json());

// 3. routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/site-content", siteContentRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/", (req, res) => {
  res.send("Louis Peter Bangura Portfolio API Running");
});

// 4. error handling — always last
app.use(notFound);
app.use(errorHandler);

// Use the PORT from .env when the host platform assigns one (Render,
// Railway, etc.) and fall back to 5000 for local development.
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
