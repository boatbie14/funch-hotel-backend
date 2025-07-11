import { supabase } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class BookingService {
  // Get all bookings with pagination and filters
  async getAllBookings(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const { user_id, date, status, hotel_id } = filters;

      // Build query for count
      let countQuery = supabase.from("bookings").select("*", { count: "exact", head: true });

      // Build query for data - แก้ไข column names ให้ถูกต้อง
      let dataQuery = supabase.from("bookings").select(`
          id,
          user_id,
          hotel_id,
          room_id,
          date,
          price,
          note,
          create_at,
          status,
          users(id, fname, lname, email),
          hotels(id, name_th, name_en),
          rooms(id, name_th, name_en, total_rooms)
        `);

      // Apply filters
      if (user_id) {
        countQuery = countQuery.eq("user_id", user_id);
        dataQuery = dataQuery.eq("user_id", user_id);
      }

      if (date) {
        countQuery = countQuery.eq("date", date);
        dataQuery = dataQuery.eq("date", date);
      }

      if (status) {
        countQuery = countQuery.eq("status", status);
        dataQuery = dataQuery.eq("status", status);
      }

      if (hotel_id) {
        countQuery = countQuery.eq("hotel_id", hotel_id);
        dataQuery = dataQuery.eq("hotel_id", hotel_id);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) {
        throw new Error(`Failed to get bookings count: ${countError.message}`);
      }

      // Get bookings with pagination
      const { data, error } = await dataQuery.order("create_at", { ascending: false }).range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: data,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get booking by ID
  async getBookingById(id) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          user_id,
          hotel_id,
          room_id,
          date,
          price,
          note,
          create_at,
          status,
          users(id, fname, lname, email),
          hotels(id, name_th, name_en),
          rooms(id, name_th, name_en, total_rooms)
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Booking not found: ${error.message}`);
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

  // Check room availability
  async checkRoomAvailability(room_id, date, excludeBookingId = null) {
    try {
      // Get room total capacity
      const { data: roomData, error: roomError } = await supabase.from("rooms").select("total_rooms").eq("id", room_id).single();

      if (roomError) {
        throw new Error(`Room not found: ${roomError.message}`);
      }

      const totalRooms = roomData.total_rooms;

      // Count active bookings for this room on this date
      let query = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("room_id", room_id)
        .eq("date", date)
        .eq("status", "active");

      // Exclude specific booking ID if provided (for updates)
      if (excludeBookingId) {
        query = query.neq("id", excludeBookingId);
      }

      const { count, error } = await query;

      if (error) {
        throw new Error(`Failed to check availability: ${error.message}`);
      }

      const isAvailable = count < totalRooms;

      return {
        success: true,
        isAvailable,
        totalRooms,
        currentBookings: count,
        availableRooms: totalRooms - count,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create new booking (single date)
  async createBooking(bookingData) {
    try {
      const { user_id, hotel_id, room_id, date, price, note } = bookingData;

      // Check room availability
      const availabilityCheck = await this.checkRoomAvailability(room_id, date);

      if (!availabilityCheck.success) {
        throw new Error(availabilityCheck.error);
      }

      if (!availabilityCheck.isAvailable) {
        throw new Error(
          `Room is fully booked for ${date}. Available rooms: ${availabilityCheck.totalRooms}, Current bookings: ${availabilityCheck.currentBookings}`
        );
      }

      // Create new booking
      const newBooking = {
        id: uuidv4(),
        user_id,
        hotel_id,
        room_id,
        date,
        price,
        note: note || null,
        status: "active",
        create_at: new Date().toISOString(),
      };

      // ใช้ column names ที่ถูกต้อง
      const { data, error } = await supabase
        .from("bookings")
        .insert(newBooking)
        .select(
          `
          id,
          user_id,
          hotel_id,
          room_id,
          date,
          price,
          note,
          create_at,
          status,
          users(id, fname, lname, email),
          hotels(id, name_th, name_en),
          rooms(id, name_th, name_en, total_rooms)
        `
        )
        .single();

      if (error) {
        throw new Error(`Failed to create booking: ${error.message}`);
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

  // Create multiple bookings (multiple dates)
  async createMultipleBookings(bookingData) {
    try {
      const { user_id, hotel_id, room_id, dates, price, note } = bookingData;

      // Validate dates array
      if (!Array.isArray(dates) || dates.length === 0) {
        throw new Error("dates must be a non-empty array");
      }

      // Check availability for all dates first
      const unavailableDates = [];
      const availabilityChecks = [];

      for (const date of dates) {
        const availabilityCheck = await this.checkRoomAvailability(room_id, date);

        if (!availabilityCheck.success) {
          throw new Error(availabilityCheck.error);
        }

        if (!availabilityCheck.isAvailable) {
          unavailableDates.push({
            date,
            totalRooms: availabilityCheck.totalRooms,
            currentBookings: availabilityCheck.currentBookings,
          });
        }

        availabilityChecks.push({
          date,
          available: availabilityCheck.isAvailable,
        });
      }

      // If any date is unavailable, return error with details
      if (unavailableDates.length > 0) {
        const errorMessage = unavailableDates
          .map((item) => `${item.date} (Available: ${item.totalRooms}, Current: ${item.currentBookings})`)
          .join(", ");

        throw new Error(`Room is fully booked for these dates: ${errorMessage}`);
      }

      // Create bookings for all dates
      const bookingsToInsert = dates.map((date) => ({
        id: uuidv4(),
        user_id,
        hotel_id,
        room_id,
        date,
        price,
        note: note || null,
        status: "active",
        create_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase.from("bookings").insert(bookingsToInsert).select(`
          id,
          user_id,
          hotel_id,
          room_id,
          date,
          price,
          note,
          create_at,
          status,
          users(id, fname, lname, email),
          hotels(id, name_th, name_en),
          rooms(id, name_th, name_en, total_rooms)
        `);

      if (error) {
        throw new Error(`Failed to create bookings: ${error.message}`);
      }

      return {
        success: true,
        data: data,
        count: data.length,
        dates: dates,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update booking
  async updateBooking(id, updateData) {
    try {
      // Remove undefined fields
      const cleanData = {};
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          cleanData[key] = updateData[key];
        }
      });

      // Validate status if provided
      if (cleanData.status && !["active", "cancel"].includes(cleanData.status)) {
        throw new Error('Status must be either "active" or "cancel"');
      }

      // If updating room_id or date, check availability
      if (cleanData.room_id || cleanData.date) {
        // Get current booking data
        const currentBooking = await this.getBookingById(id);
        if (!currentBooking.success) {
          throw new Error("Booking not found");
        }

        const room_id = cleanData.room_id || currentBooking.data.room_id;
        const date = cleanData.date || currentBooking.data.date;

        // Check availability (exclude current booking)
        const availabilityCheck = await this.checkRoomAvailability(room_id, date, id);

        if (!availabilityCheck.success) {
          throw new Error(availabilityCheck.error);
        }

        if (!availabilityCheck.isAvailable) {
          throw new Error(
            `Room is fully booked for ${date}. Available rooms: ${availabilityCheck.totalRooms}, Current bookings: ${availabilityCheck.currentBookings}`
          );
        }
      }

      const { data, error } = await supabase
        .from("bookings")
        .update(cleanData)
        .eq("id", id)
        .select(
          `
          id,
          user_id,
          hotel_id,
          room_id,
          date,
          price,
          note,
          create_at,
          status,
          users(id, fname, lname, email),
          hotels(id, name_th, name_en),
          rooms(id, name_th, name_en, total_rooms)
        `
        )
        .single();

      if (error) {
        throw new Error(`Failed to update booking: ${error.message}`);
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

  // Cancel booking (soft delete by setting status to 'cancel')
  async cancelBooking(id) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "cancel" })
        .eq("id", id)
        .select(
          `
          id,
          user_id,
          hotel_id,
          room_id,
          date,
          price,
          note,
          create_at,
          status
        `
        )
        .single();

      if (error) {
        throw new Error(`Failed to cancel booking: ${error.message}`);
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

  // Get bookings by user
  async getBookingsByUserId(userId, page = 1, limit = 20) {
    try {
      return await this.getAllBookings(page, limit, { user_id: userId });
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get bookings by date range
  async getBookingsByDateRange(startDate, endDate, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const { count, error: countError } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .gte("date", startDate)
        .lte("date", endDate);

      if (countError) {
        throw new Error(`Failed to get bookings count: ${countError.message}`);
      }

      // Get bookings
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          user_id,
          hotel_id,
          room_id,
          date,
          price,
          note,
          create_at,
          status,
          users(id, fname, lname, email),
          hotels(id, name_th, name_en),
          rooms(id, name_th, name_en, total_rooms)
        `
        )
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: data,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: count,
          itemsPerPage: limit,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete booking (hard delete)
  async deleteBooking(id) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", id)
        .select(
          `
          id,
          user_id,
          hotel_id,
          room_id,
          date,
          price,
          note,
          create_at,
          status
        `
        )
        .single();

      if (error) {
        throw new Error(`Failed to delete booking: ${error.message}`);
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

export default new BookingService();
