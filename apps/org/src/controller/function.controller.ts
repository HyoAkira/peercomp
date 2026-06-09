import { NextFunction, Request, Response } from "express";
import FunctionService from "../services/function.service";

class FunctionController {
  constructor(private readonly functionService: FunctionService) {}

  async createFunction(req: Request, res: Response, next: NextFunction) {
    try {
     
      const author = req.userId;
      const result = await this.functionService.createFunction({
  ...req.body, author
      });
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }
  async readFunction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id }: { id: string } = req.params;
      const result = await this.functionService.readFunction(id, req.userId);
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteFunction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id }: { id: string } = req.params;
      const result = await this.functionService.deleteFunction(id, req.userId);
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateFunction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id }: { id: string } = req.params;
      const { name, endpoint, method, code, kvPermission } = req.body;
      const result = await this.functionService.updateFunction(
        id,
        {
          name,
          endpoint,
          method,
          code,
          kvPermission,
        },
        req.userId
      );
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getFunctionsByAuthor(req: Request, res: Response, next: NextFunction) {
    try {
      const authorId = req.userId;
      const result = await this.functionService.getFunctionsByAuthor(authorId);
      res.status(result.code).json(result);
    } catch (error) {
      next(error);
    }
  }
}

const functionController = new FunctionController(new FunctionService());
export default functionController;
