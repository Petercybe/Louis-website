import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Font Awesome icon class, e.g. "fa-brands fa-html5". Optional — falls
    // back to a text badge on the frontend if left blank.
    icon: {
      type: String,
      default: "",
      trim: true,
    },
    // Hex color used for the icon + progress bar, e.g. "#00e5ff"
    color: {
      type: String,
      default: "#00e5ff",
    },
    percent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 80,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Skill", skillSchema);
