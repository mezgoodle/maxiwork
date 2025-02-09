import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ObjectIdPipe } from '@/pipes/objectId.pipe';
import { UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiParam({
    name: 'createUserDto',
    type: CreateUserDto,
    required: true,
    description: 'User data',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User was created successfully',
    type: UserDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User was not created',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    const response = await this.usersService.create(createUserDto);
    if (response.error) {
      throw new HttpException(response.error.message, response.error.status);
    }
    const user = response.data.toObject();
    return plainToInstance(UserDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Get an array of users',
    type: [UserDto],
  })
  async findAll(): Promise<UserDto[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => plainToInstance(UserDto, user.toObject()));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'User id',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User was found successfully',
    type: UserDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User was not found',
  })
  async findOne(@Param('id', ObjectIdPipe) id: string): Promise<UserDto> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userObject = user.toObject();
    return plainToInstance(UserDto, userObject);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'User id',
  })
  @ApiParam({
    name: 'updateUserDto',
    type: UpdateUserDto,
    required: true,
    description: 'User data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User was updated successfully',
    type: UserDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User was not found',
  })
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
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'User id',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User was deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User was not found',
  })
  async remove(@Param('id', ObjectIdPipe) id: string) {
    const user = await this.usersService.remove(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return;
  }
}
