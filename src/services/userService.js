import { supabase } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

class UserService {
  // Check if email already exists
  async checkDuplicateEmail(email, excludeId = null) {
    try {
      let query = supabase.from("users").select("id, email").eq("email", email);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        hasDuplicate: data.length > 0,
        existingUser: data[0] || null,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check if username already exists
  async checkDuplicateUsername(username, excludeId = null) {
    try {
      let query = supabase.from("users").select("id, username").eq("username", username);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        hasDuplicate: data.length > 0,
        existingUser: data[0] || null,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Hash password
  async hashPassword(password) {
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return {
        success: true,
        hashedPassword: hashedPassword,
      };
    } catch (error) {
      return {
        success: false,
        error: `Password hashing failed: ${error.message}`,
      };
    }
  }

  // Create new user
  async createUser(userData, clientIp = null) {
    try {
      const {
        email,
        password,
        fname,
        lname,
        user_image = null,
        phone1 = null,
        phone2 = null,
        address = null,
        username = null,
        status = "active",
      } = userData;

      // Check for duplicate email
      const emailCheck = await this.checkDuplicateEmail(email);
      if (!emailCheck.success) {
        throw new Error(emailCheck.error);
      }

      if (emailCheck.hasDuplicate) {
        throw new Error("Duplicate email: Email already exists");
      }

      // Check for duplicate username (if provided)
      if (username) {
        const usernameCheck = await this.checkDuplicateUsername(username);
        if (!usernameCheck.success) {
          throw new Error(usernameCheck.error);
        }

        if (usernameCheck.hasDuplicate) {
          throw new Error("Duplicate username: Username already exists");
        }
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);
      if (!passwordHash.success) {
        throw new Error(passwordHash.error);
      }

      // Create new user object
      const newUser = {
        id: uuidv4(),
        email,
        password: passwordHash.hashedPassword,
        fname,
        lname,
        user_image,
        phone1,
        phone2,
        address,
        username,
        status,
        ip: clientIp,
        create_at: new Date().toISOString(),
        last_update: new Date().toISOString(),
      };

      // Insert user into database
      const { data, error } = await supabase
        .from("users")
        .insert(newUser)
        .select(
          `
          id,
          email,
          fname,
          lname,
          user_image,
          phone1,
          phone2,
          address,
          username,
          status,
          ip,
          create_at,
          last_update
        `
        )
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
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

export default new UserService();
