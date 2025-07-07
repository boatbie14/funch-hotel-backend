import express from "express";
import { HotelImagesController } from "../controllers/imagesController.js";
import {
  validateParentId,
  validateImageId,
  validateImageCreate,
  validateBulkImageCreate,
  validateImageUpdate,
  validateGetImages,
  sanitizeImageData,
  validateImageContent,
} from "../middleware/imagesValidation.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// @route   POST /api/hotel-images
// @desc    Create single image for hotel
// @access  Private (Admin only)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  sanitizeImageData,
  validateImageContent,
  validateImageCreate,
  HotelImagesController.createImage.bind(HotelImagesController)
);

// @route   POST /api/hotel-images/bulk
// @desc    Create multiple images for hotel
// @access  Private (Admin only)
router.post(
  "/bulk",
  authenticateToken,
  requireAdmin,
  sanitizeImageData,
  validateImageContent,
  validateBulkImageCreate,
  HotelImagesController.createBulkImages.bind(HotelImagesController)
);

// @route   GET /api/hotel-images/:hotel_id/thumbnail
// @desc    Get thumbnail image for hotel
// @access  Public
router.get("/:hotel_id/thumbnail", validateParentId("hotel_id"), HotelImagesController.getThumbnail.bind(HotelImagesController));

// @route   GET /api/hotel-images/:hotel_id
// @desc    Get all images for hotel
// @access  Public
router.get("/:hotel_id", validateParentId("hotel_id"), validateGetImages, HotelImagesController.getImages.bind(HotelImagesController));

// @route   PUT /api/hotel-images/:hotel_id/reorder
// @desc    Reorder hotel images
// @access  Private (Admin only)
router.put(
  "/:hotel_id/reorder",
  validateParentId("hotel_id"),
  authenticateToken,
  requireAdmin,
  // Validate reorder data
  (req, res, next) => {
    const { imageOrders } = req.body;

    if (!Array.isArray(imageOrders)) {
      return res.status(400).json({
        error: "Invalid Data",
        message: "imageOrders must be an array",
      });
    }

    if (imageOrders.length === 0) {
      return res.status(400).json({
        error: "Invalid Data",
        message: "imageOrders array cannot be empty",
      });
    }

    // Validate each order item
    for (let i = 0; i < imageOrders.length; i++) {
      const item = imageOrders[i];

      if (!item || typeof item !== "object") {
        return res.status(400).json({
          error: "Invalid Data",
          message: `Item at index ${i} must be an object`,
        });
      }

      if (!item.imageId || typeof item.imageId !== "string") {
        return res.status(400).json({
          error: "Invalid Data",
          message: `Item at index ${i} must have imageId (string)`,
        });
      }

      if (typeof item.order !== "number" || item.order < 0) {
        return res.status(400).json({
          error: "Invalid Data",
          message: `Item at index ${i} must have order (non-negative number)`,
        });
      }

      // Validate UUID format for imageId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(item.imageId)) {
        return res.status(400).json({
          error: "Invalid Data",
          message: `Item at index ${i} has invalid imageId format (must be UUID)`,
        });
      }
    }

    next();
  },
  HotelImagesController.reorderImages.bind(HotelImagesController)
);

// @route   DELETE /api/hotel-images/:hotel_id/all
// @desc    Delete all images for hotel
// @access  Private (Admin only)
router.delete(
  "/:hotel_id/all",
  validateParentId("hotel_id"),
  authenticateToken,
  requireAdmin,
  HotelImagesController.deleteAllImages.bind(HotelImagesController)
);

// Single image routes (these should come after specific routes to avoid conflicts)

// @route   GET /api/hotel-images/:id
// @desc    Get single image by ID
// @access  Public
router.get("/:id", validateImageId, HotelImagesController.getImageById.bind(HotelImagesController));

// @route   PUT /api/hotel-images/:id
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
  HotelImagesController.updateImage.bind(HotelImagesController)
);

// @route   DELETE /api/hotel-images/:id
// @desc    Delete single image
// @access  Private (Admin only)
router.delete("/:id", validateImageId, authenticateToken, requireAdmin, HotelImagesController.deleteImage.bind(HotelImagesController));

export default router;
