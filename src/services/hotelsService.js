import { supabase } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class HotelsService {
  // Get all hotels with pagination and optional filters (PUBLIC VERSION)
  async getAllHotelsPublic(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const { cityId } = filters;

      // Build base query with joins - PUBLIC VERSION (only active hotels)
      let countQuery = supabase.from("hotels").select("*", { count: "exact", head: true }).eq("status", true); // Only active hotels for public

      let dataQuery = supabase
        .from("hotels")
        .select(
          `
          id, name_th, name_en, description_th, description_en,
          excerpt_th, excerpt_en, location_th, location_en, 
          google_map_link, checkin_time, checkout_time, status, 
          created_at, seo_title_th, seo_description_th,
          seo_title_en, seo_description_en, slug,
          hotel_location!inner (
            created_at,
            cities!inner (
              name_th, name_en,
              country:country_id (
                name_th, name_en, image
              )
            )
          )
        `
        )
        .eq("status", true); // Only active hotels for public

      // Apply filters
      if (cityId) {
        countQuery = countQuery.eq("hotel_location.city_id", cityId);
        dataQuery = dataQuery.eq("hotel_location.city_id", cityId);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) {
        throw new Error(`Failed to get hotels count: ${countError.message}`);
      }

      // Get data with pagination
      const { data, error } = await dataQuery.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Keep nested structure for public API, just remove IDs
      // No processing needed - Supabase already returns without IDs

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: data,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get all hotels with pagination and optional filters
  async getAllHotels(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const { cityId, status } = filters;

      // Build base query with joins
      let countQuery = supabase.from("hotels").select("*", { count: "exact", head: true });

      let dataQuery = supabase.from("hotels").select(`
          id, name_th, name_en, description_th, description_en,
          excerpt_th, excerpt_en, location_th, location_en, 
          google_map_link, checkin_time, checkout_time, status, 
          created_at, last_update, seo_title_th, seo_description_th,
          seo_title_en, seo_description_en, slug,
          hotel_location!inner (
            id, city_id, created_at,
            cities!inner (
              id, name_th, name_en,
              country:country_id (
                id, name_th, name_en, image
              )
            )
          )
        `);

      // Apply filters
      if (cityId) {
        countQuery = countQuery.eq("hotel_location.city_id", cityId);
        dataQuery = dataQuery.eq("hotel_location.city_id", cityId);
      }

      if (status !== null && status !== undefined) {
        countQuery = countQuery.eq("status", status);
        dataQuery = dataQuery.eq("status", status);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) {
        throw new Error(`Failed to get hotels count: ${countError.message}`);
      }

      // Get data with pagination
      const { data, error } = await dataQuery.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: data,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hotel by ID with all related data
  async getHotelById(id) {
    try {
      const { data, error } = await supabase
        .from("hotels")
        .select(
          `
          id, name_th, name_en, description_th, description_en,
          excerpt_th, excerpt_en, location_th, location_en, 
          google_map_link, checkin_time, checkout_time, status, 
          created_at, last_update, last_update_by, seo_title_th, 
          seo_description_th, seo_title_en, seo_description_en, slug,
          hotel_location!inner (
            id, city_id, created_at,
            cities!inner (
              id, name_th, name_en,
              country:country_id (
                id, name_th, name_en, image
              )
            )
          ),
          user_admin:last_update_by (
            id, username
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Hotel not found: ${error.message}`);
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

  // Get hotel by slug (PUBLIC VERSION)
  async getHotelBySlugPublic(slug) {
    try {
      const { data, error } = await supabase
        .from("hotels")
        .select(
          `
          id, name_th, name_en, description_th, description_en,
          excerpt_th, excerpt_en, location_th, location_en, 
          google_map_link, checkin_time, checkout_time, status, 
          created_at, seo_title_th, seo_description_th,
          seo_title_en, seo_description_en, slug,
          hotel_location!inner (
            created_at,
            cities!inner (
              name_th, name_en,
              country:country_id (
                name_th, name_en, image
              )
            )
          )
        `
        )
        .eq("slug", slug)
        .eq("status", true) // Only active hotels for public
        .single();

      if (error) {
        throw new Error(`Hotel not found: ${error.message}`);
      }

      // Keep nested structure for public API (single hotel)
      // No processing needed - Supabase already returns without IDs

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

  // Get hotel by slug
  async getHotelBySlug(slug) {
    try {
      const { data, error } = await supabase
        .from("hotels")
        .select(
          `
          id, name_th, name_en, description_th, description_en,
          excerpt_th, excerpt_en, location_th, location_en, 
          google_map_link, checkin_time, checkout_time, status, 
          created_at, last_update, seo_title_th, seo_description_th,
          seo_title_en, seo_description_en, slug,
          hotel_location!inner (
            id, city_id, created_at,
            cities!inner (
              id, name_th, name_en,
              country:country_id (
                id, name_th, name_en, image
              )
            )
          )
        `
        )
        .eq("slug", slug)
        .single();

      if (error) {
        throw new Error(`Hotel not found: ${error.message}`);
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

  // Check if slug already exists
  async checkSlugExists(slug, excludeId = null) {
    try {
      let query = supabase.from("hotels").select("id, slug").eq("slug", slug);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        exists: data.length > 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check slug availability for update
  async checkSlugAvailability(slug, hotelId) {
    try {
      const slugCheck = await this.checkSlugExists(slug, hotelId);
      if (!slugCheck.success) {
        throw new Error(slugCheck.error);
      }

      return {
        success: true,
        available: !slugCheck.exists,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Verify if city exists
  async verifyCityExists(cityId) {
    try {
      const { data, error } = await supabase.from("cities").select("id, name_th, name_en").eq("id", cityId).single();

      if (error) {
        throw new Error(`City not found: ${error.message}`);
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

  // Create new hotel with location
  async createHotel(hotelData, userId) {
    try {
      const {
        name_th,
        name_en,
        description_th,
        description_en,
        excerpt_th,
        excerpt_en,
        location_th,
        location_en,
        google_map_link,
        checkin_time,
        checkout_time,
        status = true,
        seo_title_th,
        seo_description_th,
        seo_title_en,
        seo_description_en,
        slug,
        city_id,
      } = hotelData;

      // Verify city exists
      const cityCheck = await this.verifyCityExists(city_id);
      if (!cityCheck.success) {
        throw new Error(cityCheck.error);
      }

      // Check for duplicate slug
      const slugCheck = await this.checkSlugExists(slug);
      if (!slugCheck.success) {
        throw new Error(slugCheck.error);
      }

      if (slugCheck.exists) {
        throw new Error("Duplicate slug: already exists");
      }

      const now = new Date().toISOString();
      const hotelId = uuidv4();

      // Create hotel
      const newHotel = {
        id: hotelId,
        name_th,
        name_en,
        description_th: description_th || null,
        description_en: description_en || null,
        excerpt_th: excerpt_th || null,
        excerpt_en: excerpt_en || null,
        location_th,
        location_en,
        google_map_link: google_map_link || null,
        checkin_time,
        checkout_time,
        status,
        created_at: now,
        last_update: now,
        last_update_by: userId,
        seo_title_th: seo_title_th || null,
        seo_description_th: seo_description_th || null,
        seo_title_en: seo_title_en || null,
        seo_description_en: seo_description_en || null,
        slug,
      };

      const { data: hotelResult, error: hotelError } = await supabase.from("hotels").insert(newHotel).select().single();

      if (hotelError) {
        throw new Error(`Failed to create hotel: ${hotelError.message}`);
      }

      // Create hotel location
      const newLocation = {
        id: uuidv4(),
        hotel_id: hotelId,
        city_id,
        created_at: now,
      };

      const { error: locationError } = await supabase.from("hotel_location").insert(newLocation);

      if (locationError) {
        // Rollback hotel creation
        await supabase.from("hotels").delete().eq("id", hotelId);
        throw new Error(`Failed to create hotel location: ${locationError.message}`);
      }

      // Get complete hotel data
      const result = await this.getHotelById(hotelId);
      if (!result.success) {
        throw new Error("Failed to retrieve created hotel data");
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update hotel with location
  async updateHotel(id, updateData, userId) {
    try {
      // Check if hotel exists
      const hotelExists = await this.getHotelById(id);
      if (!hotelExists.success) {
        throw new Error("Hotel not found");
      }

      const { city_id, ...hotelFields } = updateData;

      // Remove undefined fields from hotel data
      const cleanHotelData = {};
      Object.keys(hotelFields).forEach((key) => {
        if (hotelFields[key] !== undefined) {
          cleanHotelData[key] = hotelFields[key];
        }
      });

      // Check slug uniqueness if being updated
      if (cleanHotelData.slug) {
        const slugCheck = await this.checkSlugExists(cleanHotelData.slug, id);
        if (!slugCheck.success) {
          throw new Error(slugCheck.error);
        }

        if (slugCheck.exists) {
          throw new Error("Duplicate slug: already exists");
        }
      }

      // Verify city if being updated
      if (city_id) {
        const cityCheck = await this.verifyCityExists(city_id);
        if (!cityCheck.success) {
          throw new Error(cityCheck.error);
        }
      }

      // Update hotel fields if any
      if (Object.keys(cleanHotelData).length > 0) {
        cleanHotelData.last_update = new Date().toISOString();
        cleanHotelData.last_update_by = userId;

        const { error: hotelError } = await supabase.from("hotels").update(cleanHotelData).eq("id", id);

        if (hotelError) {
          throw new Error(`Failed to update hotel: ${hotelError.message}`);
        }
      }

      // Update city_id in hotel_location if provided
      if (city_id) {
        const { error: locationError } = await supabase.from("hotel_location").update({ city_id }).eq("hotel_id", id);

        if (locationError) {
          throw new Error(`Failed to update hotel location: ${locationError.message}`);
        }
      }

      // Get updated hotel data
      const result = await this.getHotelById(id);
      if (!result.success) {
        throw new Error("Failed to retrieve updated hotel data");
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete hotel and all related data
  async deleteHotel(id) {
    try {
      // Get hotel data before deletion
      const hotelData = await this.getHotelById(id);
      if (!hotelData.success) {
        throw new Error("Hotel not found");
      }

      // Check if hotel has images (should be deleted via images API first)
      const { data: images, error: imageCheckError } = await supabase.from("hotel_images").select("id").eq("hotel_id", id).limit(1);

      if (imageCheckError) {
        throw new Error(`Failed to check hotel images: ${imageCheckError.message}`);
      }

      if (images && images.length > 0) {
        throw new Error("Cannot delete hotel that has images. Please delete all images first.");
      }

      // Delete hotel location
      const { error: locationError } = await supabase.from("hotel_location").delete().eq("hotel_id", id);

      if (locationError) {
        throw new Error(`Failed to delete hotel location: ${locationError.message}`);
      }

      // Delete hotel
      const { error: hotelError } = await supabase.from("hotels").delete().eq("id", id);

      if (hotelError) {
        throw new Error(`Failed to delete hotel: ${hotelError.message}`);
      }

      return {
        success: true,
        data: hotelData.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Search hotels by name or location (PUBLIC VERSION)
  async searchHotelsPublic(searchTerm, page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const { cityId } = filters;
      const searchPattern = `%${searchTerm}%`;

      // Build search query - PUBLIC VERSION (only active hotels)
      let countQuery = supabase
        .from("hotels")
        .select("*", { count: "exact", head: true })
        .or(
          `name_th.ilike.${searchPattern},name_en.ilike.${searchPattern},location_th.ilike.${searchPattern},location_en.ilike.${searchPattern}`
        )
        .eq("status", true); // Only active hotels for public

      let dataQuery = supabase
        .from("hotels")
        .select(
          `
          id, name_th, name_en, description_th, description_en,
          excerpt_th, excerpt_en, location_th, location_en, 
          google_map_link, checkin_time, checkout_time, status, 
          created_at, seo_title_th, seo_description_th,
          seo_title_en, seo_description_en, slug,
          hotel_location!inner (
            created_at,
            cities!inner (
              name_th, name_en,
              country:country_id (
                name_th, name_en, image
              )
            )
          )
        `
        )
        .or(
          `name_th.ilike.${searchPattern},name_en.ilike.${searchPattern},location_th.ilike.${searchPattern},location_en.ilike.${searchPattern}`
        )
        .eq("status", true); // Only active hotels for public

      // Apply filters
      if (cityId) {
        countQuery = countQuery.eq("hotel_location.city_id", cityId);
        dataQuery = dataQuery.eq("hotel_location.city_id", cityId);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) {
        throw new Error(`Failed to get search count: ${countError.message}`);
      }

      // Get search results
      const { data, error } = await dataQuery.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Keep nested structure for public API search
      // No processing needed - Supabase already returns without IDs

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: data,
        searchTerm: searchTerm,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Search hotels by name or location
  async searchHotels(searchTerm, page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const { cityId, status } = filters;
      const searchPattern = `%${searchTerm}%`;

      // Build search query
      let countQuery = supabase
        .from("hotels")
        .select("*", { count: "exact", head: true })
        .or(
          `name_th.ilike.${searchPattern},name_en.ilike.${searchPattern},location_th.ilike.${searchPattern},location_en.ilike.${searchPattern}`
        );

      let dataQuery = supabase
        .from("hotels")
        .select(
          `
          id, name_th, name_en, description_th, description_en,
          excerpt_th, excerpt_en, location_th, location_en, 
          google_map_link, checkin_time, checkout_time, status, 
          created_at, last_update, seo_title_th, seo_description_th,
          seo_title_en, seo_description_en, slug,
          hotel_location!inner (
            id, city_id, created_at,
            cities!inner (
              id, name_th, name_en,
              country:country_id (
                id, name_th, name_en, image
              )
            )
          )
        `
        )
        .or(
          `name_th.ilike.${searchPattern},name_en.ilike.${searchPattern},location_th.ilike.${searchPattern},location_en.ilike.${searchPattern}`
        );

      // Apply filters
      if (cityId) {
        countQuery = countQuery.eq("hotel_location.city_id", cityId);
        dataQuery = dataQuery.eq("hotel_location.city_id", cityId);
      }

      if (status !== null && status !== undefined) {
        countQuery = countQuery.eq("status", status);
        dataQuery = dataQuery.eq("status", status);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) {
        throw new Error(`Failed to get search count: ${countError.message}`);
      }

      // Get search results
      const { data, error } = await dataQuery.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);

      return {
        success: true,
        data: data,
        searchTerm: searchTerm,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hotels by city ID (PUBLIC VERSION)
  async getHotelsByCityIdPublic(cityId, page = 1, limit = 20) {
    try {
      return await this.getAllHotelsPublic(page, limit, { cityId });
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hotels by city ID
  async getHotelsByCityId(cityId, page = 1, limit = 20, filters = {}) {
    try {
      return await this.getAllHotels(page, limit, { ...filters, cityId });
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hotels for dropdown/select
  async getHotelsForSelect(filters = {}) {
    try {
      const { cityId, status = true } = filters;

      let query = supabase.from("hotels").select(`
          id, name_th, name_en, slug, status,
          hotel_location!inner (
            city_id,
            cities!inner (
              id, name_th, name_en
            )
          )
        `);

      if (cityId) {
        query = query.eq("hotel_location.city_id", cityId);
      }

      if (status !== null && status !== undefined) {
        query = query.eq("status", status);
      }

      const { data, error } = await query.order("name_en", { ascending: true });

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

  // Toggle hotel status
  async toggleHotelStatus(id, userId) {
    try {
      // Get current hotel status
      const { data: currentHotel, error: fetchError } = await supabase.from("hotels").select("status").eq("id", id).single();

      if (fetchError) {
        throw new Error(`Hotel not found: ${fetchError.message}`);
      }

      const newStatus = !currentHotel.status;

      // Update status
      const { data, error } = await supabase
        .from("hotels")
        .update({
          status: newStatus,
          last_update: new Date().toISOString(),
          last_update_by: userId,
        })
        .eq("id", id)
        .select("id, name_th, name_en, status")
        .single();

      if (error) {
        throw new Error(`Failed to update status: ${error.message}`);
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

  // Check if hotel exists (utility method)
  async hotelExists(id) {
    try {
      const { data, error } = await supabase.from("hotels").select("id").eq("id", id).single();

      if (error) {
        return {
          success: true,
          exists: false,
        };
      }

      return {
        success: true,
        exists: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get hotel basic info (for images service to verify hotel exists)
  async getHotelBasicInfo(id) {
    try {
      const { data, error } = await supabase.from("hotels").select("id, name_th, name_en, slug, status").eq("id", id).single();

      if (error) {
        throw new Error(`Hotel not found: ${error.message}`);
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
}

export default new HotelsService();
