import express from "express";
import SiteContent from "../models/SiteContent.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Shared helper — there is always exactly one SiteContent document
// (key: "main"). Create it with schema defaults the first time anyone asks.
async function getOrCreateSiteContent() {
  let content = await SiteContent.findOne({ key: "main" });
  if (!content) {
    content = await SiteContent.create({ key: "main" });
  }
  return content;
}

// GET /api/site-content - public, used by the live site
router.get("/", async (req, res) => {
  try {
    const content = await getOrCreateSiteContent();
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/site-content (protected) - partial update, only touches fields sent
router.put("/", protect, async (req, res) => {
  try {
    const content = await getOrCreateSiteContent();

    const { tagline, bio, location, resumeUrl, stats, timeline, social } = req.body;

    if (tagline !== undefined) content.tagline = tagline;
    if (bio !== undefined) content.bio = bio;
    if (location !== undefined) content.location = location;
    if (resumeUrl !== undefined) content.resumeUrl = resumeUrl;
    if (stats !== undefined) content.stats = { ...content.stats.toObject(), ...stats };
    if (timeline !== undefined) content.timeline = timeline;
    if (social !== undefined) content.social = { ...content.social.toObject(), ...social };

    await content.save();
    res.json(content);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
