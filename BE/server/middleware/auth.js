import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  // Read JWT from signed-in user's cookie.
  const token = req.cookies && req.cookies.token;

  // Reject early if no auth token is present.
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, no token" });
  }

  try {
    // Verify token signature and decode payload.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Load current user from database to ensure account still exists.
    const user = await User.findById(decoded.id);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    // Attach authenticated context for downstream controllers/services.
    req.user = user;
    req.userId = user._id;
    return next();
  } catch (err) {
    // Any token validation or parsing error is treated as unauthorized.
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
};

export default { protect };
export { protect };
