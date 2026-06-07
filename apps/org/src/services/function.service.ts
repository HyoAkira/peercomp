import { FunctionModel } from "@peercomp/models";


export default class FunctionService {
  async createFunction({
    name,
    endpoint,
    method,
    code,
    author,
    metadata,
  }: {
    name: string;
    endpoint: string;
    method: "GET" | "POST";
    code: string;
    author: string;
    metadata: {
      namespace: string;
    };
  }) {
    const check = await checkExist(endpoint, author, method);
    if (check?.error) {
      return check;
    }
    const func = new FunctionModel({
      name,
      endpoint,
      method,
      code,
      author,
      metadata,
    });
    await func.save();
    return {
      code: 201,
      message: "Fonksiyon başarıyla oluşturuldu",
      error: false,
      data: func,
    };
  }
  async readFunction(id: string, userId: string) {
    const func = await FunctionModel.findById(id);
    if (!func) {
      return {
        code: 404,
        message: "Fonksiyon bulunamadı",
        error: true,
        data: null,
      };
    }
    if (func.author.toString() !== userId) {
      return {
        code: 403,
        message: "Erişim reddedildi. Bu fonksiyonun yazarı değilsiniz.",
        error: true,
        data: null,
      };
    }
    return {
      code: 200,
      message: "Fonksiyon başarıyla getirildi",
      error: false,
      data: func,
    };
  }

  async getFunction(endpoint: string, userId: string) {
    const func = await FunctionModel.findOne({ endpoint });
    if (!func) {
      return {
        code: 404,
        message: "Fonksiyon bulunamadı",
        error: true,
        data: null,
      };
    }
    if (func.author.toString() !== userId) {
      return {
        code: 403,
        message: "Erişim reddedildi. Bu fonksiyonun yazarı değilsiniz.",
        error: true,
        data: null,
      };
    }
    return {
      code: 200,
      message: "Fonksiyon başarıyla getirildi",
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
    userId: string,
  ) {
    const func = await FunctionModel.findById(id);

    if (!func) {
      return {
        code: 404,
        message: "Fonksiyon bulunamadı",
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
        message: "Erişim reddedildi. Bu fonksiyonun yazarı değilsiniz.",
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
      message: "Fonksiyon başarıyla güncellendi",
      error: false,
      data: func,
    };
  }

  async getFunctionsByAuthor(authorId: string) {
    const functions = await FunctionModel.find({ author: authorId });
    return {
      code: 200,
      message: "Fonksiyonlar başarıyla getirildi",
      error: false,
      data: functions,
    };
  }

  async deleteFunction(id: string, userId: string) {
    const func = await FunctionModel.findById(id);
    if (!func) {
      return {
        code: 404,
        message: "Fonksiyon bulunamadı",
        error: true,
        data: null,
      };
    }
    if (func.author.toString() !== userId) {
      return {
        code: 403,
        message: "Erişim reddedildi. Bu fonksiyonun yazarı değilsiniz.",
        error: true,
        data: null,
      };
    }
    await func.deleteOne();
    return {
      code: 200,
      message: "Fonksiyon başarıyla silindi",
      error: false,
      data: func,
    };
  }
}
async function checkExist(
  endpoint?: string,
  author?: string,
  method?: string,
  excludeId?: string,
) {
  if (!endpoint || !author || !method) return;
  const check = await FunctionModel.findOne({ endpoint, author, method });
  if (check && check._id.toString() !== excludeId) {
    return {
      code: 400,
      message: "Bu endpoint ve metodla zaten bir fonksiyonunuz var",
      error: true,
      data: null,
    };
  }
}
