const jwt = require("jsonwebtoken");
const Franchise = require("../models/Franchise");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "CHANGE_THIS_SECRET");

    if (decoded.role !== "franchise") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const franchise = await Franchise.findById(decoded.id).select(
      "-passwordHash"
    );

    if (!franchise) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    req.franchise = franchise;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};
