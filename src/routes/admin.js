import express from "express";
import AdminController from "../controllers/adminController.js";
import {
  validateAdminCreate,
  validateAdminUpdate,
  validateAdminStatus,
  validateAdminLogin,
  validateUUID,
} from "../middleware/adminValidation.js";
import { authenticateToken, requireSuperAdmin, requireAdmin, requireSelfOrHigherRole, loginRateLimit } from "../middleware/auth.js";

const router = express.Router();

// @route   GET /api/admin
// @desc    Get all admin users
// @access  Private (Admin only)
router.get("/", authenticateToken, requireAdmin, AdminController.getAllAdmins);

// @route   GET /api/admin/stats
// @desc    Get admin statistics
// @access  Private (Admin only)
router.get("/stats", authenticateToken, requireAdmin, AdminController.getAdminStats);

// @route   GET /api/admin/:id
// @desc    Get admin user by ID
// @access  Private (Admin only)
router.get("/:id", validateUUID, authenticateToken, requireSelfOrHigherRole(), AdminController.getAdminById);

// @route   POST /api/admin
// @desc    Create new admin user
// @access  Private (Super Admin only)
router.post("/", validateAdminCreate, authenticateToken, requireSuperAdmin, AdminController.createAdmin);

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post("/login", validateAdminLogin, loginRateLimit(), AdminController.loginAdmin);

// @route   POST /api/admin/logout
// @desc    Admin logout
// @access  Private (Admin only)
router.post("/logout", authenticateToken, AdminController.logoutAdmin);

// @route   POST /api/admin/refresh-token
// @desc    Refresh access token
// @access  Public (with valid refresh token)
router.post("/refresh-token", AdminController.refreshToken);

// @route   PUT /api/admin/:id
// @desc    Update admin user
// @access  Private (Admin only)
router.put("/:id", validateUUID, validateAdminUpdate, authenticateToken, requireSelfOrHigherRole(), AdminController.updateAdmin);

// @route   PATCH /api/admin/:id/status
// @desc    Update admin user status only
// @access  Private (Admin only)
router.patch("/:id/status", validateUUID, validateAdminStatus, authenticateToken, requireAdmin, AdminController.updateAdminStatus);

// @route   DELETE /api/admin/:id
// @desc    Delete admin user
// @access  Private (Super Admin only)
router.delete("/:id", validateUUID, authenticateToken, requireSuperAdmin, AdminController.deleteAdmin);

export default router;
