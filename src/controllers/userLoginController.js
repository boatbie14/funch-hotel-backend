import UserLoginService from "../services/userLoginService.js";
import { generateToken, generateRefreshToken } from "../utils/jwt.js";

class UserLoginController {
  // @route   POST /api/login
  // @desc    User login
  // @access  Public
  async loginUser(req, res) {
    try {
      const { emailOrUsername, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || req.headers["x-forwarded-for"];

      // Get user by email or username
      const userResult = await UserLoginService.getUserByEmailOrUsername(emailOrUsername);

      if (!userResult.success) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: "Invalid email/username or password",
        });
      }

      // Verify password
      const passwordResult = await UserLoginService.verifyPassword(password, userResult.data.password);

      if (!passwordResult.success || !passwordResult.isValid) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: "Invalid email/username or password",
        });
      }

      // Check user status
      if (userResult.data.status !== "active") {
        return res.status(401).json({
          error: "Authentication Failed",
          message: `Account is ${userResult.data.status}`,
        });
      }

      // Remove password from response
      const { password: _, ...userData } = userResult.data;

      // Prepare user data for token
      const tokenUserData = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        fname: userData.fname,
        lname: userData.lname,
        status: userData.status,
      };

      // Generate JWT tokens
      const tokenResult = generateToken(tokenUserData);
      const refreshTokenResult = generateRefreshToken(tokenUserData);

      if (!tokenResult.success || !refreshTokenResult.success) {
        return res.status(500).json({
          error: "Token Generation Failed",
          message: "Failed to generate authentication tokens",
        });
      }

      // Update last login IP (optional)
      if (clientIP) {
        await UserLoginService.updateLastLoginIP(userData.id, clientIP);
      }

      // Prepare response data
      const responseData = {
        id: userData.id,
        email: userData.email,
        fname: userData.fname,
        lname: userData.lname,
        username: userData.username,
        phone1: userData.phone1,
        phone2: userData.phone2,
        address: userData.address,
      };

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: responseData,
          accessToken: tokenResult.token,
          refreshToken: refreshTokenResult.refreshToken,
          tokenType: tokenResult.tokenType,
          expiresIn: tokenResult.expiresIn,
          expiresAt: tokenResult.expiresAt,
          loginTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.log("User login error:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/logout
  // @desc    User logout
  // @access  Private (User only)
  async logoutUser(req, res) {
    try {
      // In a stateless JWT system, logout is typically handled client-side
      // by removing the token from storage
      // For server-side logout, you could implement a token blacklist

      res.json({
        success: true,
        message: "User logged out successfully",
        instructions: "Please remove the token from client storage",
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }

  // @route   POST /api/refresh-token
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

      // Get latest user data
      const userResult = await UserLoginService.getUserById(verifyResult.decoded.id);

      if (!userResult.success) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: "User not found",
        });
      }

      // Check if user is still active
      if (userResult.data.status !== "active") {
        return res.status(401).json({
          error: "Authentication Failed",
          message: `User account is ${userResult.data.status}`,
        });
      }

      // Prepare user data for new token
      const tokenUserData = {
        id: userResult.data.id,
        email: userResult.data.email,
        username: userResult.data.username,
        fname: userResult.data.fname,
        lname: userResult.data.lname,
        status: userResult.data.status,
      };

      // Generate new access token
      const tokenResult = generateToken(tokenUserData);

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

  // @route   GET /api/profile
  // @desc    Get user profile
  // @access  Private (User only)
  async getUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const userResult = await UserLoginService.getUserById(userId);

      if (!userResult.success) {
        return res.status(404).json({
          error: "Not Found",
          message: userResult.error,
        });
      }

      // Prepare response data
      const responseData = {
        id: userResult.data.id,
        email: userResult.data.email,
        fname: userResult.data.fname,
        lname: userResult.data.lname,
        username: userResult.data.username,
        phone1: userResult.data.phone1,
        phone2: userResult.data.phone2,
        address: userResult.data.address,
      };

      res.json({
        success: true,
        message: "User profile retrieved successfully",
        data: responseData,
      });
    } catch (error) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }
}

export default new UserLoginController();
