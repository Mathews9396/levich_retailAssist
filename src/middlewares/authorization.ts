import { Request, Response, NextFunction } from "express";
import { httpStatuses, messages } from "@constants";

const checkHeader = function (req: Request, res: Response, next: NextFunction) {
  if (
    !req.headers["auth-token"] ||
    req.headers["auth-token"] != process.env.AUTHTOKEN
  ) {
    return res
      .status(httpStatuses.FORBIDDEN)
      .json({ error: messages.REQUESTS.INVALID });
  }
  next();
};

export { checkHeader };
