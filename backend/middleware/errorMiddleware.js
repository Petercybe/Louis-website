// Catches any error that reaches Express without a response already sent,
// and any route that doesn't exist — always returns JSON, never Express's
// default HTML error page (which would break every fetch().json() call
// on the frontend with a confusing "Unexpected token '<'" parse error).

export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (error, req, res, next) => {
  console.error("❌ Unhandled error:", error);
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({ message: error.message || "Internal server error" });
};
