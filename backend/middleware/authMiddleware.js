// ============================================================
// JWT Authentication Middleware
// Protects routes that require doctor login
// Extracts token from Authorization header (Bearer <token>)
// ============================================================

const jwt = require('jsonwebtoken');
require('dotenv').config();

function authMiddleware(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach doctor info to request object for downstream use
    req.doctor = decoded;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.'
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid token. Please login again.'
    });
  }
}

module.exports = authMiddleware;
