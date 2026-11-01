
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Leave = require("../models/Leave");

const router = express.Router();

// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required. Please log in again."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token. Please log in again."
        });
    }
}

// ======================================================
// AUTHORITY MIDDLEWARE
// ======================================================

function authorityOnly(req, res, next) {
    if (req.user.role !== "authority") {
        return res.status(403).json({
            message: "Authority access only"
        });
    }

    next();
}

// ======================================================
// STUDENT REGISTER
// ======================================================

router.post("/register", async (req, res) => {
    try {
        const { username, email, password, rollNumber } = req.body;

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            typeof rollNumber !== "string" ||
            !username.trim() ||
            !email.trim() ||
            !password ||
            !rollNumber.trim()
        ) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedRollNumber = rollNumber.trim();

        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { rollNumber: normalizedRollNumber }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email or Roll Number already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username: username.trim(),
            email: normalizedEmail,
            rollNumber: normalizedRollNumber,
            password: hashedPassword,
            role: "student",
            casualLeave: 10,
            medicalLeave: 10
        });

        return res.status(201).json({
            message: "Registration successful",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                rollNumber: user.rollNumber,
                role: user.role
            }
        });
    } catch (error) {
        console.error("REGISTER ERROR:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email or Roll Number already exists"
            });
        }

        return res.status(500).json({
            message: "Registration failed",
            error: error.message
        });
    }
});

// ======================================================
// LOGIN - STUDENT / AUTHORITY
// ======================================================

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing in .env");
        }

        const token = jwt.sign(
            {
                id: user._id.toString(),
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                rollNumber: user.rollNumber,
                role: user.role,
                casualLeave: user.casualLeave,
                medicalLeave: user.medicalLeave
            }
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
});

// ======================================================
// GET CURRENT USER
// ======================================================

router.get("/me", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.json({ user });
    } catch (error) {
        console.error("GET USER ERROR:", error);

        return res.status(500).json({
            message: "Unable to get user",
            error: error.message
        });
    }
});

// ======================================================
// GET LEAVE BALANCE
// ======================================================

router.get("/leave-balance", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.json({
            casualLeave: user.casualLeave,
            medicalLeave: user.medicalLeave
        });
    } catch (error) {
        console.error("LEAVE BALANCE ERROR:", error);

        return res.status(500).json({
            message: "Unable to get leave balance",
            error: error.message
        });
    }
});

// ======================================================
// STUDENT APPLY LEAVE
// ======================================================

router.post("/apply-leave", authenticate, async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({
                message: "Only students can apply for leave"
            });
        }

        const { leaveType, fromDate, toDate, reason } = req.body;

        if (
            !leaveType ||
            !fromDate ||
            !toDate ||
            typeof reason !== "string" ||
            !reason.trim()
        ) {
            return res.status(400).json({
                message: "All leave fields are required"
            });
        }

        if (!["casual", "medical"].includes(leaveType)) {
            return res.status(400).json({
                message: "Invalid leave type. Select Casual or Medical Leave."
            });
        }

        const start = new Date(fromDate);
        const end = new Date(toDate);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            return res.status(400).json({
                message: "Please enter valid leave dates"
            });
        }

        // Compare dates by calendar day, not time of day.
        const startDay = Date.UTC(
            start.getUTCFullYear(),
            start.getUTCMonth(),
            start.getUTCDate()
        );

        const endDay = Date.UTC(
            end.getUTCFullYear(),
            end.getUTCMonth(),
            end.getUTCDate()
        );

        if (endDay < startDay) {
            return res.status(400).json({
                message: "To date cannot be before From date"
            });
        }

        const days = Math.floor(
            (endDay - startDay) / (1000 * 60 * 60 * 24)
        ) + 1;

        const student = await User.findById(req.user.id);

        if (!student) {
            return res.status(404).json({
                message: "Student account not found"
            });
        }

        const availableBalance = leaveType === "casual"
            ? student.casualLeave
            : student.medicalLeave;

        if (days > availableBalance) {
            return res.status(400).json({
                message: `Insufficient leave balance. Available: ${availableBalance} day(s).`
            });
        }

        const leave = await Leave.create({
            student: student._id,
            leaveType,
            fromDate: start,
            toDate: end,
            days,
            reason: reason.trim(),
            status: "Pending"
        });

        return res.status(201).json({
            message: "Leave request submitted successfully",
            leave
        });
    } catch (error) {
        console.error("APPLY LEAVE ERROR:", error);

        return res.status(500).json({
            message: "Unable to apply leave",
            error: error.message
        });
    }
});

