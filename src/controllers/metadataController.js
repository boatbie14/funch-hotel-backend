import MetadataService from "../services/metadataService.js";

class MetadataController {
  // @route   GET /api/metadata
  // @desc    Get all metadata with pagination and optional status filter
  // @access  Public
  async getAllMetadata(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status || null;

      const result = await MetadataService.getAllMetadata(page, limit, status);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Metadata retrieved successfully",
        data: result.data,
        pagination: result.pagination,
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

  // @route   GET /api/metadata/:id
  // @desc    Get metadata by ID
  // @access  Public
  async getMetadataById(req, res) {
    try {
      const { id } = req.params;
      const result = await MetadataService.getMetadataById(id);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Metadata retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/metadata/slug/:slug
  // @desc    Get metadata by slug
  // @access  Public
  async getMetadataBySlug(req, res) {
    try {
      const { slug } = req.params;
      const result = await MetadataService.getMetadataBySlug(slug);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Metadata retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/metadata/search
  // @desc    Search metadata by title, description, or keywords
  // @access  Public
  async searchMetadata(req, res) {
    try {
      const { q: searchTerm } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status || null;

      const result = await MetadataService.searchMetadata(searchTerm, page, limit, status);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Metadata search completed successfully",
        data: result.data,
        searchTerm: result.searchTerm,
        pagination: result.pagination,
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

  // @route   GET /api/metadata/active
  // @desc    Get only active metadata (status = true)
  // @access  Public
  async getActiveMetadata(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await MetadataService.getActiveMetadata(page, limit);

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Active metadata retrieved successfully",
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
}

export default new MetadataController();
