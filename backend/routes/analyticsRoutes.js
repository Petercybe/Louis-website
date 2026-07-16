import express from "express";
import PageView from "../models/PageView.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/analytics/view - public, called once per page load from index.html
router.post("/view", async (req, res) => {
  try {
    await PageView.create({});
    res.status(201).json({ ok: true });
  } catch (error) {
    // Analytics failing should never break the visitor's experience
    res.status(200).json({ ok: false });
  }
});

// GET /api/analytics/stats - protected, powers the dashboard chart + total
router.get("/stats", protect, async (req, res) => {
  try {
    const total = await PageView.countDocuments();

    // Last 30 days, bucketed by day, oldest first
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const raw = await PageView.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);

    const byDate = Object.fromEntries(raw.map((r) => [r._id, r.count]));

    const daily = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      daily.push({ date: key, count: byDate[key] || 0 });
    }

    res.json({ total, daily });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
