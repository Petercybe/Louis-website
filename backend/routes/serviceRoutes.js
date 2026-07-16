import express from "express";
import Service from "../models/Service.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/services - public, used by the live site
router.get("/", async (req, res) => {
  try {
    const services = await Service.find().sort({ order: 1, createdAt: 1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/services (protected)
router.post("/", protect, async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/services/:id (protected)
router.put("/:id", protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!service) return res.status(404).json({ message: "Service not found." });
    res.json(service);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/services/:id (protected)
router.delete("/:id", protect, async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found." });
    res.json({ message: "Service deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
