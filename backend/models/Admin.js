import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  // Profile tab fields — separate from username/password (Settings tab)
  displayName: {
    type: String,
    default: "Louis Peter Bangura",
    trim: true,
  },
  title: {
    type: String,
    default: "System Admin",
    trim: true,
  },
  avatar: {
    type: String,
    default: "",
  },
});

export default mongoose.model("Admin", adminSchema);