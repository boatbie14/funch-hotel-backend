import express from "express";
import MetadataController from "../controllers/metadataController.js";

const router = express.Router();

// @route   GET /api/metadata/search
// @desc    Search metadata by title, description, or keywords
// @access  Public
router.get("/search", MetadataController.searchMetadata);

// @route   GET /api/metadata/active
// @desc    Get only active metadata (status = true)
// @access  Public
router.get("/active", MetadataController.getActiveMetadata);

// @route   GET /api/metadata/slug/:slug
// @desc    Get metadata by slug
// @access  Public
router.get("/slug/:slug", MetadataController.getMetadataBySlug);

// @route   GET /api/metadata/:id
// @desc    Get metadata by ID
// @access  Public
router.get("/:id", MetadataController.getMetadataById);

// @route   GET /api/metadata
// @desc    Get all metadata with pagination and optional status filter
// @access  Public
router.get("/", MetadataController.getAllMetadata);

export default router;
