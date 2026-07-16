import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import Admin from "./models/Admin.js";

dotenv.config(); // MUST BE FIRST

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const hashedPassword = await bcrypt.hash("admin123", 10);

   const existingAdmin = await Admin.findOne({ username: "louis" });

if (existingAdmin) {
  console.log("ℹ️ Admin already exists.");
  process.exit();
}

await Admin.create({
  username: "louis",
  password: hashedPassword,
});

console.log("✅ Admin created successfully");
    console.log("✅ Admin created successfully");
    process.exit();
  } catch (err) {
    console.log("❌ Error:", err.message);
    process.exit(1);
  }
};

run();