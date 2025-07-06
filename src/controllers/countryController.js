import CountryService from "../services/countryService.js";

class CountryController {
  // @route   GET /api/country
  // @desc    Get all countries with pagination
  // @access  Private (Admin only)
  async getAllCountries(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await CountryService.getAllCountries(page, limit);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Countries retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/country/:id
  // @desc    Get country by ID
  // @access  Private (Admin only)
  async getCountryById(req, res) {
    try {
      const { id } = req.params;
      const result = await CountryService.getCountryById(id);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Country retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/country
  // @desc    Create new country
  // @access  Private (Admin only)
  async createCountry(req, res) {
    try {
      const countryData = req.body;
      const result = await CountryService.createCountry(countryData);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Duplicate")) {
          return res.status(409).json({
            error: "Conflict",
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
        message: "Country created successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   PUT /api/country/:id
  // @desc    Update country
  // @access  Private (Admin only)
  async updateCountry(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const result = await CountryService.updateCountry(id, updateData);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Duplicate")) {
          return res.status(409).json({
            error: "Conflict",
            message: result.error,
          });
        }

        if (result.error.includes("not found")) {
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
        message: "Country updated successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   DELETE /api/country/:id
  // @desc    Delete country
  // @access  Private (Admin only)
  async deleteCountry(req, res) {
    try {
      const { id } = req.params;
      const result = await CountryService.deleteCountry(id);

      if (!result.success) {
        // Handle specific error types
        if (result.error.includes("Cannot delete country that has cities")) {
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
        message: "Country deleted successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/country/select
  // @desc    Get countries for dropdown/select
  // @access  Private (Admin only)
  async getCountriesForSelect(req, res) {
    try {
      const result = await CountryService.getCountriesForSelect();

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Countries for selection retrieved successfully",
        data: result.data,
        count: result.count,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/country/search
  // @desc    Search countries by name
  // @access  Private (Admin only)
  async searchCountries(req, res) {
    try {
      const { q: searchTerm } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await CountryService.searchCountries(searchTerm, page, limit);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Country search completed successfully",
        data: result.data,
        searchTerm: result.searchTerm,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/country/:id/cities-check
  // @desc    Check if country has cities (for delete validation)
  // @access  Private (Admin only)
  async checkCountryHasCities(req, res) {
    try {
      const { id } = req.params;
      const result = await CountryService.checkCountryHasCities(id);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Cities check completed successfully",
        data: {
          countryId: id,
          hasCities: result.hasCities,
          citiesCount: result.citiesCount,
          canDelete: !result.hasCities,
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

export default new CountryController();
