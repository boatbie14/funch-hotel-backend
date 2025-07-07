import { supabase } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class ImagesService {
  constructor(tableName, parentIdField) {
    this.tableName = tableName;
    this.parentIdField = parentIdField; // 'hotel_id' or 'room_id'
  }

  // Upload file to Supabase Storage
  async uploadFileToStorage(file, folder, fileName) {
    try {
      const filePath = `${folder}/${fileName}`;

      const { data, error } = await supabase.storage.from("hotel-images").upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from("hotel-images").getPublicUrl(filePath);

      return {
        success: true,
        filePath: data.path,
        publicUrl: urlData.publicUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete file from Supabase Storage
  async deleteFileFromStorage(filePath) {
    try {
      const { error } = await supabase.storage.from("hotel-images").remove([filePath]);

      if (error) {
        throw new Error(`Storage delete failed: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Extract file path from URL
  extractFilePathFromUrl(url) {
    try {
      // Extract path from Supabase storage URL
      const urlParts = url.split("/hotel-images/");
      return urlParts.length > 1 ? urlParts[1] : null;
    } catch (error) {
      return null;
    }
  }

  // Verify parent exists (hotel or room)
  async verifyParentExists(parentId) {
    try {
      const parentTable = this.parentIdField === "hotel_id" ? "hotels" : "rooms";
      const { data, error } = await supabase.from(parentTable).select("id").eq("id", parentId).single();

      if (error) {
        throw new Error(`${parentTable.slice(0, -1)} not found: ${error.message}`);
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check for existing thumbnail
  async checkExistingThumbnail(parentId, excludeImageId = null) {
    try {
      let query = supabase.from(this.tableName).select("id").eq(this.parentIdField, parentId).eq("isThumb", true);

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

  // Remove existing thumbnail status
  async removeExistingThumbnail(parentId, excludeImageId = null) {
    try {
      let query = supabase.from(this.tableName).update({ isThumb: false }).eq(this.parentIdField, parentId).eq("isThumb", true);

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

  // Get next order number
  async getNextOrderNumber(parentId) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("order")
        .eq(this.parentIdField, parentId)
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

  // Create single image from URL
  async createImageFromUrl(parentId, imgUrl, imageData = {}) {
    try {
      // Verify parent exists
      const parentCheck = await this.verifyParentExists(parentId);
      if (!parentCheck.success) {
        throw new Error(parentCheck.error);
      }

      // Handle thumbnail logic
      if (imageData.isThumb === true) {
        await this.removeExistingThumbnail(parentId);
      }

      // Get order number if not provided
      let order = imageData.order;
      if (order === undefined) {
        const orderResult = await this.getNextOrderNumber(parentId);
        if (!orderResult.success) {
          throw new Error(orderResult.error);
        }
        order = orderResult.nextOrder;
      }

      // Prepare image record
      const imageRecord = {
        id: uuidv4(),
        [this.parentIdField]: parentId,
        img_url: imgUrl,
        title_th: imageData.title_th || null,
        title_en: imageData.title_en || null,
        alt_th: imageData.alt_th || null,
        alt_en: imageData.alt_en || null,
        order: order,
        isThumb: imageData.isThumb || false,
        created_at: new Date().toISOString(),
      };

      // Insert image record to database
      const { data, error } = await supabase.from(this.tableName).insert(imageRecord).select().single();

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

  // Create multiple images from URLs
  async createBulkImagesFromUrls(parentId, imagesData) {
    try {
      // Verify parent exists
      const parentCheck = await this.verifyParentExists(parentId);
      if (!parentCheck.success) {
        throw new Error(parentCheck.error);
      }

      const results = [];
      const errors = [];
      let hasNewThumbnail = false;

      // Check if any new image will be set as thumbnail
      for (const imageData of imagesData) {
        if (imageData.isThumb === true) {
          hasNewThumbnail = true;
          break;
        }
      }

      // If new thumbnail is being set, remove existing thumbnail
      if (hasNewThumbnail) {
        await this.removeExistingThumbnail(parentId);
      }

      // Get starting order number
      const orderResult = await this.getNextOrderNumber(parentId);
      if (!orderResult.success) {
        throw new Error(orderResult.error);
      }
      let currentOrder = orderResult.nextOrder;

      for (let i = 0; i < imagesData.length; i++) {
        const imageData = imagesData[i];

        try {
          // Prepare image record
          const imageRecord = {
            id: uuidv4(),
            [this.parentIdField]: parentId,
            img_url: imageData.img_url,
            title_th: imageData.title_th || null,
            title_en: imageData.title_en || null,
            alt_th: imageData.alt_th || null,
            alt_en: imageData.alt_en || null,
            order: imageData.order !== undefined ? imageData.order : currentOrder++,
            isThumb: imageData.isThumb || false,
            created_at: new Date().toISOString(),
          };

          // Insert image record to database
          const { data, error } = await supabase.from(this.tableName).insert(imageRecord).select().single();

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
  async uploadImages(parentId, files, imagesData = []) {
    try {
      // Verify parent exists
      const parentCheck = await this.verifyParentExists(parentId);
      if (!parentCheck.success) {
        throw new Error(parentCheck.error);
      }

      const results = [];
      const errors = [];
      let hasNewThumbnail = false;

      // Check if any new image will be set as thumbnail
      for (let i = 0; i < files.length; i++) {
        const imageData = imagesData[i] || {};
        if (imageData.isThumb) {
          hasNewThumbnail = true;
          break;
        }
      }

      // If new thumbnail is being set, remove existing thumbnail
      if (hasNewThumbnail) {
        await this.removeExistingThumbnail(parentId);
      }

      // Get starting order number
      const orderResult = await this.getNextOrderNumber(parentId);
      if (!orderResult.success) {
        throw new Error(orderResult.error);
      }
      let currentOrder = orderResult.nextOrder;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageData = imagesData[i] || {};

        try {
          // Generate unique filename
          const fileExtension = file.originalname.split(".").pop().toLowerCase();
          const fileName = `${uuidv4()}.${fileExtension}`;
          const folder = `${this.parentIdField.replace("_id", "")}/${parentId}`;

          // Upload file to storage
          const uploadResult = await this.uploadFileToStorage(file, folder, fileName);
          if (!uploadResult.success) {
            throw new Error(uploadResult.error);
          }

          // Prepare image record
          const imageRecord = {
            id: uuidv4(),
            [this.parentIdField]: parentId,
            img_url: uploadResult.publicUrl,
            title_th: imageData.title_th || null,
            title_en: imageData.title_en || null,
            alt_th: imageData.alt_th || null,
            alt_en: imageData.alt_en || null,
            order: imageData.order !== undefined ? imageData.order : currentOrder++,
            isThumb: imageData.isThumb || false,
            created_at: new Date().toISOString(),
          };

          // Insert image record to database
          const { data, error } = await supabase.from(this.tableName).insert(imageRecord).select().single();

          if (error) {
            // If database insert fails, clean up uploaded file
            await this.deleteFileFromStorage(uploadResult.filePath);
            throw new Error(`Database insert failed: ${error.message}`);
          }

          results.push({
            success: true,
            data: data,
            originalName: file.originalname,
          });
        } catch (error) {
          errors.push({
            originalName: file.originalname,
            error: error.message,
          });
        }
      }

      return {
        success: errors.length === 0,
        results: results,
        errors: errors,
        totalUploaded: results.length,
        totalFailed: errors.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get images by parent ID
  async getImagesByParentId(parentId, filters = {}) {
    try {
      // Verify parent exists
      const parentCheck = await this.verifyParentExists(parentId);
      if (!parentCheck.success) {
        throw new Error(parentCheck.error);
      }

      let query = supabase.from(this.tableName).select("*").eq(this.parentIdField, parentId);

      // Apply filters
      if (filters.isThumb !== undefined) {
        query = query.eq("isThumb", filters.isThumb);
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
      const { data, error } = await supabase.from(this.tableName).select("*").eq("id", imageId).single();

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
      if (cleanData.isThumb === true) {
        // Remove existing thumbnail for this parent
        await this.removeExistingThumbnail(currentData[this.parentIdField], imageId);
      }

      const { data, error } = await supabase.from(this.tableName).update(cleanData).eq("id", imageId).select().single();

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

      // Delete from database first
      const { data, error } = await supabase.from(this.tableName).delete().eq("id", imageId).select().single();

      if (error) {
        throw new Error(`Failed to delete image from database: ${error.message}`);
      }

      // Extract file path and delete from storage
      const filePath = this.extractFilePathFromUrl(imageData.img_url);
      if (filePath) {
        const storageResult = await this.deleteFileFromStorage(filePath);
        if (!storageResult.success) {
          console.warn(`Warning: Failed to delete file from storage: ${storageResult.error}`);
          // Don't fail the entire operation if storage cleanup fails
        }
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
  async deleteAllImagesByParentId(parentId) {
    try {
      // Get all images for this parent
      const imagesResult = await this.getImagesByParentId(parentId);
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

  // Reorder images
  async reorderImages(parentId, imageOrders) {
    try {
      // Verify parent exists
      const parentCheck = await this.verifyParentExists(parentId);
      if (!parentCheck.success) {
        throw new Error(parentCheck.error);
      }

      const results = [];
      const errors = [];

      for (const { imageId, order } of imageOrders) {
        try {
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
}

// Create specific instances for hotel and room images
export const HotelImagesService = new ImagesService("hotel_images", "hotel_id");
export const RoomImagesService = new ImagesService("room_images", "room_id");

export default ImagesService;
