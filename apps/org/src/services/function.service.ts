import FunctionModel from "../models/functions.model";

export default class FunctionService {
  async createFunction({
    name,
    endpoint,
    method,
    code,
    author,
  }: {
    name: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
  }) {
    const check = await checkExist(endpoint, author, method);
    if (check?.error) {
      return check;
    }
    const func = new FunctionModel({ name, endpoint, method, code, author });
    await func.save();
    return {
      code: 201,
      message: "Function created successfully",
      error: false,
      data: func,
    };
  }
  async readFunction(id: string, userId: string) {
    const func = await FunctionModel.findById(id);
    if (!func) {
      return {
        code: 404,
        message: "Function not found",
        error: true,
        data: null,
      };
    }
    if (func.author.toString() !== userId) {
      return {
        code: 403,
        message: "Access denied. You are not the author of this function.",
        error: true,
        data: null,
      };
    }
    return {
      code: 200,
      message: "Function retrieved successfully",
      error: false,
      data: func,
    };
  }

  async getFunction(endpoint: string, userId: string) {
    const func = await FunctionModel.findOne({ endpoint });
    if (!func) {
      return {
        code: 404,
        message: "Function not found",
        error: true,
        data: null,
      };
    }
    if (func.author.toString() !== userId) {
      return {
        code: 403,
        message: "Access denied. You are not the author of this function.",
        error: true,
        data: null,
      };
    }
    return {
      code: 200,
      message: "Function retrieved successfully",
      error: false,
      data: func,
    };
  }

  async updateFunction(
    id: string,
    {
      name,
      endpoint,
      method,
      code,
    }: {
      name?: string;
      endpoint?: string;
      method?: "GET" | "POST";
      code?: string;
    },
    userId: string
  ) {
    const func = await FunctionModel.findById(id);

    if (!func) {
      return {
        code: 404,
        message: "Function not found",
        error: true,
        data: null,
      };
    }
    const check = await checkExist(endpoint, userId, method, id);
    if (check?.error) {
      return check;
    }
    if (func.author.toString() !== userId) {
      return {
        code: 403,
        message: "Access denied. You are not the author of this function.",
        error: true,
        data: null,
      };
    }
    if (name) func.name = name;
    if (endpoint) func.endpoint = endpoint;
    if (method) func.method = method;
    if (code) func.code = code;
    await func.save();
    return {
      code: 200,
      message: "Function updated successfully",
      error: false,
      data: func,
    };
  }

  async getFunctionsByAuthor(authorId: string) {
    const functions = await FunctionModel.find({ author: authorId });
    return {
      code: 200,
      message: "Functions retrieved successfully",
      error: false,
      data: functions,
    };
  }

  async deleteFunction(id: string, userId: string) {
    const func = await FunctionModel.findById(id);
    if (!func) {
      return {
        code: 404,
        message: "Function not found",
        error: true,
        data: null,
      };
    }
    if (func.author.toString() !== userId) {
      return {
        code: 403,
        message: "Access denied. You are not the author of this function.",
        error: true,
        data: null,
      };
    }
    await func.deleteOne();
    return {
      code: 200,
      message: "Function deleted successfully",
      error: false,
      data: func,
    };
  }
}
async function checkExist(
  endpoint?: string,
  author?: string,
  method?: string,
  excludeId?: string
) {
  if (!endpoint || !author || !method) return;
  const check = await FunctionModel.findOne({ endpoint, author, method });
  if (check && check._id.toString() !== excludeId) {
    return {
      code: 400,
      message: "You already have a function with this endpoint and method",
      error: true,
      data: null,
    };
  }
}
