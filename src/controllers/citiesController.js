import CitiesService from "../services/citiesService.js";

class CitiesController {
  // @route   GET /api/cities
  // @desc    Get all cities with pagination and optional country filter
  // @access  Private (Admin only)
  async getAllCities(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const countryId = req.query.country_id || null;

      const result = await CitiesService.getAllCities(page, limit, countryId);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Cities retrieved successfully",
        data: result.data,
        pagination: result.pagination,
        filters: {
          country_id: countryId,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/cities/:id
  // @desc    Get city by ID
  // @access  Private (Admin only)
  async getCityById(req, res) {
    try {
      const { id } = req.params;
      const result = await CitiesService.getCityById(id);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "City retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/cities
  // @desc    Create new city
  // @access  Private (Admin only)
  async createCity(req, res) {
    try {
      const cityData = req.body;
      const result = await CitiesService.createCity(cityData);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Duplicate")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        if (result.error.includes("Country not found")) {
          return res.status(400).json({
            error: "Invalid Country",
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
        message: "City created successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   PUT /api/cities/:id
  // @desc    Update city
  // @access  Private (Admin only)
  async updateCity(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const result = await CitiesService.updateCity(id, updateData);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Duplicate")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        if (result.error.includes("Country not found")) {
          return res.status(400).json({
            error: "Invalid Country",
            message: result.error,
          });
        }

        if (result.error.includes("City not found") || result.error.includes("not found")) {
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
        message: "City updated successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   DELETE /api/cities/:id
  // @desc    Delete city
  // @access  Private (Admin only)
  async deleteCity(req, res) {
    try {
      const { id } = req.params;
      const result = await CitiesService.deleteCity(id);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Cannot delete city that has hotels")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "City deleted successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/cities/select
  // @desc    Get cities for dropdown/select
  // @access  Private (Admin only)
  async getCitiesForSelect(req, res) {
    try {
      const countryId = req.query.country_id || null;
      const result = await CitiesService.getCitiesForSelect(countryId);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Cities for selection retrieved successfully",
        data: result.data,
        count: result.count,
        filters: {
          country_id: countryId,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/cities/search
  // @desc    Search cities by name
  // @access  Private (Admin only)
  async searchCities(req, res) {
    try {
      const { q: searchTerm } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const countryId = req.query.country_id || null;

      const result = await CitiesService.searchCities(searchTerm, page, limit, countryId);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "City search completed successfully",
        data: result.data,
        searchTerm: result.searchTerm,
        pagination: result.pagination,
        filters: {
          country_id: countryId,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/cities/country/:countryId
  // @desc    Get cities by country ID
  // @access  Private (Admin only)
  async getCitiesByCountryId(req, res) {
    try {
      const { countryId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await CitiesService.getCitiesByCountryId(countryId, page, limit);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Cities by country retrieved successfully",
        data: result.data,
        pagination: result.pagination,
        country_id: countryId,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/cities/:id/hotels-check
  // @desc    Check if city has hotels (for delete validation)
  // @access  Private (Admin only)
  async checkCityHasHotels(req, res) {
    try {
      const { id } = req.params;
      const result = await CitiesService.checkCityHasHotels(id);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Hotels check completed successfully",
        data: {
          cityId: id,
          hasHotels: result.hasHotels,
          hotelsCount: result.hotelsCount,
          canDelete: !result.hasHotels,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }
}

export default new CitiesController();
