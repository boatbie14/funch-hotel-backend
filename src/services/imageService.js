import { supabase } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class ImageService {
  // Verify if parent exists (hotel or room)
  async verifyParentExists(type, parentId) {
    try {
      const tableName = type === "hotel" ? "hotels" : "rooms";
      const { data, error } = await supabase.from(tableName).select("id").eq("id", parentId).single();

      if (error) {
        throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} not found: ${error.message}`);
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check for existing thumbnail for a parent
  async checkExistingThumbnail(type, parentId, excludeImageId = null) {
    try {
      const parentIdField = `${type}_id`;
      let query = supabase.from("images").select("id").eq("type", type).eq(parentIdField, parentId).eq("is_thumb", true);

      if (excludeImageId) {
        query = query.neq("id", excludeImageId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        hasExistingThumbnail: data.length > 0,
        thumbnailId: data.length > 0 ? data[0].id : null,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Remove existing thumbnail status for a parent
  async removeExistingThumbnail(type, parentId, excludeImageId = null) {
    try {
      const parentIdField = `${type}_id`;
      let query = supabase.from("images").update({ is_thumb: false }).eq("type", type).eq(parentIdField, parentId).eq("is_thumb", true);

      if (excludeImageId) {
        query = query.neq("id", excludeImageId);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to remove existing thumbnail: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get next order number for a parent
  async getNextOrderNumber(type, parentId) {
    try {
      const parentIdField = `${type}_id`;
      const { data, error } = await supabase
        .from("images")
        .select("order")
        .eq("type", type)
        .eq(parentIdField, parentId)
        .order("order", { ascending: false })
        .limit(1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const maxOrder = data.length > 0 ? data[0].order : -1;
      return {
        success: true,
        nextOrder: maxOrder + 1,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create single image
  async createImage(imageData) {
    try {
      const { type, hotel_id, room_id, img_url, title_th, title_en, alt_th, alt_en, order, is_thumb } = imageData;

      // Determine parent ID based on type
      const parentId = type === "hotel" ? hotel_id : room_id;

      // Verify parent exists
      const parentCheck = await this.verifyParentExists(type, parentId);
      if (!parentCheck.success) {
        throw new Error(parentCheck.error);
      }

      // Handle thumbnail logic
      if (is_thumb === true) {
        await this.removeExistingThumbnail(type, parentId);
      }

      // Get order number if not provided
      let finalOrder = order;
      if (finalOrder === undefined) {
        const orderResult = await this.getNextOrderNumber(type, parentId);
        if (!orderResult.success) {
          throw new Error(orderResult.error);
        }
        finalOrder = orderResult.nextOrder;
      }

      // Prepare image record
      const imageRecord = {
        id: uuidv4(),
        type: type,
        hotel_id: type === "hotel" ? hotel_id : null,
        room_id: type === "room" ? room_id : null,
        img_url: img_url,
        title_th: title_th || null,
        title_en: title_en || null,
        alt_th: alt_th || null,
        alt_en: alt_en || null,
        order: finalOrder,
        is_thumb: is_thumb || false,
        created_at: new Date().toISOString(),
      };

      // Insert image record to database
      const { data, error } = await supabase.from("images").insert(imageRecord).select().single();

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create multiple images
  async createBulkImages(bulkData) {
    try {
      const { type, hotel_id, room_id, images } = bulkData;

      // Determine parent ID based on type
      const parentId = type === "hotel" ? hotel_id : room_id;

      // Verify parent exists
      const parentCheck = await this.verifyParentExists(type, parentId);
      if (!parentCheck.success) {
        throw new Error(parentCheck.error);
      }

      const results = [];
      const errors = [];
      let hasNewThumbnail = false;

      // Check if any new image will be set as thumbnail
      for (const imageData of images) {
        if (imageData.is_thumb === true) {
          hasNewThumbnail = true;
          break;
        }
      }

      // If new thumbnail is being set, remove existing thumbnail
      if (hasNewThumbnail) {
        await this.removeExistingThumbnail(type, parentId);
      }

      // Get starting order number
      const orderResult = await this.getNextOrderNumber(type, parentId);
      if (!orderResult.success) {
        throw new Error(orderResult.error);
      }
      let currentOrder = orderResult.nextOrder;

      for (let i = 0; i < images.length; i++) {
        const imageData = images[i];

        try {
          // Prepare image record
          const imageRecord = {
            id: uuidv4(),
            type: type,
            hotel_id: type === "hotel" ? hotel_id : null,
            room_id: type === "room" ? room_id : null,
            img_url: imageData.img_url,
            title_th: imageData.title_th || null,
            title_en: imageData.title_en || null,
            alt_th: imageData.alt_th || null,
            alt_en: imageData.alt_en || null,
            order: imageData.order !== undefined ? imageData.order : currentOrder++,
            is_thumb: imageData.is_thumb || false,
            created_at: new Date().toISOString(),
          };

          // Insert image record to database
          const { data, error } = await supabase.from("images").insert(imageRecord).select().single();

          if (error) {
            throw new Error(`Database insert failed: ${error.message}`);
          }

          results.push({
            success: true,
            data: data,
            originalUrl: imageData.img_url,
          });
        } catch (error) {
          errors.push({
            originalUrl: imageData.img_url,
            error: error.message,
          });
        }
      }

      return {
        success: errors.length === 0,
        results: results,
        errors: errors,
        totalCreated: results.length,
        totalFailed: errors.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get images by type and parent ID
  async getImagesByTypeAndParent(type, parentId, filters = {}) {
    try {
      // Verify parent exists
      const parentCheck = await this.verifyParentExists(type, parentId);
      if (!parentCheck.success) {
        throw new Error(parentCheck.error);
      }

      const parentIdField = `${type}_id`;
      let query = supabase.from("images").select("*").eq("type", type).eq(parentIdField, parentId);

      // Apply filters
      if (filters.is_thumb !== undefined) {
        query = query.eq("is_thumb", filters.is_thumb);
      }

      // Apply ordering
      const orderBy = filters.orderBy || "order";
      const sortDirection = filters.sortDirection || "asc";
      query = query.order(orderBy, { ascending: sortDirection === "asc" });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        data: data,
        count: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get image by ID
  async getImageById(imageId) {
    try {
      const { data, error } = await supabase.from("images").select("*").eq("id", imageId).single();

      if (error) {
        throw new Error(`Image not found: ${error.message}`);
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update image
  async updateImage(imageId, updateData) {
    try {
      // Get current image data
      const currentImage = await this.getImageById(imageId);
      if (!currentImage.success) {
        throw new Error(currentImage.error);
      }

      const currentData = currentImage.data;

      // Remove undefined fields
      const cleanData = {};
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          cleanData[key] = updateData[key];
        }
      });

      // Handle thumbnail logic
      if (cleanData.is_thumb === true) {
        // Remove existing thumbnail for this parent
        const parentId = currentData.type === "hotel" ? currentData.hotel_id : currentData.room_id;
        await this.removeExistingThumbnail(currentData.type, parentId, imageId);
      }

      const { data, error } = await supabase.from("images").update(cleanData).eq("id", imageId).select().single();

      if (error) {
        throw new Error(`Failed to update image: ${error.message}`);
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete image
  async deleteImage(imageId) {
    try {
      // Get image data first
      const imageResult = await this.getImageById(imageId);
      if (!imageResult.success) {
        throw new Error(imageResult.error);
      }

      const imageData = imageResult.data;

      // Delete from database
      const { data, error } = await supabase.from("images").delete().eq("id", imageId).select().single();

      if (error) {
        throw new Error(`Failed to delete image from database: ${error.message}`);
      }

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete all images for a parent (useful when deleting hotel/room)
  async deleteAllImagesByTypeAndParent(type, parentId) {
    try {
      // Get all images for this parent
      const imagesResult = await this.getImagesByTypeAndParent(type, parentId);
      if (!imagesResult.success) {
        throw new Error(imagesResult.error);
      }

      const images = imagesResult.data;
      const deletedImages = [];
      const errors = [];

      for (const image of images) {
        try {
          const deleteResult = await this.deleteImage(image.id);
          if (deleteResult.success) {
            deletedImages.push(deleteResult.data);
          } else {
            errors.push({
              imageId: image.id,
              error: deleteResult.error,
            });
          }
        } catch (error) {
          errors.push({
            imageId: image.id,
            error: error.message,
          });
        }
      }

      return {
        success: errors.length === 0,
        deletedImages: deletedImages,
        errors: errors,
        totalDeleted: deletedImages.length,
        totalFailed: errors.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get thumbnail for a parent
  async getThumbnailByTypeAndParent(type, parentId) {
    try {
      const result = await this.getImagesByTypeAndParent(type, parentId, {
        is_thumb: true,
        orderBy: "order",
        sortDirection: "asc",
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.count === 0) {
        return {
          success: false,
          error: `No thumbnail image found for this ${type}`,
        };
      }

      return {
        success: true,
        data: result.data[0], // Return first (should be only) thumbnail
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Reorder images for a parent
  async reorderImages(type, parentId, imageOrders) {
    try {
      // Verify parent exists
      const parentCheck = await this.verifyParentExists(type, parentId);
      if (!parentCheck.success) {
        throw new Error(parentCheck.error);
      }

      const results = [];
      const errors = [];

      for (const { imageId, order } of imageOrders) {
        try {
          // Verify image belongs to this parent
          const imageResult = await this.getImageById(imageId);
          if (!imageResult.success) {
            throw new Error(`Image ${imageId} not found`);
          }

          const imageData = imageResult.data;
          const imageParentId = imageData.type === "hotel" ? imageData.hotel_id : imageData.room_id;

          if (imageData.type !== type || imageParentId !== parentId) {
            throw new Error(`Image ${imageId} does not belong to this ${type}`);
          }

          const updateResult = await this.updateImage(imageId, { order });
          if (updateResult.success) {
            results.push(updateResult.data);
          } else {
            errors.push({
              imageId,
              error: updateResult.error,
            });
          }
        } catch (error) {
          errors.push({
            imageId,
            error: error.message,
          });
        }
      }

      return {
        success: errors.length === 0,
        results: results,
        errors: errors,
        totalUpdated: results.length,
        totalFailed: errors.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get all images (for admin purposes)
  async getAllImages(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;

      let query = supabase.from("images").select("*", { count: "exact" });

      // Apply filters
      if (filters.type) {
        query = query.eq("type", filters.type);
      }

      if (filters.is_thumb !== undefined) {
        query = query.eq("is_thumb", filters.is_thumb);
      }

      // Get total count for pagination
      const { count, error: countError } = await query;

      if (countError) {
        throw new Error(`Failed to get images count: ${countError.message}`);
      }

      // Get images with pagination
      query = supabase.from("images").select("*");

      if (filters.type) {
        query = query.eq("type", filters.type);
      }

      if (filters.is_thumb !== undefined) {
        query = query.eq("is_thumb", filters.is_thumb);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: data,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new ImageService();
