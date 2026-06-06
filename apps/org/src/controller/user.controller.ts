import { NextFunction, Request, Response } from "express";
import UserService from "../services/user.service";
class UserController {
  constructor(private userService: UserService) {}

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, surname, username, email, password } = req.body;
      const result = await this.userService.createUser({
        name,
        surname,
        username,
        email,
        password,
      });
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await this.userService.login({ email, password });
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }

  async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.headers.authorization) {
        return res.status(401).json({
          code: 401,
          message: "Access denied. No token provided.",
          error: true,
          data: null,
        });
      }
      const token = req.headers.authorization.split(" ")[1];
      const result = await this.userService.verifyToken(token);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.userId;
      const result = await this.userService.getUserById(id);
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId;
      const { password, newPassword, checkNewPassword } = req.body;
      const result = await this.userService.changePassword(
        userId,
        password,
        newPassword,
        checkNewPassword,
      );
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId;
      const { name, surname, email } = req.body;
      const result = await this.userService.updateProfile(userId, {
        name,
        surname,
        email,
      });
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }
}

const userController = new UserController(new UserService());
export default userController;
