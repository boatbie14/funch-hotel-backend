import { supabase } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class CountryService {
  // Get all countries with pagination
  async getAllCountries(page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const { count, error: countError } = await supabase.from("country").select("*", { count: "exact", head: true });

      if (countError) {
        throw new Error(`Failed to get countries count: ${countError.message}`);
      }

      // Get countries with pagination
      const { data, error } = await supabase
        .from("country")
        .select("id, name_th, name_en, image")
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

  // Get country by ID
  async getCountryById(id) {
    try {
      const { data, error } = await supabase.from("country").select("id, name_th, name_en, image").eq("id", id).single();

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

  // Check if country name already exists (for duplicate validation)
  async checkDuplicateCountryName(name_th, name_en, excludeId = null) {
    try {
      let query = supabase.from("country").select("id, name_th, name_en").or(`name_th.eq.${name_th},name_en.eq.${name_en}`);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const duplicates = {
        name_th: data.find((country) => country.name_th === name_th),
        name_en: data.find((country) => country.name_en === name_en),
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

  // Create new country
  async createCountry(countryData) {
    try {
      const { name_th, name_en, image } = countryData;

      // Check for duplicate names
      const duplicateCheck = await this.checkDuplicateCountryName(name_th, name_en);
      if (!duplicateCheck.success) {
        throw new Error(duplicateCheck.error);
      }

      if (duplicateCheck.hasDuplicates) {
        const conflicts = [];
        if (duplicateCheck.duplicates.name_th) conflicts.push("Thai name");
        if (duplicateCheck.duplicates.name_en) conflicts.push("English name");
        throw new Error(`Duplicate ${conflicts.join(" and ")}: already exists`);
      }

      // Create new country
      const newCountry = {
        id: uuidv4(),
        name_th,
        name_en,
        image,
      };

      const { data, error } = await supabase.from("country").insert(newCountry).select("id, name_th, name_en, image").single();

      if (error) {
        throw new Error(`Failed to create country: ${error.message}`);
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

  // Update country
  async updateCountry(id, updateData) {
    try {
      // Remove undefined fields
      const cleanData = {};
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          cleanData[key] = updateData[key];
        }
      });

      // Check for duplicates if names are being updated
      if (cleanData.name_th || cleanData.name_en) {
        const duplicateCheck = await this.checkDuplicateCountryName(cleanData.name_th || "", cleanData.name_en || "", id);

        if (!duplicateCheck.success) {
          throw new Error(duplicateCheck.error);
        }

        if (duplicateCheck.hasDuplicates) {
          const conflicts = [];
          if (duplicateCheck.duplicates.name_th && cleanData.name_th) conflicts.push("Thai name");
          if (duplicateCheck.duplicates.name_en && cleanData.name_en) conflicts.push("English name");
          if (conflicts.length > 0) {
            throw new Error(`Duplicate ${conflicts.join(" and ")}: already exists`);
          }
        }
      }

      const { data, error } = await supabase.from("country").update(cleanData).eq("id", id).select("id, name_th, name_en, image").single();

      if (error) {
        throw new Error(`Failed to update country: ${error.message}`);
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

  // Check if country has related cities
  async checkCountryHasCities(countryId) {
    try {
      const { data, error } = await supabase.from("cities").select("id").eq("country_id", countryId).limit(1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        hasCities: data.length > 0,
        citiesCount: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete country
  async deleteCountry(id) {
    try {
      // Check if country has related cities
      const citiesCheck = await this.checkCountryHasCities(id);
      if (!citiesCheck.success) {
        throw new Error(citiesCheck.error);
      }

      if (citiesCheck.hasCities) {
        throw new Error("Cannot delete country that has cities. Please delete all cities first.");
      }

      const { data, error } = await supabase.from("country").delete().eq("id", id).select("id, name_th, name_en, image").single();

      if (error) {
        throw new Error(`Failed to delete country: ${error.message}`);
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

  // Get countries for dropdown/select (simplified data)
  async getCountriesForSelect() {
    try {
      const { data, error } = await supabase.from("country").select("id, name_th, name_en").order("name_en", { ascending: true });

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

  // Search countries by name
  async searchCountries(searchTerm, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm}%`;

      // Get total count for pagination
      const { count, error: countError } = await supabase
        .from("country")
        .select("*", { count: "exact", head: true })
        .or(`name_th.ilike.${searchPattern},name_en.ilike.${searchPattern}`);

      if (countError) {
        throw new Error(`Failed to get search count: ${countError.message}`);
      }

      // Get search results with pagination
      const { data, error } = await supabase
        .from("country")
        .select("id, name_th, name_en, image")
        .or(`name_th.ilike.${searchPattern},name_en.ilike.${searchPattern}`)
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
}

export default new CountryService();
