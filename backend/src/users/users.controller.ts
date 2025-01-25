import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import mongoose from 'mongoose';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    if (!isValidObjectId) {
      throw new HttpException('Invalid ID', 400);
    }
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    return user;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    if (!isValidObjectId) {
      throw new HttpException('Invalid ID', 400);
    }
    const user = await this.usersService.update(id, updateUserDto);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    return user;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    if (!isValidObjectId) {
      throw new HttpException('Invalid ID', 400);
    }
    const user = await this.usersService.remove(id);
    if (!user) {
      throw new HttpException('User not found', 404);
    }
    return;
  }
}
