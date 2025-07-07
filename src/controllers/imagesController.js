import { HotelImagesService, RoomImagesService } from "../services/imagesService.js";

class ImagesController {
  constructor(imagesService, entityType) {
    this.imagesService = imagesService;
    this.entityType = entityType; // 'hotel' or 'room'
    this.parentIdParam = `${entityType}_id`; // 'hotel_id' or 'room_id'
  }

  // @route   POST /api/hotel-images
  // @desc    Create single image
  // @access  Private (Admin only)
  async createImage(req, res) {
    try {
      const { hotel_id, img_url, title_th, title_en, alt_th, alt_en, order, isThumb } = req.body;

      const imageData = {
        title_th: title_th || null,
        title_en: title_en || null,
        alt_th: alt_th || null,
        alt_en: alt_en || null,
        order: order !== undefined ? order : undefined,
        isThumb: isThumb || false,
      };

      const result = await this.imagesService.createImageFromUrl(hotel_id, img_url, imageData);

      if (!result.success) {
        return res.status(400).json({
          error: "Create Error",
          message: result.error,
        });
      }

      res.status(201).json({
        success: true,
        message: "Image created successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/hotel-images/bulk
  // @desc    Create multiple images
  // @access  Private (Admin only)
  async createBulkImages(req, res) {
    try {
      const { hotel_id, images } = req.body;

      const result = await this.imagesService.createBulkImagesFromUrls(hotel_id, images);

      if (!result.success) {
        return res.status(400).json({
          error: "Bulk Create Error",
          message: result.error,
        });
      }

      // Determine response status based on results
      const statusCode = result.totalFailed > 0 ? 207 : 201; // 207 = Multi-Status

      res.status(statusCode).json({
        success: result.success,
        message:
          result.totalFailed > 0
            ? `Partial creation completed. ${result.totalCreated} succeeded, ${result.totalFailed} failed.`
            : `All images created successfully`,
        data: {
          createdImages: result.results,
          [`${this.entityType}_id`]: hotel_id,
          summary: {
            totalCreated: result.totalCreated,
            totalFailed: result.totalFailed,
            totalImages: images.length,
          },
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotel-images/:hotel_id
  // @desc    Get all images for hotel/room
  // @access  Public
  async getImages(req, res) {
    try {
      const parentId = req.params[this.parentIdParam];
      const filters = {
        isThumb: req.query.isThumb,
        orderBy: req.query.orderBy || "order",
        sortDirection: req.query.sortDirection || "asc",
      };

      const result = await this.imagesService.getImagesByParentId(parentId, filters);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: `${this.entityType.charAt(0).toUpperCase() + this.entityType.slice(1)} images retrieved successfully`,
        data: result.data,
        [`${this.entityType}_id`]: parentId,
        count: result.count,
        filters: {
          isThumb: filters.isThumb,
          orderBy: filters.orderBy,
          sortDirection: filters.sortDirection,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotel-images/:id
  // @desc    Get single image by ID
  // @access  Public
  async getImageById(req, res) {
    try {
      const { id } = req.params;
      const result = await this.imagesService.getImageById(id);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Image retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   PUT /api/hotel-images/:id
  // @desc    Update image metadata
  // @access  Private (Admin only)
  async updateImage(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const result = await this.imagesService.updateImage(id, updateData);

      if (!result.success) {
        if (result.error.includes("Image not found")) {
          return res.status(404).json({
            error: "Not Found",
            message: result.error,
          });
        }

        return res.status(400).json({
          error: "Update Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Image updated successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   DELETE /api/hotel-images/:id
  // @desc    Delete image
  // @access  Private (Admin only)
  async deleteImage(req, res) {
    try {
      const { id } = req.params;
      const result = await this.imagesService.deleteImage(id);

      if (!result.success) {
        if (result.error.includes("Image not found")) {
          return res.status(404).json({
            error: "Not Found",
            message: result.error,
          });
        }

        return res.status(400).json({
          error: "Delete Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Image deleted successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   DELETE /api/hotel-images/:hotel_id/all
  // @desc    Delete all images for hotel/room
  // @access  Private (Admin only)
  async deleteAllImages(req, res) {
    try {
      const parentId = req.params[this.parentIdParam];
      const result = await this.imagesService.deleteAllImagesByParentId(parentId);

      if (!result.success) {
        return res.status(400).json({
          error: "Delete Error",
          message: result.error,
        });
      }

      // Determine response status based on results
      const statusCode = result.totalFailed > 0 ? 207 : 200; // 207 = Multi-Status

      res.status(statusCode).json({
        success: result.success,
        message:
          result.totalFailed > 0
            ? `Partial deletion completed. ${result.totalDeleted} succeeded, ${result.totalFailed} failed.`
            : `All images deleted successfully`,
        data: {
          deletedImages: result.deletedImages,
          [`${this.entityType}_id`]: parentId,
          summary: {
            totalDeleted: result.totalDeleted,
            totalFailed: result.totalFailed,
          },
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   PUT /api/hotel-images/:hotel_id/reorder
  // @desc    Reorder images
  // @access  Private (Admin only)
  async reorderImages(req, res) {
    try {
      const parentId = req.params[this.parentIdParam];
      const { imageOrders } = req.body;

      const result = await this.imagesService.reorderImages(parentId, imageOrders);

      if (!result.success) {
        return res.status(400).json({
          error: "Reorder Error",
          message: result.error,
        });
      }

      // Determine response status based on results
      const statusCode = result.totalFailed > 0 ? 207 : 200; // 207 = Multi-Status

      res.status(statusCode).json({
        success: result.success,
        message:
          result.totalFailed > 0
            ? `Partial reorder completed. ${result.totalUpdated} succeeded, ${result.totalFailed} failed.`
            : `Images reordered successfully`,
        data: {
          reorderedImages: result.results,
          [`${this.entityType}_id`]: parentId,
          summary: {
            totalUpdated: result.totalUpdated,
            totalFailed: result.totalFailed,
          },
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotel-images/:hotel_id/thumbnail
  // @desc    Get thumbnail image for hotel/room
  // @access  Public
  async getThumbnail(req, res) {
    try {
      const parentId = req.params[this.parentIdParam];
      const filters = {
        isThumb: true,
        orderBy: "order",
        sortDirection: "asc",
      };

      const result = await this.imagesService.getImagesByParentId(parentId, filters);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      if (result.count === 0) {
        return res.status(404).json({
          error: "Not Found",
          message: `No thumbnail image found for this ${this.entityType}`,
        });
      }

      res.json({
        success: true,
        message: `${this.entityType.charAt(0).toUpperCase() + this.entityType.slice(1)} thumbnail retrieved successfully`,
        data: result.data[0], // Return first (should be only) thumbnail
        [`${this.entityType}_id`]: parentId,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }
}

// Create specific controller instances
export const HotelImagesController = new ImagesController(HotelImagesService, "hotel");
export const RoomImagesController = new ImagesController(RoomImagesService, "room");

export default ImagesController;
