import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import {
  ApiKeysService,
  CreatedApiKeyResult,
  SanitizedApiKey,
} from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

interface AuthenticatedUser {
  _id: Types.ObjectId | string;
  email: string;
  [key: string]: unknown;
}

@UseGuards(JwtAuthGuard)
@Controller('user/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SanitizedApiKey[]> {
    return this.apiKeysService.findAllByUser(String(user._id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ): Promise<CreatedApiKeyResult> {
    return this.apiKeysService.createKey(String(user._id), createApiKeyDto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; message: string }> {
    return this.apiKeysService.removeKey(String(user._id), id);
  }
}
