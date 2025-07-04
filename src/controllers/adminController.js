import AdminService from "../services/adminService.js";
import { generateToken, generateRefreshToken } from "../utils/jwt.js";

class AdminController {
  // @route   GET /api/admin
  // @desc    Get all admin users
  // @access  Private (Admin only)
  async getAllAdmins(req, res) {
    try {
      const result = await AdminService.getAllAdmins();

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Admin users retrieved successfully",
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

  // @route   GET /api/admin/:id
  // @desc    Get admin user by ID
  // @access  Private (Admin only)
  async getAdminById(req, res) {
    try {
      const { id } = req.params;
      const result = await AdminService.getAdminById(id);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Admin user retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/admin
  // @desc    Create new admin user
  // @access  Private (Super Admin only)
  async createAdmin(req, res) {
    try {
      const adminData = req.body;
      const result = await AdminService.createAdmin(adminData);

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
        message: "Admin user created successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   PUT /api/admin/:id
  // @desc    Update admin user
  // @access  Private (Admin only)
  async updateAdmin(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const result = await AdminService.updateAdmin(id, updateData);

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
        message: "Admin user updated successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   DELETE /api/admin/:id
  // @desc    Delete admin user
  // @access  Private (Super Admin only)
  async deleteAdmin(req, res) {
    try {
      const { id } = req.params;
      const result = await AdminService.deleteAdmin(id);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Admin user deleted successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   PATCH /api/admin/:id/status
  // @desc    Update admin user status only
  // @access  Private (Admin only)
  async updateAdminStatus(req, res) {
    try {
      const { id } = req.params;
      const { admin_status } = req.body;

      const result = await AdminService.updateAdminStatus(id, admin_status);

      if (!result.success) {
        return res.status(404).json({
          error: "Not Found",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Admin user status updated successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   GET /api/admin/stats
  // @desc    Get admin statistics
  // @access  Private (Admin only)
  async getAdminStats(req, res) {
    try {
      const result = await AdminService.getAdminStats();

      if (!result.success) {
        return res.status(400).json({
          error: "Database Error",
          message: result.error,
        });
      }

      res.json({
        success: true,
        message: "Admin statistics retrieved successfully",
        data: result.data,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/admin/login
  // @desc    Admin login
  // @access  Public
  async loginAdmin(req, res) {
    try {
      const { username, password } = req.body;

      // Get admin by username
      const adminResult = await AdminService.getAdminByUsername(username);

      if (!adminResult.success) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: "Invalid username or password",
        });
      }

      // Verify password
      const passwordResult = await AdminService.verifyPassword(password, adminResult.data.password);

      if (!passwordResult.success || !passwordResult.isValid) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: "Invalid username or password",
        });
      }

      // Remove password from response
      const { password: _, ...adminData } = adminResult.data;
      console.log("adminData:", adminData);

      // Generate JWT tokens
      const tokenResult = generateToken(adminData);
      console.log("tokenResult:", tokenResult);

      const refreshTokenResult = generateRefreshToken(adminData);
      console.log("refreshTokenResult:", refreshTokenResult);

      if (!tokenResult.success || !refreshTokenResult.success) {
        console.log("Token generation failed!");
        return res.status(500).json({
          error: "Token Generation Failed",
          message: "Failed to generate authentication tokens",
        });
      }

      console.log("Sending response with tokens...");
      res.json({
        success: true,
        message: "Admin login successful",
        data: {
          admin: adminData,
          accessToken: tokenResult.token,
          refreshToken: refreshTokenResult.refreshToken,
          tokenType: tokenResult.tokenType,
          expiresIn: tokenResult.expiresIn,
          expiresAt: tokenResult.expiresAt,
          loginTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.log("Login error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/admin/logout
  // @desc    Admin logout
  // @access  Private (Admin only)
  async logoutAdmin(req, res) {
    try {
      // In a stateless JWT system, logout is typically handled client-side
      // by removing the token from storage
      // For server-side logout, you could implement a token blacklist

      res.json({
        success: true,
        message: "Admin logged out successfully",
        instructions: "Please remove the token from client storage",
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/admin/refresh-token
  // @desc    Refresh access token using refresh token
  // @access  Public (with valid refresh token)
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Refresh token is required",
        });
      }

      // Verify refresh token
      const { verifyRefreshToken } = await import("../utils/jwt.js");
      const verifyResult = verifyRefreshToken(refreshToken);

      if (!verifyResult.success) {
        return res.status(401).json({
          error: "Invalid Refresh Token",
          message: verifyResult.error,
        });
      }

      // Get latest admin data
      const adminResult = await AdminService.getAdminById(verifyResult.decoded.id);

      if (!adminResult.success) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: "Admin user not found",
        });
      }

      // Check if admin is still active
      if (adminResult.data.admin_status !== "active") {
        return res.status(401).json({
          error: "Authentication Failed",
          message: `Admin account is ${adminResult.data.admin_status}`,
        });
      }

      // Generate new access token
      const tokenResult = generateToken(adminResult.data);

      if (!tokenResult.success) {
        return res.status(500).json({
          error: "Token Generation Failed",
          message: "Failed to generate new access token",
        });
      }

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          accessToken: tokenResult.token,
          tokenType: tokenResult.tokenType,
          expiresIn: tokenResult.expiresIn,
          expiresAt: tokenResult.expiresAt,
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

export default new AdminController();
