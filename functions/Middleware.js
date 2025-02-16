const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1]; // Extract token

  if (!token) {
    return res.status(403).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, "rajkapoor");
    req.user = decoded;
    next(); // Continue to the protected route
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = authenticateUser;
