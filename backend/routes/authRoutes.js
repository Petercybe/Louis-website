import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();


// LOGIN ADMIN
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
  token,
  admin: {
    id: admin._id,
    username: admin.username,
    displayName: admin.displayName,
    title: admin.title,
    avatar: admin.avatar
  }
});

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE USERNAME / PASSWORD (must be logged in, must confirm current password)
router.put("/update-credentials", protect, async (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;

  try {
    if (!currentPassword) {
      return res.status(400).json({ message: "Current password is required." });
    }

    // req.admin was set by the protect middleware (password excluded), so fetch fresh with password
    const admin = await Admin.findById(req.admin._id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    if (!newUsername && !newPassword) {
      return res.status(400).json({ message: "Provide a new username and/or a new password." });
    }

    if (newUsername && newUsername.trim() !== admin.username) {
      const trimmed = newUsername.trim();
      const existing = await Admin.findOne({ username: trimmed });
      if (existing && String(existing._id) !== String(admin._id)) {
        return res.status(409).json({ message: "That username is already taken." });
      }
      admin.username = trimmed;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters." });
      }
      admin.password = await bcrypt.hash(newPassword, 10);
    }

    await admin.save();

    // Issue a fresh token in case the identity changed
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      message: "Credentials updated successfully.",
      token,
      admin: {
        id: admin._id,
        username: admin.username,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET CURRENT ADMIN (used on dashboard load to refresh profile info)
router.get("/me", protect, async (req, res) => {
  res.json({
    id: req.admin._id,
    username: req.admin.username,
    displayName: req.admin.displayName,
    title: req.admin.title,
    avatar: req.admin.avatar,
  });
});

// UPDATE PROFILE (display name / title / avatar) - Profile tab, separate
// from username/password which live under Settings (update-credentials)
router.put("/profile", protect, async (req, res) => {
  const { displayName, title, avatar } = req.body;

  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    if (displayName !== undefined) admin.displayName = displayName.trim();
    if (title !== undefined) admin.title = title.trim();
    if (avatar !== undefined) admin.avatar = avatar;

    await admin.save();

    res.json({
      id: admin._id,
      username: admin.username,
      displayName: admin.displayName,
      title: admin.title,
      avatar: admin.avatar,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;