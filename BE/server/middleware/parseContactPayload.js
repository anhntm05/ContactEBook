import { trimStringDeep } from "./validateCreateContact.js";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parseContactPayload = (req, res, next) => {
  const rawPayload = req.body?.payload;

  if (rawPayload === undefined) {
    req.body = trimStringDeep(req.body || {});
    return next();
  }

  if (typeof rawPayload !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid contact payload.",
    });
  }

  try {
    const parsedPayload = JSON.parse(rawPayload);

    if (!isPlainObject(parsedPayload)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact payload.",
      });
    }

    req.body = trimStringDeep(parsedPayload);
    return next();
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid contact payload.",
    });
  }
};

export default parseContactPayload;
