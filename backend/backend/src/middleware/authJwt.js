import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { sub, email, username, roles, iat, exp }
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}