import express from "express";
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
=========================================
PUBLIC ROUTES
=========================================
*/

// Get all projects
router.get("/", getProjects);

// Get a single project
router.get("/:id", getProject);

/*
=========================================
PROTECTED ROUTES
=========================================
*/

// Create project
router.post("/", protect, createProject);

// Update project
router.put("/:id", protect, updateProject);

// Delete project
router.delete("/:id", protect, deleteProject);

export default router;