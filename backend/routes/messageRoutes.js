import express from "express";
import Message from "../models/Message.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/messages - list all, newest first (protected)
router.get("/", protect, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/messages/:id/read - toggle read status (protected)
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }
    message.read = req.body.read !== undefined ? !!req.body.read : !message.read;
    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/messages/:id (protected)
router.delete("/:id", protect, async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }
    res.json({ message: "Message deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
