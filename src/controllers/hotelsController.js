import HotelsService from "../services/hotelsService.js";

class HotelsController {
  // @route   GET /api/hotels
  // @desc    Get all hotels with pagination and optional filters (PUBLIC - limited data)
  // @access  Public
  async getAllHotelsPublic(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const cityId = req.query.city_id || null;

      const result = await HotelsService.getAllHotelsPublic(page, limit, { cityId });

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotels retrieved successfully",
        data: result.data,
        pagination: result.pagination,
        filters: {
          city_id: cityId,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/admin
  // @desc    Get all hotels with pagination and optional filters (ADMIN - full data)
  // @access  Private (Admin only)
  async getAllHotels(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const cityId = req.query.city_id || null;
      const status = req.query.status !== undefined ? req.query.status === "true" : null;

      const result = await HotelsService.getAllHotels(page, limit, { cityId, status });

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotels retrieved successfully",
        data: result.data,
        pagination: result.pagination,
        filters: {
          city_id: cityId,
          status: status,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/:id
  // @desc    Get hotel by ID with all related data
  // @access  Private (Admin only)
  async getHotelById(req, res) {
    try {
      const { id } = req.params;
      const result = await HotelsService.getHotelById(id);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotel retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/hotels
  // @desc    Create new hotel with location
  // @access  Private (Admin only)
  async createHotel(req, res) {
    try {
      const hotelData = req.body;
      const userId = req.user.id; // From auth middleware

      const result = await HotelsService.createHotel(hotelData, userId);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Duplicate slug")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        if (result.error.includes("City not found")) {
          return res.status(400).json({
            error: "Invalid City",
            message: result.error,
          });
        }

        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.status(201).json({
        success: true,
        message: "Hotel created successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   PUT /api/hotels/:id
  // @desc    Update hotel with location
  // @access  Private (Admin only)
  async updateHotel(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user.id; // From auth middleware

      const result = await HotelsService.updateHotel(id, updateData, userId);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Duplicate slug")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        if (result.error.includes("City not found")) {
          return res.status(400).json({
            error: "Invalid City",
            message: result.error,
          });
        }

        if (result.error.includes("Hotel not found") || result.error.includes("not found")) {
          return res.status(404).json({
            error: "Not Found",
            message: result.error,
          });
        }

        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotel updated successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   DELETE /api/hotels/:id
  // @desc    Delete hotel and all related data
  // @access  Private (Admin only)
  async deleteHotel(req, res) {
    try {
      const { id } = req.params;
      const result = await HotelsService.deleteHotel(id);

      if (!result.success) {
        // Handle specific error for images dependency
        if (result.error.includes("Cannot delete hotel that has images")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
            suggestion: "Please delete all hotel images first before deleting the hotel",
          });
        }

        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotel deleted successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/search
  // @desc    Search hotels by name or location (PUBLIC)
  // @access  Public
  async searchHotelsPublic(req, res) {
    try {
      const { q: searchTerm } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const cityId = req.query.city_id || null;

      const result = await HotelsService.searchHotelsPublic(searchTerm, page, limit, { cityId });

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotel search completed successfully",
        data: result.data,
        searchTerm: result.searchTerm,
        pagination: result.pagination,
        filters: {
          city_id: cityId,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/admin/search
  // @desc    Search hotels by name or location (ADMIN)
  // @access  Private (Admin only)
  async searchHotels(req, res) {
    try {
      const { q: searchTerm } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const cityId = req.query.city_id || null;
      const status = req.query.status !== undefined ? req.query.status === "true" : null;

      const result = await HotelsService.searchHotels(searchTerm, page, limit, { cityId, status });

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotel search completed successfully",
        data: result.data,
        searchTerm: result.searchTerm,
        pagination: result.pagination,
        filters: {
          city_id: cityId,
          status: status,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/city/:cityId
  // @desc    Get hotels by city ID (PUBLIC)
  // @access  Public
  async getHotelsByCityIdPublic(req, res) {
    try {
      const { cityId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await HotelsService.getHotelsByCityIdPublic(cityId, page, limit);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotels by city retrieved successfully",
        data: result.data,
        pagination: result.pagination,
        city_id: cityId,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/city/:citySlug
  // @desc    Get hotels by city slug (PUBLIC)
  // @access  Public
  async getHotelsByCitySlugPublic(req, res) {
    try {
      const { citySlug } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await HotelsService.getHotelsByCitySlugPublic(citySlug, page, limit);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotels by city retrieved successfully",
        data: result.data,
        pagination: result.pagination,
        city_slug: citySlug,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/city/:cityId (ADMIN)
  // @desc    Get hotels by city ID (ADMIN)
  // @access  Private (Admin only)
  async getHotelsByCityId(req, res) {
    try {
      const { cityId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status !== undefined ? req.query.status === "true" : null;

      const result = await HotelsService.getHotelsByCityId(cityId, page, limit, { status });

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotels by city retrieved successfully",
        data: result.data,
        pagination: result.pagination,
        city_id: cityId,
        filters: {
          status: status,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/slug/:slug
  // @desc    Get hotel by slug (PUBLIC)
  // @access  Public
  async getHotelBySlugPublic(req, res) {
    try {
      const { slug } = req.params;
      const result = await HotelsService.getHotelBySlugPublic(slug);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotel retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/slug/:slug (ADMIN)
  // @desc    Get hotel by slug (ADMIN)
  // @access  Private (Admin only)
  async getHotelBySlug(req, res) {
    try {
      const { slug } = req.params;
      const result = await HotelsService.getHotelBySlug(slug);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotel retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/select
  // @desc    Get hotels for dropdown/select
  // @access  Private (Admin only)
  async getHotelsForSelect(req, res) {
    try {
      const cityId = req.query.city_id || null;
      const status = req.query.status !== undefined ? req.query.status === "true" : true; // Default to active only

      const result = await HotelsService.getHotelsForSelect({ cityId, status });

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotels for selection retrieved successfully",
        data: result.data,
        count: result.count,
        filters: {
          city_id: cityId,
          status: status,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/:id/check-slug
  // @desc    Check if slug is available for update
  // @access  Private (Admin only)
  async checkSlugAvailability(req, res) {
    try {
      const { id } = req.params;
      const { slug } = req.query;

      if (!slug) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Slug parameter is required",
        });
      }

      const result = await HotelsService.checkSlugAvailability(slug, id);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Slug availability checked successfully",
        data: {
          slug: slug,
          available: result.available,
          hotelId: id,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   PUT /api/hotels/:id/status
  // @desc    Toggle hotel status (active/inactive)
  // @access  Private (Admin only)
  async toggleHotelStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id; // From auth middleware

      const result = await HotelsService.toggleHotelStatus(id, userId);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: `Hotel status ${result.data.status ? "activated" : "deactivated"} successfully`,
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/:id/exists
  // @desc    Check if hotel exists (utility endpoint for other services)
  // @access  Private (Admin only)
  async checkHotelExists(req, res) {
    try {
      const { id } = req.params;
      const result = await HotelsService.hotelExists(id);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotel existence checked successfully",
        data: {
          hotelId: id,
          exists: result.exists,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/hotels/:id/basic
  // @desc    Get basic hotel info (for other services)
  // @access  Private (Admin only)
  async getHotelBasicInfo(req, res) {
    try {
      const { id } = req.params;
      const result = await HotelsService.getHotelBasicInfo(id);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotel basic info retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }
}

export default new HotelsController();
