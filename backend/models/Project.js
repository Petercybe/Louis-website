import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      required: true,
    },

    github: {
      type: String,
      default: "",
    },

    demo: {
      type: String,
      default: "",
    },

    technologies: [
      {
        type: String,
      },
    ],

    category: {
      type: String,
      enum: ["Web Development", "Graphic Design", "UI/UX Design"],
      default: "Web Development",
    },

    // Optional finer grouping within a category, e.g. "Logo Design" or
    // "Flyer & Poster" under "Graphic Design". Free text (not an enum) so
    // new sub-categories can be added from the admin dashboard without
    // touching code. Leave blank for projects that don't need one — the
    // site then groups them by category alone.
    subcategory: {
      type: String,
      default: "",
      trim: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Project", projectSchema);