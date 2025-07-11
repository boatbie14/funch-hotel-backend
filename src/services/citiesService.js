import { supabase } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class CityService {
  // Get all cities with pagination
  async getAllCities(page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const { count, error: countError } = await supabase.from("cities").select("*", { count: "exact", head: true });

      if (countError) {
        throw new Error(`Failed to get cities count: ${countError.message}`);
      }

      // Get cities with pagination - เพิ่ม columns ใหม่
      const { data, error } = await supabase
        .from("cities")
        .select(
          `
          id, 
          name_th, 
          name_en, 
          country_id, 
          image, 
          titel_th, 
          titel_en, 
          description_th, 
          description_en, 
          slug,
          country:country_id(id, name_th, name_en)
        `
        )
        .order("name_en", { ascending: true })
        .range(offset, offset + limit - 1);

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

  // Get city by ID - เพิ่ม columns ใหม่
  async getCityById(id) {
    try {
      const { data, error } = await supabase
        .from("cities")
        .select(
          `
          id, 
          name_th, 
          name_en, 
          country_id, 
          image, 
          titel_th, 
          titel_en, 
          description_th, 
          description_en, 
          slug,
          country:country_id(id, name_th, name_en)
        `
        )
        .eq("id", id)
        .single();

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

  // Get city by slug - เพิ่ม method ใหม่สำหรับ slug
  async getCityBySlug(slug) {
    try {
      const { data, error } = await supabase
        .from("cities")
        .select(
          `
          id, 
          name_th, 
          name_en, 
          country_id, 
          image, 
          titel_th, 
          titel_en, 
          description_th, 
          description_en, 
          slug,
          country:country_id(id, name_th, name_en)
        `
        )
        .eq("slug", slug)
        .single();

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

  // Create new city - เพิ่ม fields ใหม่
  async createCity(cityData) {
    try {
      const { name_th, name_en, country_id, image, titel_th, titel_en, description_th, description_en, slug } = cityData;

      // สร้าง slug อัตโนมัติถ้าไม่มี
      const finalSlug = slug || this.generateSlug(name_en);

      // Check for duplicate slug
      const { data: existingCity } = await supabase.from("cities").select("id").eq("slug", finalSlug).single();

      if (existingCity) {
        throw new Error("Slug already exists");
      }

      // Create new city
      const newCity = {
        id: uuidv4(),
        name_th,
        name_en,
        country_id,
        image,
        titel_th,
        titel_en,
        description_th,
        description_en,
        slug: finalSlug,
      };

      const { data, error } = await supabase
        .from("cities")
        .insert(newCity)
        .select(
          `
          id, 
          name_th, 
          name_en, 
          country_id, 
          image, 
          titel_th, 
          titel_en, 
          description_th, 
          description_en, 
          slug,
          country:country_id(id, name_th, name_en)
        `
        )
        .single();

      if (error) {
        throw new Error(`Failed to create city: ${error.message}`);
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

  // Update city - เพิ่ม fields ใหม่
  async updateCity(id, updateData) {
    try {
      // Remove undefined fields
      const cleanData = {};
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          cleanData[key] = updateData[key];
        }
      });

      // Generate slug if name_en is being updated and no slug provided
      if (cleanData.name_en && !cleanData.slug) {
        cleanData.slug = this.generateSlug(cleanData.name_en);
      }

      // Check for duplicate slug if slug is being updated
      if (cleanData.slug) {
        const { data: existingCity } = await supabase.from("cities").select("id").eq("slug", cleanData.slug).neq("id", id).single();

        if (existingCity) {
          throw new Error("Slug already exists");
        }
      }

      const { data, error } = await supabase
        .from("cities")
        .update(cleanData)
        .eq("id", id)
        .select(
          `
          id, 
          name_th, 
          name_en, 
          country_id, 
          image, 
          titel_th, 
          titel_en, 
          description_th, 
          description_en, 
          slug,
          country:country_id(id, name_th, name_en)
        `
        )
        .single();

      if (error) {
        throw new Error(`Failed to update city: ${error.message}`);
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

  // Search cities - เพิ่ม columns ใหม่
  async searchCities(searchTerm, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm}%`;

      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from("cities")
        .select("*", { count: "exact", head: true })
        .or(
          `name_th.ilike.${searchPattern},name_en.ilike.${searchPattern},titel_th.ilike.${searchPattern},titel_en.ilike.${searchPattern}`
        );

      if (countError) {
        throw new Error(`Failed to get search count: ${countError.message}`);
      }

      // Get search results with pagination
      const { data, error } = await supabase
        .from("cities")
        .select(
          `
          id, 
          name_th, 
          name_en, 
          country_id, 
          image, 
          titel_th, 
          titel_en, 
          description_th, 
          description_en, 
          slug,
          country:country_id(id, name_th, name_en)
        `
        )
        .or(`name_th.ilike.${searchPattern},name_en.ilike.${searchPattern},titel_th.ilike.${searchPattern},titel_en.ilike.${searchPattern}`)
        .order("name_en", { ascending: true })
        .range(offset, offset + limit - 1);

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
        searchTerm: searchTerm,
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

  // Helper method to generate slug
  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim();
  }

  // Get cities by country
  async getCitiesByCountryId(countryId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from("cities")
        .select("*", { count: "exact", head: true })
        .eq("country_id", countryId);

      if (countError) {
        throw new Error(`Failed to get cities count: ${countError.message}`);
      }

      // Get cities with pagination
      const { data, error } = await supabase
        .from("cities")
        .select(
          `
          id, 
          name_th, 
          name_en, 
          country_id, 
          image, 
          titel_th, 
          titel_en, 
          description_th, 
          description_en, 
          slug,
          country:country_id(id, name_th, name_en)
        `
        )
        .eq("country_id", countryId)
        .order("name_en", { ascending: true })
        .range(offset, offset + limit - 1);

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

  // Get cities for dropdown/select (simplified data) - ไม่เพิ่ม fields ใหม่
  async getCitiesForSelect() {
    try {
      const { data, error } = await supabase
        .from("cities")
        .select("id, name_th, name_en, country_id")
        .order("name_en", { ascending: true });

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

  // Delete city
  async deleteCity(id) {
    try {
      const { data, error } = await supabase
        .from("cities")
        .delete()
        .eq("id", id)
        .select(
          `
          id, 
          name_th, 
          name_en, 
          country_id, 
          image, 
          titel_th, 
          titel_en, 
          description_th, 
          description_en, 
          slug
        `
        )
        .single();

      if (error) {
        throw new Error(`Failed to delete city: ${error.message}`);
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

export default new CityService();
