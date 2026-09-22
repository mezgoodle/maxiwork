import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
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

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} environment variable is required`);
    }
    return value;
  }

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
        secret: this.getRequiredConfig('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    const newPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
    };

    const accessToken = await this.generateAccessToken(newPayload);
    const newRefreshToken = await this.generateRefreshToken(newPayload);

    // Atomic consumption: conditionally find and delete the unexpired matching token hash
    const hashedToken = this.hashToken(token);
    const consumedToken = await this.refreshTokenModel
      .findOneAndDelete({
        token: hashedToken,
        expiresAt: { $gt: new Date() },
      })
      .exec();

    if (!consumedToken) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

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
    const hashedToken = this.hashToken(token);
    await this.refreshTokenModel.deleteOne({ token: hashedToken }).exec();
    return { message: 'Successfully logged out' };
  }

  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    const expiration =
      this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
    const secret = this.getRequiredConfig('JWT_ACCESS_SECRET');
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiration as StringValue,
    });
  }

  private async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const expiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const secret = this.getRequiredConfig('JWT_REFRESH_SECRET');
    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiration as StringValue,
    });
  }

  private async storeRefreshToken(
    token: string,
    userId: Types.ObjectId,
  ): Promise<void> {
    const decoded = this.jwtService.decode<{ exp?: number }>(token);
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.refreshTokenModel.create({
      token: this.hashToken(token),
      userId,
      expiresAt,
      isRevoked: false,
    });
  }
}
