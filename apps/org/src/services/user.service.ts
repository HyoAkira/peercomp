import { compare, genSalt, hash } from "bcrypt";
import jwt from "jsonwebtoken";
import * as z from "zod";
import User from "../models/user.model";
class UserService {
  async createUser({
    name,
    surname,
    username,
    email,
    password,
  }: {
    name: string;
    surname: string;
    username: string;
    email: string;
    password: string;
  }) {
    const userSchema = z.object({
      name: z.string().min(1, "İsim gerekli"),
      surname: z.string().min(1, "Soyisim gerekli"),
      username: z.string().min(1, "Kullanıcı adı gerekli"),
      email: z.email("Geçersiz e-posta adresi"),
      password: z
        .string("Şifre gerekli")
        .min(8, "Şifre en az 8 karakter olmalı")
        .max(128, "Şifre en fazla 128 karakter olmalı")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          "Şifre en az bir büyük harf, bir küçük harf, bir sayı ve bir özel karakter içermelidir",
        ),
    });
    const parsedUser = userSchema.safeParse({
      name,
      surname,
      username,
      email,
      password,
    });
    if (!parsedUser.success) {
      return {
        code: 400,
        message: parsedUser.error.issues
          .map((issue) => issue.message)
          .join(", "),
        error: true,
        data: null,
      };
    }
    const saltRounds = 10;
    const salt = await genSalt(saltRounds);
    const hashedPassword = await hash(password, salt);
    const user = new User({
      name,
      surname,
      username,
      email,
      password: hashedPassword,
    });
    await user.save();
    const userLogin = await this.login({ email, password });
    const token = userLogin.data!.token;
    return {
      code: 201,
      message: "Kullanıcı başarıyla oluşturuldu",
      error: false,
      data: { token },
    };
  }

  async getUserById(id: string) {
    const user = await User.findById(id).select([
      "-password",
      "-__v",
      "-_id",
      "-role",
    ]);
    if (!user) {
      return {
        code: 404,
        message: "Kullanıcı bulunamadı",
        error: true,
        data: null,
      };
    }
    return {
      code: 200,
      message: "Kullanıcı başarıyla getirildi",
      error: false,
      data: user,
    };
  }

  async login({ email, password }: { email: string; password: string }) {
    const user = await User.findOne({ email });
    if (!user) {
      return {
        code: 404,
        message: "Kullanıcı bulunamadı",
        error: true,
        data: null,
      };
    }
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return {
        code: 401,
        message: "Geçersiz şifre",
        error: true,
        data: null,
      };
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWTSECRET!,
      { expiresIn: "7d" },
    );
    return {
      code: 200,
      message: "Giriş başarılı",
      error: false,
      data: { token },
    };
  }

  async verifyToken(token: string) {
    const verify = jwt.verify(token, process.env.JWTSECRET!);
    return verify;
  }

  async changePassword(userId, password, newPassword, checkNewPassword) {
    if (newPassword !== checkNewPassword) {
      return {
        code: 400,
        message: "Yeni şifre ile onay şifresi eşleşmiyor",
        error: true,
        data: null,
      };
    }
    const zodPassword = z
      .string("Şifre gerekli")
      .min(8, "Şifre en az 8 karakter olmalı")
      .max(128, "Şifre en fazla 128 karakter olmalı")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Şifre en az bir büyük harf, bir küçük harf, bir sayı ve bir özel karakter içermelidir",
      );
    try {
      const parsedPassword = zodPassword.safeParse(newPassword);
      if (!parsedPassword.success) {
        return {
          code: 400,
          message: parsedPassword.error.issues
            .map((issue) => issue.message)
            .join(", "),
          error: true,
          data: null,
        };
      }
      const user = await User.findById(userId);
      if (!user) {
        return {
          code: 404,
          message: "Kullanıcı bulunamadı",
          error: true,
          data: null,
        };
      }
      console.log("user pass", user.password);
      console.log("body pass", password);
      const isPasswordValid = await compare(password, user.password);
      if (!isPasswordValid) {
        return {
          code: 401,
          message: "Geçersiz şifre",
          error: true,
          data: null,
        };
      }
      const saltRounds = 10;
      const salt = await genSalt(saltRounds);
      const hashedPassword = await hash(newPassword, salt);
      user.password = hashedPassword;
      await user.save();
      return {
        code: 200,
        message: "Şifre başarıyla değiştirildi",
        error: false,
        data: null,
      };
    } catch (error) {
      console.log(error);
      if (error instanceof z.ZodError) {
        return {
          code: 400,
          message: error.issues.map((issue) => issue.message).join(", "),
          error: true,
          data: null,
        };
      }
      return {
        code: 500,
        message: "Sunucu hatası",
        error: true,
        data: null,
      };
    }
  }

  async updateProfile(userId, profileData: { name?: string; surname?: string; email?: string }) {
        const userSchema = z.object({
      name: z.string().min(1, "İsim gerekli"),
      surname: z.string().min(1, "Soyisim gerekli"),
      username: z.string().min(1, "Kullanıcı adı gerekli"),
      email: z.email("Geçersiz e-posta adresi"),
      password: z
        .string("Şifre gerekli")
        .min(8, "Şifre en az 8 karakter olmalı")
        .max(128, "Şifre en fazla 128 karakter olmalı")
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          "Şifre en az bir büyük harf, bir küçük harf, bir sayı ve bir özel karakter içermelidir",
        ),
    });
    const parsedProfile = userSchema.partial().safeParse(profileData);
    if (!parsedProfile.success) {
      return {
        code: 400,
        message: parsedProfile.error.issues
          .map((issue) => issue.message)
          .join(", "),
        error: true,
        data: null,
      };
    }
    const user = await User.findById(userId);
    if (!user) {
      return {
        code: 404,
        message: "Kullanıcı bulunamadı",
        error: true,
        data: null,
      };
    }
    if (profileData.name) user.name = profileData.name;
    if (profileData.surname) user.surname = profileData.surname;
    if (profileData.email) user.email = profileData.email;
    await user.save();
    return {
      code: 200,
      message: "Profil başarıyla güncellendi",
      error: false,
      data: null,
    };
  }
}

export default UserService;
