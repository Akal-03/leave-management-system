require("dotenv").config();

const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const cors = require("cors");

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
app.use(cors({
    origin: [
        "https://akal-03.github.io"
    ]
}));

app.use(express.json());

// Serve frontend files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Home page
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// API routes
app.use("/api", leaveRoutes);

// Health check
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Leave Management Backend is running"
    });
});

// CREATE / UPDATE AUTHORITY ACCOUNT
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

    let authority = await User.findOne({ email });

    const hashedPassword = await bcrypt.hash(password, 12);

    if (!authority) {

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

        authority.username = username;
        authority.password = hashedPassword;
        authority.role = "authority";

        await authority.save();

        console.log("Authority account updated successfully");
    }
}

// START SERVER
async function startServer() {

    try {

        await connectDB();

        await createAuthority();

        app.listen(PORT, () => {
            console.log(
                `Server running on port ${PORT}`
            );
        });

    } catch (error) {

        console.error(
            "Application startup failed:",
            error.message
        );

        process.exit(1);
    }
}

startServer();
