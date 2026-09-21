import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import { JwtPayload, TokensResponse } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Record<string, unknown> | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      return null;
    }

    const userObj = user.toObject() as unknown as Record<string, unknown>;
    delete userObj.password;
    return userObj;
  }

  async register(createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  async login(user: {
    _id: Types.ObjectId | string;
    email: string;
  }): Promise<TokensResponse> {
    const userId = user._id.toString();
    const payload: JwtPayload = { sub: userId, email: user.email };

    const accessToken = await this.generateAccessToken(payload);
    const refreshToken = await this.generateRefreshToken(payload);

    await this.refreshTokenModel
      .deleteMany({ userId: new Types.ObjectId(userId) })
      .exec();
    await this.storeRefreshToken(refreshToken, new Types.ObjectId(userId));

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshTokens(token: string): Promise<TokensResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'default_refresh_secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const storedToken = await this.refreshTokenModel.findOne({ token }).exec();
    if (
      !storedToken ||
      storedToken.isRevoked ||
      storedToken.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Token rotation: delete old token to prevent token accumulation
    await this.refreshTokenModel.deleteOne({ _id: storedToken._id }).exec();

    const user = await this.usersService.findById(payload.sub);
    const newPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
    };

    const accessToken = await this.generateAccessToken(newPayload);
    const newRefreshToken = await this.generateRefreshToken(newPayload);

    await this.storeRefreshToken(
      newRefreshToken,
      new Types.ObjectId(user._id.toString()),
    );

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(token: string): Promise<{ message: string }> {
    await this.refreshTokenModel.deleteOne({ token }).exec();
    return { message: 'Successfully logged out' };
  }

  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    const expiration =
      this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
    const secret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'default_access_secret';
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiration as StringValue,
    });
  }

  private async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const expiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const secret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'default_refresh_secret';
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiration as StringValue,
    });
  }

  private async storeRefreshToken(
    token: string,
    userId: Types.ObjectId,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenModel.create({
      token,
      userId,
      expiresAt,
      isRevoked: false,
    });
  }
}
