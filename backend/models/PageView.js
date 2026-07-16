import mongoose from "mongoose";

// One document per page load of the public site. Deliberately minimal —
// no IP/user-agent tracking, just a timestamp — so it's cheap to aggregate
// into a "views over time" chart for the admin dashboard without needing
// a third-party analytics service.
const pageViewSchema = new mongoose.Schema({
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("PageView", pageViewSchema);
