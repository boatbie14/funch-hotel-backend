import { supabase } from "../config/database.js";
import { v4 as uuidv4 } from "uuid";

class RoomsService {
  // Helper function to log requests
  /*   logRequest(method, endpoint, data) {
    console.log("\n" + "=".repeat(50));
    console.log(`[${new Date().toISOString()}] ${method} ${endpoint}`);
    console.log("Request Data:", JSON.stringify(data, null, 2));
    console.log("=".repeat(50) + "\n");
  } */

  // Get all rooms with pagination and optional hotel filter
  async getAllRooms(page = 1, limit = 20, hotelId = null) {
    try {
      const offset = (page - 1) * limit;

      // Build query with optional hotel filter for count
      let countQuery = supabase.from("rooms").select("*", { count: "exact", head: true });

      if (hotelId) {
        countQuery = countQuery.eq("hotel_id", hotelId);
      }

      // Get total count for pagination
      const { count, error: countError } = await countQuery;

      if (countError) {
        throw new Error(`Failed to get rooms count: ${countError.message}`);
      }

      // Get rooms with related data including hotel information
      let dataQuery = supabase.from("rooms").select(`
          id,
          name_th,
          name_en,
          description_th,
          description_en,
          max_adult,
          max_children,
          total_rooms,
          status,
          hotel_id,
          created_at,
          last_update,
          last_update_by,
          seo_title_th,
          seo_title_en,
          seo_description_th,
          seo_description_en,
          slug,
          hotels(
            id,
            name_th,
            name_en
          ),
          room_options(
            id,
            bed,
            kitchen,
            air_conditioner,
            fan,
            free_wifi,
            city_view,
            sea_view,
            free_breakfast,
            restaurant,
            smoking
          )
        `);

      if (hotelId) {
        dataQuery = dataQuery.eq("hotel_id", hotelId);
      }

      const { data: rawData, error } = await dataQuery.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Transform data to match expected format
      const transformedData = rawData.map((room) => {
        // Get the first room_options if exists (since it's now 1-to-1 relationship)
        const options = room.room_options?.[0] || null;

        // Extract hotel data
        const hotel = room.hotels || null;

        // Remove room_options and hotels array from room object
        const { room_options, hotels, ...roomData } = room;

        return {
          room: roomData,
          hotel: hotel,
          options: options,
        };
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: transformedData,
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

  // Get room by ID
  async getRoomById(id) {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select(
          `
          id,
          name_th,
          name_en,
          description_th,
          description_en,
          max_adult,
          max_children,
          total_rooms,
          status,
          hotel_id,
          created_at,
          last_update,
          last_update_by,
          seo_title_th,
          seo_title_en,
          seo_description_th,
          seo_description_en,
          slug,
          hotels(
            id,
            name_th,
            name_en
          ),
          room_options(
            id,
            bed,
            kitchen,
            air_conditioner,
            fan,
            free_wifi,
            city_view,
            sea_view,
            free_breakfast,
            restaurant,
            smoking
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Room not found: ${error.message}`);
      }

      // Transform data to match expected format
      const options = data.room_options?.[0] || null;
      const hotel = data.hotels || null;
      const { room_options, hotels, ...roomData } = data;

      return {
        success: true,
        data: {
          room: roomData,
          hotel: hotel,
          options: options,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check room availability for specific date range
  async checkRoomAvailability(roomId, checkInDate, checkOutDate) {
    try {
      // Get total rooms with hotel info
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select(
          `
          total_rooms, 
          name_th, 
          name_en,
          hotels(
            id,
            name_th,
            name_en
          )
        `
        )
        .eq("id", roomId)
        .single();

      if (roomError) {
        throw new Error(`Room not found: ${roomError.message}`);
      }

      if (!room.total_rooms || room.total_rooms === 0) {
        throw new Error("Room total count not set - cannot check availability");
      }

      // Count booked rooms for date range (overlapping bookings)
      const { count: bookedRooms, error: bookingError } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId)
        .in("status", ["confirmed", "checked_in"]) // Include relevant booking statuses
        .or(`and(check_in.lte.${checkOutDate},check_out.gte.${checkInDate})`);

      if (bookingError) {
        throw new Error(`Failed to check bookings: ${bookingError.message}`);
      }

      const availableRooms = room.total_rooms - (bookedRooms || 0);

      return {
        success: true,
        data: {
          roomId: roomId,
          roomName: {
            th: room.name_th,
            en: room.name_en,
          },
          hotelName: room.hotels
            ? {
                th: room.hotels.name_th,
                en: room.hotels.name_en,
              }
            : null,
          totalRooms: room.total_rooms,
          bookedRooms: bookedRooms || 0,
          availableRooms: Math.max(0, availableRooms),
          isAvailable: availableRooms > 0,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get current room availability (without specific dates)
  async getCurrentRoomAvailability(roomId) {
    try {
      // Get total rooms with hotel info
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select(
          `
          total_rooms, 
          name_th, 
          name_en,
          hotels(
            id,
            name_th,
            name_en
          )
        `
        )
        .eq("id", roomId)
        .single();

      if (roomError) {
        throw new Error(`Room not found: ${roomError.message}`);
      }

      if (!room.total_rooms || room.total_rooms === 0) {
        return {
          success: true,
          data: {
            roomId: roomId,
            roomName: {
              th: room.name_th,
              en: room.name_en,
            },
            hotelName: room.hotels
              ? {
                  th: room.hotels.name_th,
                  en: room.hotels.name_en,
                }
              : null,
            totalRooms: room.total_rooms,
            status: "unavailable",
            message: "Room total count not set",
          },
        };
      }

      // Count currently occupied rooms (today's active bookings)
      const today = new Date().toISOString().split("T")[0];
      const { count: occupiedRooms, error: bookingError } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId)
        .in("status", ["confirmed", "checked_in"])
        .lte("check_in", today)
        .gte("check_out", today);

      if (bookingError) {
        throw new Error(`Failed to check current bookings: ${bookingError.message}`);
      }

      const availableRooms = room.total_rooms - (occupiedRooms || 0);

      return {
        success: true,
        data: {
          roomId: roomId,
          roomName: {
            th: room.name_th,
            en: room.name_en,
          },
          hotelName: room.hotels
            ? {
                th: room.hotels.name_th,
                en: room.hotels.name_en,
              }
            : null,
          totalRooms: room.total_rooms,
          occupiedRooms: occupiedRooms || 0,
          availableRooms: Math.max(0, availableRooms),
          isAvailable: availableRooms > 0,
          status: availableRooms > 0 ? "available" : "fully_booked",
          asOfDate: today,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Verify if hotel exists
  async verifyHotelExists(hotelId) {
    try {
      const { data, error } = await supabase.from("hotels").select("id, name_th, name_en").eq("id", hotelId).single();

      if (error) {
        throw new Error(`Hotel not found: ${error.message}`);
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

  // Check if room name already exists within the same hotel
  async checkDuplicateRoomName(name_th, name_en, hotel_id, excludeId = null) {
    try {
      let query = supabase
        .from("rooms")
        .select("id, name_th, name_en, hotel_id")
        .eq("hotel_id", hotel_id)
        .or(`name_th.eq.${name_th},name_en.eq.${name_en}`);

      if (excludeId) {
        query = query.neq("id", excludeId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const duplicates = {
        name_th: data.find((room) => room.name_th === name_th),
        name_en: data.find((room) => room.name_en === name_en),
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

  // Check if slug already exists globally
  async checkDuplicateSlug(slug, excludeId = null) {
    try {
      let query = supabase.from("rooms").select("id, slug").eq("slug", slug);

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
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create room options
  async createRoomOptions(roomId, optionsData) {
    try {
      // Create room option with room_id
      const { data: optionData, error: optionError } = await supabase
        .from("room_options")
        .insert({
          id: uuidv4(),
          room_id: roomId,
          ...optionsData,
        })
        .select()
        .single();

      if (optionError) {
        throw new Error(`Failed to create room options: ${optionError.message}`);
      }

      return {
        success: true,
        data: optionData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create base prices
  async createBasePrices(roomId, pricesData) {
    try {
      const { data, error } = await supabase
        .from("room_base_prices")
        .insert({
          id: uuidv4(),
          room_id: roomId,
          ...pricesData,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create base prices: ${error.message}`);
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

  // Create override prices
  async createOverridePrices(roomId, overridePricesArray) {
    try {
      if (!overridePricesArray || overridePricesArray.length === 0) {
        return { success: true, data: [] };
      }

      const pricesWithIds = overridePricesArray.map((price) => ({
        id: uuidv4(),
        room_id: roomId,
        ...price,
      }));

      const { data, error } = await supabase.from("room_override_prices").insert(pricesWithIds).select();

      if (error) {
        throw new Error(`Failed to create override prices: ${error.message}`);
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

  // Update room options
  async updateRoomOptions(roomId, optionsData) {
    try {
      // Update the room options directly
      const { data, error } = await supabase.from("room_options").update(optionsData).eq("room_id", roomId).select().single();

      if (error) {
        throw new Error(`Failed to update room options: ${error.message}`);
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

  // Update base prices
  async updateBasePrices(roomId, pricesData) {
    try {
      // Update base prices for the room
      const { data, error } = await supabase.from("room_base_prices").update(pricesData).eq("room_id", roomId).select().single();

      if (error) {
        throw new Error(`Failed to update base prices: ${error.message}`);
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

  // Update override prices (replace all existing ones)
  async updateOverridePrices(roomId, overridePricesArray) {
    try {
      // Delete existing override prices
      const { error: deleteError } = await supabase.from("room_override_prices").delete().eq("room_id", roomId);

      if (deleteError) {
        throw new Error(`Failed to delete existing override prices: ${deleteError.message}`);
      }

      // If no new override prices provided, return success
      if (!overridePricesArray || overridePricesArray.length === 0) {
        return { success: true, data: [] };
      }

      // Create new override prices
      const pricesWithIds = overridePricesArray.map((price) => ({
        id: uuidv4(),
        room_id: roomId,
        ...price,
      }));

      const { data, error } = await supabase.from("room_override_prices").insert(pricesWithIds).select();

      if (error) {
        throw new Error(`Failed to create new override prices: ${error.message}`);
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

  // Create new room with all related data
  async createRoom(roomData) {
    try {
      const {
        hotel_id,
        name_th,
        name_en,
        description_th,
        description_en,
        max_adult,
        max_children,
        total_rooms,
        status,
        seo_title_th,
        seo_title_en,
        seo_description_th,
        seo_description_en,
        slug,
        room_options,
        base_prices,
        override_prices,
        last_update_by,
      } = roomData;

      // Validate total_rooms is provided
      if (!total_rooms || total_rooms < 1) {
        throw new Error("Total rooms must be at least 1 to create a room");
      }

      // Verify hotel exists
      const hotelCheck = await this.verifyHotelExists(hotel_id);
      if (!hotelCheck.success) {
        throw new Error(hotelCheck.error);
      }

      // Check for duplicate names within the same hotel
      const duplicateCheck = await this.checkDuplicateRoomName(name_th, name_en, hotel_id);
      if (!duplicateCheck.success) {
        throw new Error(duplicateCheck.error);
      }

      if (duplicateCheck.hasDuplicates) {
        const conflicts = [];
        if (duplicateCheck.duplicates.name_th) conflicts.push("Thai name");
        if (duplicateCheck.duplicates.name_en) conflicts.push("English name");
        throw new Error(`Duplicate ${conflicts.join(" and ")}: already exists in this hotel`);
      }

      // Check for duplicate slug if provided
      if (slug) {
        const slugCheck = await this.checkDuplicateSlug(slug);
        if (!slugCheck.success) {
          throw new Error(slugCheck.error);
        }

        if (slugCheck.hasDuplicate) {
          throw new Error("Duplicate slug: already exists");
        }
      }

      // Create new room
      const roomId = uuidv4();
      const newRoom = {
        id: roomId,
        hotel_id,
        name_th,
        name_en,
        description_th,
        description_en,
        max_adult,
        max_children,
        total_rooms,
        status: status !== undefined ? Boolean(status) : true,
        seo_title_th,
        seo_title_en,
        seo_description_th,
        seo_description_en,
        slug,
        created_at: new Date().toISOString(),
        last_update: new Date().toISOString(),
        last_update_by,
      };

      // Debug: log the data being inserted
      console.log("Data to insert:", JSON.stringify(newRoom, null, 2));

      const { data: roomCreated, error: roomError } = await supabase.from("rooms").insert(newRoom).select().single();

      if (roomError) {
        console.error("Database error details:", roomError);
        throw new Error(`Failed to create room: ${roomError.message}`);
      }

      // Create room options
      const optionsResult = await this.createRoomOptions(roomId, room_options);
      if (!optionsResult.success) {
        throw new Error(`Failed to create room options: ${optionsResult.error}`);
      }

      // Create base prices
      const basePricesResult = await this.createBasePrices(roomId, base_prices);
      if (!basePricesResult.success) {
        throw new Error(`Failed to create base prices: ${basePricesResult.error}`);
      }

      // Create override prices (optional)
      const overridePricesResult = await this.createOverridePrices(roomId, override_prices);
      if (!overridePricesResult.success) {
        throw new Error(`Failed to create override prices: ${overridePricesResult.error}`);
      }

      return {
        success: true,
        data: {
          room: roomCreated,
          options: optionsResult.data,
          base_prices: basePricesResult.data,
          override_prices: overridePricesResult.data,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update room with all related data
  async updateRoom(id, updateData) {
    try {
      const {
        hotel_id,
        name_th,
        name_en,
        description_th,
        description_en,
        max_adult,
        max_children,
        total_rooms,
        status,
        seo_title_th,
        seo_title_en,
        seo_description_th,
        seo_description_en,
        slug,
        room_options,
        base_prices,
        override_prices,
        last_update_by,
      } = updateData;

      // Get current room data
      const currentRoom = await this.getRoomById(id);
      if (!currentRoom.success) {
        throw new Error("Room not found");
      }

      // Prepare room data for update (only include defined fields)
      const roomUpdateData = {};
      const roomFields = [
        "hotel_id",
        "name_th",
        "name_en",
        "description_th",
        "description_en",
        "max_adult",
        "max_children",
        "total_rooms",
        "status",
        "seo_title_th",
        "seo_title_en",
        "seo_description_th",
        "seo_description_en",
        "slug",
        "last_update_by",
      ];

      roomFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          roomUpdateData[field] = updateData[field];
        }
      });

      // Add last_update timestamp if we have any room data to update
      if (Object.keys(roomUpdateData).length > 0) {
        roomUpdateData.last_update = new Date().toISOString();
      }

      // Validate total_rooms if being updated
      if (roomUpdateData.total_rooms !== undefined && roomUpdateData.total_rooms < 1) {
        throw new Error("Total rooms must be at least 1");
      }

      // If hotel_id is being updated, verify the new hotel exists
      if (roomUpdateData.hotel_id && roomUpdateData.hotel_id !== currentRoom.data.room.hotel_id) {
        const hotelCheck = await this.verifyHotelExists(roomUpdateData.hotel_id);
        if (!hotelCheck.success) {
          throw new Error(hotelCheck.error);
        }
      }

      // Determine which hotel_id to use for duplicate checking
      const targetHotelId = roomUpdateData.hotel_id || currentRoom.data.room.hotel_id;

      // Check for duplicates if names are being updated OR hotel is being changed
      if (roomUpdateData.name_th || roomUpdateData.name_en || roomUpdateData.hotel_id) {
        const duplicateCheck = await this.checkDuplicateRoomName(
          roomUpdateData.name_th || currentRoom.data.room.name_th,
          roomUpdateData.name_en || currentRoom.data.room.name_en,
          targetHotelId,
          id
        );

        if (!duplicateCheck.success) {
          throw new Error(duplicateCheck.error);
        }

        if (duplicateCheck.hasDuplicates) {
          const conflicts = [];
          if (duplicateCheck.duplicates.name_th && (roomUpdateData.name_th || roomUpdateData.hotel_id)) conflicts.push("Thai name");
          if (duplicateCheck.duplicates.name_en && (roomUpdateData.name_en || roomUpdateData.hotel_id)) conflicts.push("English name");
          if (conflicts.length > 0) {
            const hotelMessage = roomUpdateData.hotel_id ? " in the target hotel" : " in this hotel";
            throw new Error(`Duplicate ${conflicts.join(" and ")}: already exists${hotelMessage}`);
          }
        }
      }

      // Check for duplicate slug if being updated
      if (roomUpdateData.slug) {
        const slugCheck = await this.checkDuplicateSlug(roomUpdateData.slug, id);
        if (!slugCheck.success) {
          throw new Error(slugCheck.error);
        }

        if (slugCheck.hasDuplicate) {
          throw new Error("Duplicate slug: already exists");
        }
      }

      let updatedRoom = null;

      // Update room data if there are changes
      if (Object.keys(roomUpdateData).length > 0) {
        const { data, error } = await supabase.from("rooms").update(roomUpdateData).eq("id", id).select().single();

        if (error) {
          console.error("Database error details:", error);
          throw new Error(`Failed to update room: ${error.message}`);
        }

        updatedRoom = data;
      } else {
        updatedRoom = currentRoom.data.room;
      }

      // Update room options if provided
      let updatedOptions = currentRoom.data.options;
      if (room_options) {
        const optionsResult = await this.updateRoomOptions(id, room_options);
        if (!optionsResult.success) {
          throw new Error(`Failed to update room options: ${optionsResult.error}`);
        }
        updatedOptions = optionsResult.data;
      }

      // Update base prices if provided
      let updatedBasePrices = null;
      if (base_prices) {
        const basePricesResult = await this.updateBasePrices(id, base_prices);
        if (!basePricesResult.success) {
          throw new Error(`Failed to update base prices: ${basePricesResult.error}`);
        }
        updatedBasePrices = basePricesResult.data;
      }

      // Update override prices if provided
      let updatedOverridePrices = null;
      if (override_prices !== undefined) {
        // Check for undefined, allow empty array
        const overridePricesResult = await this.updateOverridePrices(id, override_prices);
        if (!overridePricesResult.success) {
          throw new Error(`Failed to update override prices: ${overridePricesResult.error}`);
        }
        updatedOverridePrices = overridePricesResult.data;
      }

      return {
        success: true,
        data: {
          room: updatedRoom,
          options: updatedOptions,
          base_prices: updatedBasePrices,
          override_prices: updatedOverridePricesResult,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check if room has existing bookings
  async checkRoomHasBookings(roomId) {
    try {
      const { count, error } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId)
        .in("status", ["confirmed", "checked_in", "pending"]);

      if (error) {
        throw new Error(`Failed to check bookings: ${error.message}`);
      }

      return {
        success: true,
        hasBookings: count > 0,
        bookingsCount: count || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete room
  async deleteRoom(id) {
    try {
      // Check if room exists
      const roomCheck = await this.getRoomById(id);
      if (!roomCheck.success) {
        throw new Error("Room not found");
      }

      // Check for existing bookings before deletion
      const bookingsCheck = await this.checkRoomHasBookings(id);
      if (!bookingsCheck.success) {
        throw new Error(bookingsCheck.error);
      }

      if (bookingsCheck.hasBookings) {
        throw new Error("Cannot delete room that has existing bookings. Please cancel all bookings first.");
      }

      // Delete related data first (in correct order due to foreign key constraints)

      // 1. Delete override prices
      const { error: overridePricesError } = await supabase.from("room_override_prices").delete().eq("room_id", id);

      if (overridePricesError) {
        throw new Error(`Failed to delete override prices: ${overridePricesError.message}`);
      }

      // 2. Delete base prices
      const { error: basePricesError } = await supabase.from("room_base_prices").delete().eq("room_id", id);

      if (basePricesError) {
        throw new Error(`Failed to delete base prices: ${basePricesError.message}`);
      }

      // 3. Delete room options
      const { error: roomOptionsError } = await supabase.from("room_options").delete().eq("room_id", id);

      if (roomOptionsError) {
        throw new Error(`Failed to delete room options: ${roomOptionsError.message}`);
      }

      // 4. Finally delete the room itself
      const { data, error } = await supabase.from("rooms").delete().eq("id", id).select().single();

      if (error) {
        throw new Error(`Failed to delete room: ${error.message}`);
      }

      return {
        success: true,
        data: data,
        message: "Room and all related data deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get rooms for dropdown/select by hotel
  async getRoomsForSelect(hotelId = null) {
    try {
      let query = supabase
        .from("rooms")
        .select(
          `
          id, 
          name_th, 
          name_en, 
          hotel_id, 
          total_rooms,
          hotels(
            id,
            name_th,
            name_en
          )
        `
        )
        .eq("status", true); // เฉพาะ active rooms

      if (hotelId) {
        query = query.eq("hotel_id", hotelId);
      }

      const { data, error } = await query.order("name_en", { ascending: true });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Transform data to include hotel info separately
      const transformedData = data.map((room) => {
        const hotel = room.hotels || null;
        const { hotels, ...roomData } = room;

        return {
          ...roomData,
          hotel: hotel,
        };
      });

      return {
        success: true,
        data: transformedData,
        count: transformedData.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Search rooms by name
  async searchRooms(searchTerm, page = 1, limit = 20, hotelId = null) {
    try {
      const offset = (page - 1) * limit;
      const searchPattern = `%${searchTerm}%`;

      // Build query with optional hotel filter for count
      let countQuery = supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .or(`name_th.ilike.${searchPattern},name_en.ilike.${searchPattern}`);

      if (hotelId) {
        countQuery = countQuery.eq("hotel_id", hotelId);
      }

      // Get total count for pagination
      const { count, error: countError } = await countQuery;

      if (countError) {
        throw new Error(`Failed to get search count: ${countError.message}`);
      }

      // Get search results with related data including hotel information
      let dataQuery = supabase
        .from("rooms")
        .select(
          `
          id,
          name_th,
          name_en,
          description_th,
          description_en,
          max_adult,
          max_children,
          total_rooms,
          status,
          hotel_id,
          created_at,
          last_update,
          last_update_by,
          seo_title_th,
          seo_title_en,
          seo_description_th,
          seo_description_en,
          slug,
          hotels(
            id,
            name_th,
            name_en
          ),
          room_options(
            id,
            bed,
            kitchen,
            air_conditioner,
            fan,
            free_wifi,
            city_view,
            sea_view,
            free_breakfast,
            restaurant,
            smoking
          )
        `
        )
        .or(`name_th.ilike.${searchPattern},name_en.ilike.${searchPattern}`);

      if (hotelId) {
        dataQuery = dataQuery.eq("hotel_id", hotelId);
      }

      const { data: rawData, error } = await dataQuery.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Transform data to match expected format
      const transformedData = rawData.map((room) => {
        const options = room.room_options?.[0] || null;
        const hotel = room.hotels || null;
        const { room_options, hotels, ...roomData } = room;

        return {
          room: roomData,
          hotel: hotel,
          options: options,
        };
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        success: true,
        data: transformedData,
        searchTerm: searchTerm,
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

  // Get rooms by hotel ID
  async getRoomsByHotelId(hotelId, page = 1, limit = 20) {
    try {
      return await this.getAllRooms(page, limit, hotelId);
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new RoomsService();
