import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Funch Hotel Backend is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes (will be added later)
app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Welcome to Funch Hotel API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      api: "/api",
    },
  });
});

// ## Routes
import adminRouters from "./routes/adminRoutes.js";
import countryRouters from "./routes/countryRoutes.js";
import citiesRouters from "./routes/citiesRoutes.js";
import createUserRouters from "./routes/userRegisterRoutes.js";
import hotelsRouters from "./routes/hotelsRoutes.js";
import imageRouters from "./routes/imageRoutes.js";
import metadataRouters from "./routes/metadata.js";
import roomRouters from "./routes/roomsRoutes.js";
import userLoginRouters from "./routes/userLoginRoutes.js";
import bookingRouters from "./routes/bookingRouters.js";

app.use("/api/", userLoginRouters);
app.use("/api/admin", adminRouters);
app.use("/api/booking", bookingRouters);
app.use("/api/country", countryRouters);
app.use("/api/cities", citiesRouters);
app.use("/api/hotels", hotelsRouters);
app.use("/api/images", imageRouters);
app.use("/api/metadata", metadataRouters);
app.use("/api/rooms", roomRouters);
app.use("/api/user", createUserRouters);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested route ${req.originalUrl} does not exist`,
    availableRoutes: ["/health", "/api"],
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("💥 Error:", err.message);
  console.error(err.stack);

  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;
