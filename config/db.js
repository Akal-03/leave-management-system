const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
     mongodb+srv://akalyajayaprakash_db_user:<db_password>@feedback.b8wvkbt.mongodb.net/
    );
    console.log("MongoDB Atlas connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;