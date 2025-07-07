import express from "express";
import ImageController from "../controllers/imageController.js";
import {
  validateImageId,
  validateTypeParam,
  validateParentId,
  validateImageCreate,
  validateBulkImageCreate,
  validateImageUpdate,
  validateGetImages,
  sanitizeImageData,
  validateImageContent,
} from "../middleware/imageValidation.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// @route   GET /api/images/type/:type/:parent_id/thumbnail
// @desc    Get thumbnail image for specific type and parent
// @access  Public
router.get(
  "/type/:type/:parent_id/thumbnail",
  validateTypeParam,
  validateParentId,
  ImageController.getThumbnailByTypeAndParent
);

// @route   GET /api/images/type/:type/:parent_id
// @desc    Get all images for specific type and parent
// @access  Public
router.get(
  "/type/:type/:parent_id",
  validateTypeParam,
  validateParentId,
  validateGetImages,
  ImageController.getImagesByTypeAndParent
);

// @route   PUT /api/images/type/:type/:parent_id/reorder
// @desc    Reorder images for specific type and parent
// @access  Private (Admin only)
router.put(
  "/type/:type/:parent_id/reorder",
  validateTypeParam,
  validateParentId,
  authenticateToken,
  requireAdmin,
  ImageController.reorderImages
);

// @route   DELETE /api/images/type/:type/:parent_id/all
// @desc    Delete all images for specific type and parent
// @access  Private (Admin only)
router.delete(
  "/type/:type/:parent_id/all",
  validateTypeParam,
  validateParentId,
  authenticateToken,
  requireAdmin,
  ImageController.deleteAllImagesByTypeAndParent
);

// @route   GET /api/images
// @desc    Get all images with pagination (Admin only)
// @access  Private (Admin only)
router.get("/", authenticateToken, requireAdmin, ImageController.getAllImages);

// @route   POST /api/images
// @desc    Create single or multiple images
// @access  Private (Admin only)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  sanitizeImageData,
  validateImageContent,
  // Custom validation middleware that handles both single and bulk creation
  (req, res, next) => {
    // Check if it's bulk creation
    if (req.body.images && Array.isArray(req.body.images)) {
      // Use bulk validation
      return validateBulkImageCreate[0](req, res, (err) => {
        if (err) return next(err);
        
        // Continue with remaining bulk validation middleware
        let index = 1;
        const runNext = () => {
          if (index < validateBulkImageCreate.length) {
            validateBulkImageCreate[index](req, res, (err) => {
              if (err) return next(err);
              index++;
              runNext();
            });
          } else {
            next();
          }
        };
        runNext();
      });
    } else {
      // Use single image validation
      return validateImageCreate[0](req, res, (err) => {
        if (err) return next(err);
        
        // Continue with remaining single validation middleware
        let index = 1;
        const runNext = () => {
          if (index < validateImageCreate.length) {
            validateImageCreate[index](req, res, (err) => {
              if (err) return next(err);
              index++;
              runNext();
            });
          } else {
            next();
          }
        };
        runNext();
      });
    }
  },
  ImageController.createImages
);

// @route   GET /api/images/:id
// @desc    Get single image by ID
// @access  Public
router.get("/:id", validateImageId, ImageController.getImageById);

// @route   PUT /api/images/:id
// @desc    Update image metadata
// @access  Private (Admin only)
router.put(
  "/:id",
  validateImageId,
  authenticateToken,
  requireAdmin,
  sanitizeImageData,
  validateImageContent,
  validateImageUpdate,
  ImageController.updateImage
);

// @route   DELETE /api/images/:id
// @desc    Delete image
// @access  Private (Admin only)
router.delete("/:id", validateImageId, authenticateToken, requireAdmin, ImageController.deleteImage);

export default router;