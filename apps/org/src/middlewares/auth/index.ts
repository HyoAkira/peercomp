import { NextFunction, Response, Request } from "express";
import jwt from "jsonwebtoken";

function verifyToken(req: Request, res: Response, next: NextFunction) {
  /** Check if authhorization header exist */
  if (!req.header("Authorization"))
    return res.status(401).json({
      code: 401,
      message: "Access denied. No token provided.",
      error: true,
      data: null,
    });

  const token = req.header("Authorization")!.split(" ")[1];
  if (!token)
    return res.status(401).json({
      code: 401,
      message: "Access denied. No token provided.",
      error: true,
      data: null,
    });
  try {
    const decoded: { userId: string; role: string } = jwt.verify(
      token,
      process.env.JWTSECRET!
    ) as { userId: string; role: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    next(error);
  }
}

export default verifyToken;
