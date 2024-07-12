import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthDto } from "./dto";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { EnumRole } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService
  ) {
  }

  async login(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email
      }
    });

    if (!user) {
      throw new ForbiddenException("Invalid credentials");
    }

    const valid = await bcrypt.compare(
      dto.password,
      user.hash
    );

    if (!valid) {
      throw new ForbiddenException("Invalid credentials");
    }

    return this.signToken(user.id, user.email);
  }

  async register(dto: AuthDto, role = EnumRole.USER) {
    const hash = await this.hashPassword(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          userRoles: {
            create: {
              role
            }
          }
        },
      });

      return this.signToken(user.id, user.email);
    } catch (error) {
      if (
        error instanceof
        PrismaClientKnownRequestError
      ) {
        if (error.code === "P2002") {
          throw new ForbiddenException(
            "Credentials taken"
          );
        }
      }
      throw error;
    }

  }

  hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async signToken(
    userId: number,
    email: string
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email
    };
    const secret = this.config.get("JWT_SECRET");

    const token = await this.jwt.signAsync(
      payload,
      {
        expiresIn: "30d",
        secret: secret
      }
    );

    return {
      access_token: token
    };
  }
}