// ======================================================
// STUDENT VIEW OWN LEAVES
// ======================================================

router.get("/my-leaves", authenticate, async (req, res) => {
    try {
        const leaves = await Leave.find({
            student: req.user.id
        }).sort({ createdAt: -1 });

        return res.json({ leaves });
    } catch (error) {
        console.error("MY LEAVES ERROR:", error);

        return res.status(500).json({
            message: "Unable to get leave requests",
            error: error.message
        });
    }
});

// ======================================================
// AUTHORITY VIEW ALL LEAVES
// ======================================================

router.get(
    "/authority/leaves",
    authenticate,
    authorityOnly,
    async (req, res) => {
        try {
            const leaves = await Leave.find()
                .populate("student", "username email rollNumber")
                .populate("reviewedBy", "username email")
                .sort({ createdAt: -1 });

            return res.json({ leaves });
        } catch (error) {
            console.error("AUTHORITY LEAVES ERROR:", error);

            return res.status(500).json({
                message: "Unable to get leave requests",
                error: error.message
            });
        }
    }
);

// ======================================================
// AUTHORITY APPROVE / REJECT
// ======================================================

router.patch(
    "/authority/leaves/:id",
    authenticate,
    authorityOnly,
    async (req, res) => {
        try {
            const { status, authorityRemarks } = req.body;

            if (!["Approved", "Rejected"].includes(status)) {
                return res.status(400).json({
                    message: "Status must be Approved or Rejected"
                });
            }

            if (
                authorityRemarks !== undefined &&
                typeof authorityRemarks !== "string"
            ) {
                return res.status(400).json({
                    message: "Authority remarks must be text"
                });
            }

            if (
                status === "Rejected" &&
                !authorityRemarks?.trim()
            ) {
                return res.status(400).json({
                    message: "Rejection reason is required"
                });
            }

            const leave = await Leave.findById(req.params.id);

            if (!leave) {
                return res.status(404).json({
                    message: "Leave request not found"
                });
            }

            if (leave.status !== "Pending") {
                return res.status(400).json({
                    message: "This leave has already been reviewed"
                });
            }

            if (status === "Approved") {
                const student = await User.findById(leave.student);

                if (!student) {
                    return res.status(404).json({
                        message: "Student not found"
                    });
                }

                if (leave.leaveType === "casual") {
                    if (student.casualLeave < leave.days) {
                        return res.status(400).json({
                            message: "Insufficient casual leave balance"
                        });
                    }

                    student.casualLeave -= leave.days;
                } else {
                    if (student.medicalLeave < leave.days) {
                        return res.status(400).json({
                            message: "Insufficient medical leave balance"
                        });
                    }

                    student.medicalLeave -= leave.days;
                }

                await student.save();
            }

            leave.status = status;
            leave.authorityRemarks = authorityRemarks?.trim() || "";
            leave.reviewedBy = req.user.id;
            leave.reviewedAt = new Date();

            await leave.save();

            return res.json({
                message: `Leave ${status.toLowerCase()} successfully`,
                leave
            });
        } catch (error) {
            console.error("UPDATE LEAVE STATUS ERROR:", error);

            return res.status(500).json({
                message: "Unable to update leave status",
                error: error.message
            });
        }
    }
);

module.exports = router;
