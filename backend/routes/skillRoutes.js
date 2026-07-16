import express from "express";
import Skill from "../models/Skill.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/skills - public, used by the live site
router.get("/", async (req, res) => {
  try {
    const skills = await Skill.find().sort({ order: 1, createdAt: 1 });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/skills (protected)
router.post("/", protect, async (req, res) => {
  try {
    const skill = await Skill.create(req.body);
    res.status(201).json(skill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/skills/:id (protected)
router.put("/:id", protect, async (req, res) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!skill) return res.status(404).json({ message: "Skill not found." });
    res.json(skill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/skills/:id (protected)
router.delete("/:id", protect, async (req, res) => {
  try {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (!skill) return res.status(404).json({ message: "Skill not found." });
    res.json({ message: "Skill deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
