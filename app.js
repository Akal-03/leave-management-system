
require("dotenv").config();

const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");

const connectDB = require("./config/db");
const User = require("./models/User");
const leaveRoutes = require("./routes/leaveRoutes");

const app = express();
const PORT = process.env.PORT || 5050;

// Check JWT secret
if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing");
    process.exit(1);
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api", leaveRoutes);

// ===============================
// CREATE / UPDATE AUTHORITY ACCOUNT
// ===============================

async function createAuthority() {
    const email = (process.env.AUTHORITY_EMAIL || "")
        .trim()
        .toLowerCase();

    const password = process.env.AUTHORITY_PASSWORD;

    const username =
        process.env.AUTHORITY_NAME || "Leave Administrator";

    if (!email || !password) {
        throw new Error(
            "AUTHORITY_EMAIL and AUTHORITY_PASSWORD are required"
        );
    }

    // Find authority by email
    let authority = await User.findOne({ email });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    if (!authority) {
        // Create new authority
        authority = await User.create({
            username,
            email,
            password: hashedPassword,
            role: "authority",
            rollNumber: "",
            casualLeave: 0,
            medicalLeave: 0
        });

        console.log("Authority account created successfully");

    } else {
        // Update existing account
        authority.username = username;
        authority.password = hashedPassword;
        authority.role = "authority";

        await authority.save();

        console.log("Authority account updated successfully");
    }
}

// ===============================
// START SERVER
// ===============================

async function startServer() {
    try {
        // Connect MongoDB
        await connectDB();

        // Create/update authority account
        await createAuthority();

        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error(
            "Application startup failed:",
            error.message
        );

        process.exit(1);
    }
}

// Start application
startServer();
