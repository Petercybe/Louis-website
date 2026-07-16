import mongoose from "mongoose";

// This is a SINGLETON collection — there is only ever one document in it,
// fetched/updated via a fixed key rather than an :id. It holds all the
// "About Me" content that used to be hardcoded straight into index.html:
// bio text, hero stats, the timeline, the CV/resume file, and social links.
const timelineEntrySchema = new mongoose.Schema(
  {
    period: { type: String, required: true, trim: true }, // e.g. "2021 - Present"
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const siteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "main",
      unique: true,
    },
    tagline: {
      type: String,
      default: "Web Developer & Graphic Designer",
      trim: true,
    },
    bio: {
      type: String,
      default:
        "I build modern, responsive and performance-driven websites that help businesses grow. I also create stunning graphics that bring ideas to life.",
      trim: true,
    },
    location: {
      type: String,
      default: "Sierra Leone",
      trim: true,
    },
    resumeUrl: {
      type: String,
      default: "",
    },
    stats: {
      happyClients: { type: Number, default: 10 },
      certificates: { type: Number, default: 5 },
      yearsLearning: { type: Number, default: 4 },
    },
    timeline: {
      type: [timelineEntrySchema],
      default: [],
    },
    social: {
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" },
      instagram: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("SiteContent", siteContentSchema);
