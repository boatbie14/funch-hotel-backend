import express from "express";
import UserLoginController from "../controllers/userLoginController.js";
import { validateUserLogin, validateRefreshToken } from "../middleware/userLoginValidation.js";
import { authenticateUserToken, userLoginRateLimit } from "../middleware/userAuth.js";

const router = express.Router();

// @route   POST /api/login
// @desc    User login
// @access  Public
router.post("/login", validateUserLogin, userLoginRateLimit(), UserLoginController.loginUser);

// @route   POST /api/logout
// @desc    User logout
// @access  Private (User only)
router.post("/logout", authenticateUserToken, UserLoginController.logoutUser);

// @route   POST /api/refresh-token
// @desc    Refresh access token
// @access  Public (with valid refresh token)
router.post("/refresh-token", validateRefreshToken, UserLoginController.refreshToken);

// @route   GET /api/profile
// @desc    Get user profile
// @access  Private (User only)
router.get("/profile", authenticateUserToken, UserLoginController.getUserProfile);

export default router;
