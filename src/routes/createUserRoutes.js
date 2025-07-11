import express from "express";
import UserController from "../controllers/userController.js";
import {
  sanitizeUserData,
  validateUserContent,
  validateEmail,
  validatePassword,
  validatePhone,
  validateUserNames,
  validateUserNameLength,
  validateUsername,
  validateUserImage,
  validateUserStatus,
  validateUserCreate,
  rateLimitUserRegistration,
} from "../middleware/userValidation.js";

const router = express.Router();

// @route   POST /api/users/check-email
// @desc    Check if email exists (for registration validation)
// @access  Public
router.post("/check-email", sanitizeUserData, validateEmail, UserController.checkEmailExists);

// @route   POST /api/users/check-username
// @desc    Check if username exists (for registration validation)
// @access  Public
router.post("/check-username", sanitizeUserData, validateUsername, UserController.checkUsernameExists);

// @route   POST /api/users/register
// @desc    Register new user
// @access  Public
router.post(
  "/register",
  rateLimitUserRegistration,
  sanitizeUserData,
  validateUserContent,
  validateUserCreate,
  validateEmail,
  validatePassword,
  validatePhone,
  validateUserNames,
  validateUserNameLength,
  validateUsername,
  validateUserImage,
  validateUserStatus,
  UserController.registerUser
);

// @route   POST /api/users/login
// @desc    Login user
// @access  Public
router.post("/login", sanitizeUserData, validateEmail, validatePassword, UserController.loginUser);

export default router;
