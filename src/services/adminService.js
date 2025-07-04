import { supabase } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

class AdminService {
  // Get all admin users
  async getAllAdmins() {
    try {
      const { data, error } = await supabase
        .from("user_admin")
        .select("id, fname, lname, username, email, create, admin_role, admin_status")
        .order("create", { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        success: true,
        data: data,
        count: data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get admin user by ID
  async getAdminById(id) {
    try {
      const { data, error } = await supabase
        .from("user_admin")
        .select("id, fname, lname, username, email, create, admin_role, admin_status")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Admin user not found: ${error.message}`);
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

  // Get admin user by username (for login)
  async getAdminByUsername(username) {
    try {
      const { data, error } = await supabase.from("user_admin").select("*").eq("username", username).eq("admin_status", "active").single();

      if (error) {
        throw new Error(`Admin user not found: ${error.message}`);
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

  // Check if username or email exists
  async checkDuplicateCredentials(username, email, excludeId = null) {
    try {
      let query = supabase.from("user_admin").select("id, username, email").or(`username.eq.${username},email.eq.${email}`);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const duplicates = {
        username: data.find((admin) => admin.username === username),
        email: data.find((admin) => admin.email === email),
      };

      return {
        success: true,
        hasDuplicates: data.length > 0,
        duplicates: duplicates,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create new admin user
  async createAdmin(adminData) {
    try {
      const { fname, lname, username, email, password, admin_role, admin_status } = adminData;

      // Check for duplicates
      const duplicateCheck = await this.checkDuplicateCredentials(username, email);
      if (!duplicateCheck.success) {
        throw new Error(duplicateCheck.error);
      }

      if (duplicateCheck.hasDuplicates) {
        const conflicts = [];
        if (duplicateCheck.duplicates.username) conflicts.push("username");
        if (duplicateCheck.duplicates.email) conflicts.push("email");
        throw new Error(`Duplicate ${conflicts.join(" and ")}: already exists`);
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new admin
      const newAdmin = {
        id: uuidv4(),
        fname,
        lname,
        username,
        email,
        password: hashedPassword,
        create: new Date().toISOString(),
        admin_role,
        admin_status,
      };

      const { data, error } = await supabase
        .from("user_admin")
        .insert(newAdmin)
        .select("id, fname, lname, username, email, create, admin_role, admin_status")
        .single();

      if (error) {
        throw new Error(`Failed to create admin: ${error.message}`);
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

  // Update admin user
  async updateAdmin(id, updateData) {
    try {
      // Remove undefined fields
      const cleanData = {};
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          cleanData[key] = updateData[key];
        }
      });

      // Check for duplicates if username or email is being updated
      if (cleanData.username || cleanData.email) {
        const duplicateCheck = await this.checkDuplicateCredentials(cleanData.username || "", cleanData.email || "", id);

        if (!duplicateCheck.success) {
          throw new Error(duplicateCheck.error);
        }

        if (duplicateCheck.hasDuplicates) {
          const conflicts = [];
          if (duplicateCheck.duplicates.username && cleanData.username) conflicts.push("username");
          if (duplicateCheck.duplicates.email && cleanData.email) conflicts.push("email");
          if (conflicts.length > 0) {
            throw new Error(`Duplicate ${conflicts.join(" and ")}: already exists`);
          }
        }
      }

      // Hash password if provided
      if (cleanData.password) {
        const saltRounds = 12;
        cleanData.password = await bcrypt.hash(cleanData.password, saltRounds);
      }

      const { data, error } = await supabase
        .from("user_admin")
        .update(cleanData)
        .eq("id", id)
        .select("id, fname, lname, username, email, create, admin_role, admin_status")
        .single();

      if (error) {
        throw new Error(`Failed to update admin: ${error.message}`);
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

  // Delete admin user
  async deleteAdmin(id) {
    try {
      const { data, error } = await supabase.from("user_admin").delete().eq("id", id).select("id, fname, lname, username, email").single();

      if (error) {
        throw new Error(`Failed to delete admin: ${error.message}`);
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

  // Update admin status only
  async updateAdminStatus(id, admin_status) {
    try {
      const { data, error } = await supabase
        .from("user_admin")
        .update({ admin_status })
        .eq("id", id)
        .select("id, fname, lname, username, email, admin_role, admin_status")
        .single();

      if (error) {
        throw new Error(`Failed to update admin status: ${error.message}`);
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

  // Verify admin password (for login)
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

  // Get admin statistics
  async getAdminStats() {
    try {
      const { data, error } = await supabase.from("user_admin").select("admin_role, admin_status");

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const stats = {
        total: data.length,
        byRole: {
          super_admin: data.filter((admin) => admin.admin_role === "super_admin").length,
          admin: data.filter((admin) => admin.admin_role === "admin").length,
          manager: data.filter((admin) => admin.admin_role === "manager").length,
        },
        byStatus: {
          active: data.filter((admin) => admin.admin_status === "active").length,
          inactive: data.filter((admin) => admin.admin_status === "inactive").length,
          suspended: data.filter((admin) => admin.admin_status === "suspended").length,
        },
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new AdminService();
