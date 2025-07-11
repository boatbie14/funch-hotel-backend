import { supabase } from "../config/database.js";
import bcrypt from "bcryptjs";

class UserLoginService {
  // Get user by email or username (for login)
  async getUserByEmailOrUsername(emailOrUsername) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`)
        .eq("status", "active")
        .single();

      if (error) {
        throw new Error(`User not found: ${error.message}`);
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

  // Get user by ID
  async getUserById(id) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, fname, lname, username, phone1, phone2, address, status, create_at")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`User not found: ${error.message}`);
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

  // Verify user password (for login)
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      return {
        success: true,
        isValid: isValid,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update user last login IP (optional)
  async updateLastLoginIP(id, ip) {
    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          ip: ip,
          last_update: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id")
        .single();

      if (error) {
        throw new Error(`Failed to update login info: ${error.message}`);
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
}

export default new UserLoginService();
