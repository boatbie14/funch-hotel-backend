import { supabase } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class CitiesService {
  // Get all cities with pagination and optional country filter
  async getAllCities(page = 1, limit = 20, countryId = null) {
    try {
      const offset = (page - 1) * limit;

      // Build query with optional country filter
      let query = supabase.from("cities").select(
        `
          id, 
          name_th, 
          name_en, 
          country_id, 
          created_at,
          country:country_id (
            id,
            name_th,
            name_en
          )
        `,
        { count: "exact" }
      );

      if (countryId) {
        query = query.eq("country_id", countryId);
      }

      // Get total count for pagination
      const { count, error: countError } = await query;

      if (countError) {
        throw new Error(`Failed to get cities count: ${countError.message}`);
      }

      // Get cities with pagination
      query = supabase.from("cities").select(`
          id, 
          name_th, 
          name_en, 
          country_id, 
          created_at,
          country:country_id (
            id,
            name_th,
            name_en
          )
        `);

      if (countryId) {
        query = query.eq("country_id", countryId);
      }

      const { data, error } = await query.order("name_en", { ascending: true }).range(offset, offset + limit - 1);

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

  // Get city by ID
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
          created_at,
          country:country_id (
            id,
            name_th,
            name_en
          )
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

  // Check if city name already exists within the same country
  async checkDuplicateCityName(name_th, name_en, country_id, excludeId = null) {
    try {
      let query = supabase
        .from("cities")
        .select("id, name_th, name_en, country_id")
        .eq("country_id", country_id)
        .or(`name_th.eq.${name_th},name_en.eq.${name_en}`);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const duplicates = {
        name_th: data.find((city) => city.name_th === name_th),
        name_en: data.find((city) => city.name_en === name_en),
      };

      return {
        success: true,
        hasDuplicates: data.length > 0,
        duplicates: duplicates,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Verify if country exists
  async verifyCountryExists(countryId) {
    try {
      const { data, error } = await supabase.from("country").select("id, name_th, name_en").eq("id", countryId).single();

      if (error) {
        throw new Error(`Country not found: ${error.message}`);
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

  // Create new city
  async createCity(cityData) {
    try {
      const { name_th, name_en, country_id } = cityData;

      // Verify country exists
      const countryCheck = await this.verifyCountryExists(country_id);
      if (!countryCheck.success) {
        throw new Error(countryCheck.error);
      }

      // Check for duplicate names within the same country
      const duplicateCheck = await this.checkDuplicateCityName(name_th, name_en, country_id);
      if (!duplicateCheck.success) {
        throw new Error(duplicateCheck.error);
      }

      if (duplicateCheck.hasDuplicates) {
        const conflicts = [];
        if (duplicateCheck.duplicates.name_th) conflicts.push("Thai name");
        if (duplicateCheck.duplicates.name_en) conflicts.push("English name");
        throw new Error(`Duplicate ${conflicts.join(" and ")}: already exists in this country`);
      }

      // Create new city
      const newCity = {
        id: uuidv4(),
        name_th,
        name_en,
        country_id,
        created_at: new Date().toISOString(),
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
          created_at,
          country:country_id (
            id,
            name_th,
            name_en
          )
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

  // Update city
  async updateCity(id, updateData) {
    try {
      // Remove undefined fields
      const cleanData = {};
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          cleanData[key] = updateData[key];
        }
      });

      // If country_id is being updated, verify it exists
      if (cleanData.country_id) {
        const countryCheck = await this.verifyCountryExists(cleanData.country_id);
        if (!countryCheck.success) {
          throw new Error(countryCheck.error);
        }
      }

      // Get current city data to determine which country to check duplicates against
      const currentCity = await this.getCityById(id);
      if (!currentCity.success) {
        throw new Error("City not found");
      }

      const countryIdToCheck = cleanData.country_id || currentCity.data.country_id;

      // Check for duplicates if names are being updated
      if (cleanData.name_th || cleanData.name_en) {
        const duplicateCheck = await this.checkDuplicateCityName(
          cleanData.name_th || currentCity.data.name_th,
          cleanData.name_en || currentCity.data.name_en,
          countryIdToCheck,
          id
        );

        if (!duplicateCheck.success) {
          throw new Error(duplicateCheck.error);
        }

        if (duplicateCheck.hasDuplicates) {
          const conflicts = [];
          if (duplicateCheck.duplicates.name_th && cleanData.name_th) conflicts.push("Thai name");
          if (duplicateCheck.duplicates.name_en && cleanData.name_en) conflicts.push("English name");
          if (conflicts.length > 0) {
            throw new Error(`Duplicate ${conflicts.join(" and ")}: already exists in this country`);
          }
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
          created_at,
          country:country_id (
            id,
            name_th,
            name_en
          )
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

  // Check if city has related hotels
  async checkCityHasHotels(cityId) {
    try {
      const { data, error } = await supabase.from("hotel_location").select("id").eq("city_id", cityId).limit(1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        hasHotels: data.length > 0,
        hotelsCount: data.length,
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
      // Check if city has related hotels
      const hotelsCheck = await this.checkCityHasHotels(id);
      if (!hotelsCheck.success) {
        throw new Error(hotelsCheck.error);
      }

      if (hotelsCheck.hasHotels) {
        throw new Error("Cannot delete city that has hotels. Please delete all hotels first.");
      }

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
          created_at,
          country:country_id (
            id,
            name_th,
            name_en
          )
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

  // Get cities for dropdown/select by country
  async getCitiesForSelect(countryId = null) {
    try {
      let query = supabase.from("cities").select("id, name_th, name_en, country_id");

      if (countryId) {
        query = query.eq("country_id", countryId);
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

  // Search cities by name
  async searchCities(searchTerm, page = 1, limit = 20, countryId = null) {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm}%`;

      // Build query with optional country filter
      let countQuery = supabase
        .from("cities")
        .select("*", { count: "exact", head: true })
        .or(`name_th.ilike.${searchPattern},name_en.ilike.${searchPattern}`);

      let dataQuery = supabase
        .from("cities")
        .select(
          `
          id, 
          name_th, 
          name_en, 
          country_id, 
          created_at,
          country:country_id (
            id,
            name_th,
            name_en
          )
        `
        )
        .or(`name_th.ilike.${searchPattern},name_en.ilike.${searchPattern}`);

      if (countryId) {
        countQuery = countQuery.eq("country_id", countryId);
        dataQuery = dataQuery.eq("country_id", countryId);
      }

      // Get total count for pagination
      const { count, error: countError } = await countQuery;

      if (countError) {
        throw new Error(`Failed to get search count: ${countError.message}`);
      }

      // Get search results with pagination
      const { data, error } = await dataQuery.order("name_en", { ascending: true }).range(offset, offset + limit - 1);

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

  // Get cities by country ID
  async getCitiesByCountryId(countryId, page = 1, limit = 20) {
    try {
      return await this.getAllCities(page, limit, countryId);
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new CitiesService();
