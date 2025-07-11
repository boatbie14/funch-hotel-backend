import { supabase } from "../config/database.js";

class MetadataService {
  // Get all metadata with pagination and optional status filter
  async getAllMetadata(page = 1, limit = 20, status = null) {
    try {
      const offset = (page - 1) * limit;

      // Build query with optional status filter
      let query = supabase.from("metadata").select(
        `
          id,
          slug,
          title,
          description,
          keywords,
          og_image,
          status,
          created_at,
          updated_at
        `,
        { count: "exact" }
      );

      if (status !== null) {
        const statusBool = status === "true" || status === true;
        query = query.eq("status", statusBool);
      }

      // Get total count for pagination
      const { count, error: countError } = await query;

      if (countError) {
        throw new Error(`Failed to get metadata count: ${countError.message}`);
      }

      // Get metadata with pagination
      query = supabase.from("metadata").select(`
          id,
          slug,
          title,
          description,
          keywords,
          og_image,
          status,
          created_at,
          updated_at
        `);

      if (status !== null) {
        const statusBool = status === "true" || status === true;
        query = query.eq("status", statusBool);
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

  // Get metadata by ID
  async getMetadataById(id) {
    try {
      const { data, error } = await supabase
        .from("metadata")
        .select(
          `
          id,
          slug,
          title,
          description,
          keywords,
          og_image,
          status,
          created_at,
          updated_at
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Metadata not found: ${error.message}`);
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

  // Get metadata by slug
  async getMetadataBySlug(slug) {
    try {
      const { data, error } = await supabase
        .from("metadata")
        .select(
          `
          id,
          slug,
          title,
          description,
          keywords,
          og_image,
          status,
          created_at,
          updated_at
        `
        )
        .eq("slug", slug)
        .single();

      if (error) {
        throw new Error(`Metadata not found: ${error.message}`);
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

  // Search metadata by title, description, or keywords
  async searchMetadata(searchTerm, page = 1, limit = 20, status = null) {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm}%`;

      // Build query with optional status filter
      let countQuery = supabase
        .from("metadata")
        .select("*", { count: "exact", head: true })
        .or(`title.ilike.${searchPattern},description.ilike.${searchPattern},keywords.ilike.${searchPattern}`);

      let dataQuery = supabase
        .from("metadata")
        .select(
          `
          id,
          slug,
          title,
          description,
          keywords,
          og_image,
          status,
          created_at,
          updated_at
        `
        )
        .or(`title.ilike.${searchPattern},description.ilike.${searchPattern},keywords.ilike.${searchPattern}`);

      if (status !== null) {
        const statusBool = status === "true" || status === true;
        countQuery = countQuery.eq("status", statusBool);
        dataQuery = dataQuery.eq("status", statusBool);
      }

      // Get total count for pagination
      const { count, error: countError } = await countQuery;

      if (countError) {
        throw new Error(`Failed to get search count: ${countError.message}`);
      }

      // Get search results with pagination
      const { data, error } = await dataQuery.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

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

  // Get only active metadata (status = true)
  async getActiveMetadata(page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get total count for active metadata
      const { count, error: countError } = await supabase.from("metadata").select("*", { count: "exact", head: true }).eq("status", true);

      if (countError) {
        throw new Error(`Failed to get active metadata count: ${countError.message}`);
      }

      // Get active metadata with pagination
      const { data, error } = await supabase
        .from("metadata")
        .select(
          `
          id,
          slug,
          title,
          description,
          keywords,
          og_image,
          status,
          created_at,
          updated_at
        `
        )
        .eq("status", true)
        .order("created_at", { ascending: false })
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
}

export default new MetadataService();
