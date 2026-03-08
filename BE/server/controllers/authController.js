import { validationResult } from "express-validator";
import User from "../models/User.js";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

const sendTokenResponse = (user, res, message) => {
  const token = user.getSignedJwtToken();
  res.cookie("token", token, getCookieOptions());

  res.status(200).json({
    success: true,
    message,
    data: {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
};

const formatValidationErrors = (errors) =>
  errors
    .array()
    .map((error) => error.msg)
    .join(", ");

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, message: formatValidationErrors(errors) });
    }

    const { username, email, password } = req.body;
    const existing = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const user = await User.create({ username, email, password });
    sendTokenResponse(user, res, "Registered successfully");
    return null;
  } catch (err) {
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, message: formatValidationErrors(errors) });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    sendTokenResponse(user, res, "Logged in successfully");
    return null;
  } catch (err) {
    return next(err);
  }
};

const logout = (req, res) => {
  res.cookie("token", "none", {
    ...getCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });

  res.status(200).json({ success: true, message: "Logged out" });
};

const getMe = (req, res) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
};

export { register, login, logout, getMe };
