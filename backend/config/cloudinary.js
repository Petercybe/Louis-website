import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

// Loading dotenv here too (not just in server.js) guarantees process.env is
// populated before cloudinary.config() reads it below. ES module imports are
// hoisted and evaluated before server.js's own dotenv.config() call runs, so
// without this, cloudinary.config() would previously run first and lock in
// "undefined" for every credential, permanently, for the life of the server.
dotenv.config();

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn("⚠️  Cloudinary credentials missing from .env — image uploads will fail until CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;
