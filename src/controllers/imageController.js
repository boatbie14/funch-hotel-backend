import ImageService from "../services/imageService.js";

class ImageController {
  // @route   POST /api/images
  // @desc    Create single or multiple images
  // @access  Private (Admin only)
  async createImages(req, res) {
    try {
      const { type, hotel_id, room_id, images, img_url, title_th, title_en, alt_th, alt_en, order, is_thumb } = req.body;

      // Check if it's bulk creation (has images array) or single image
      if (images && Array.isArray(images)) {
        // Bulk creation
        const bulkData = {
          type,
          hotel_id,
          room_id,
          images,
        };

        const result = await ImageService.createBulkImages(bulkData);

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
            type: type,
            [`${type}_id`]: type === "hotel" ? hotel_id : room_id,
            summary: {
              totalCreated: result.totalCreated,
              totalFailed: result.totalFailed,
              totalImages: images.length,
            },
          },
          errors: result.errors.length > 0 ? result.errors : undefined,
        });
      } else {
        // Single image creation
        const imageData = {
          type,
          hotel_id,
          room_id,
          img_url,
          title_th,
          title_en,
          alt_th,
          alt_en,
          order,
          is_thumb,
        };

        const result = await ImageService.createImage(imageData);

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
      }
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/images/:id
  // @desc    Get single image by ID
  // @access  Public
  async getImageById(req, res) {
    try {
      const { id } = req.params;
      const result = await ImageService.getImageById(id);

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

  // @route   GET /api/images/type/:type/:parent_id
  // @desc    Get all images for specific type and parent
  // @access  Public
  async getImagesByTypeAndParent(req, res) {
    try {
      const { type, parent_id } = req.params;
      const filters = {
        is_thumb: req.query.is_thumb,
        orderBy: req.query.orderBy || "order",
        sortDirection: req.query.sortDirection || "asc",
      };

      const result = await ImageService.getImagesByTypeAndParent(type, parent_id, filters);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} images retrieved successfully`,
        data: result.data,
        type: type,
        [`${type}_id`]: parent_id,
        count: result.count,
        filters: {
          is_thumb: filters.is_thumb,
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

  // @route   GET /api/images/type/:type/:parent_id/thumbnail
  // @desc    Get thumbnail image for specific type and parent
  // @access  Public
  async getThumbnailByTypeAndParent(req, res) {
    try {
      const { type, parent_id } = req.params;
      const result = await ImageService.getThumbnailByTypeAndParent(type, parent_id);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} thumbnail retrieved successfully`,
        data: result.data,
        type: type,
        [`${type}_id`]: parent_id,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   PUT /api/images/:id
  // @desc    Update image metadata
  // @access  Private (Admin only)
  async updateImage(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const result = await ImageService.updateImage(id, updateData);

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

  // @route   DELETE /api/images/:id
  // @desc    Delete image
  // @access  Private (Admin only)
  async deleteImage(req, res) {
    try {
      const { id } = req.params;
      const result = await ImageService.deleteImage(id);

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

  // @route   DELETE /api/images/type/:type/:parent_id/all
  // @desc    Delete all images for specific type and parent
  // @access  Private (Admin only)
  async deleteAllImagesByTypeAndParent(req, res) {
    try {
      const { type, parent_id } = req.params;
      const result = await ImageService.deleteAllImagesByTypeAndParent(type, parent_id);

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
          type: type,
          [`${type}_id`]: parent_id,
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

  // @route   PUT /api/images/type/:type/:parent_id/reorder
  // @desc    Reorder images for specific type and parent
  // @access  Private (Admin only)
  async reorderImages(req, res) {
    try {
      const { type, parent_id } = req.params;
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

      const result = await ImageService.reorderImages(type, parent_id, imageOrders);

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
          type: type,
          [`${type}_id`]: parent_id,
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

  // @route   GET /api/images
  // @desc    Get all images with pagination (Admin only)
  // @access  Private (Admin only)
  async getAllImages(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const filters = {
        type: req.query.type,
        is_thumb: req.query.is_thumb,
      };

      const result = await ImageService.getAllImages(page, limit, filters);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Images retrieved successfully",
        data: result.data,
        pagination: result.pagination,
        filters: filters,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }
}

export default new ImageController();
