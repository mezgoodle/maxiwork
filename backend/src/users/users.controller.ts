import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags } from '@nestjs/swagger';
import { ObjectIdPipe } from '@/pipes/objectId.pipe';
import { UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    const response = await this.usersService.create(createUserDto);
    if (response.error) {
      throw new HttpException(response.error.message, response.error.status);
    }
    const user = response.data.toObject();
    return plainToInstance(UserDto, user);
  }

  @Get()
  async findAll(): Promise<UserDto[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => plainToInstance(UserDto, user.toObject()));
  }

  @Get(':id')
  async findOne(@Param('id', ObjectIdPipe) id: string): Promise<UserDto> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userObject = user.toObject();
    return plainToInstance(UserDto, userObject);
  }

  @Patch(':id')
  async update(
    @Param('id', ObjectIdPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDto> {
    const updatedUser = await this.usersService.update(id, updateUserDto);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    const userObject = updatedUser.toObject();
    return plainToInstance(UserDto, userObject);
  }

  @Delete(':id')
  async remove(@Param('id', ObjectIdPipe) id: string) {
    const user = await this.usersService.remove(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return;
  }
}
