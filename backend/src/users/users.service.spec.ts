import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;

  beforeEach(async () => {
    mockUserModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({
        toObject: () => ({
          _id: 'mock-user-id',
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          password: dto.password,
        }),
      }),
    }));

    mockUserModel.findOne = jest.fn();
    mockUserModel.findById = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user successfully and not return password', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await service.create({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(result).toHaveProperty('_id', 'mock-user-id');
      expect(result).toHaveProperty('firstName', 'Test');
      expect(result).toHaveProperty('lastName', 'User');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect((result as any).password).toBeUndefined();
    });

    it('should throw ConflictException if user already exists', async () => {
      mockUserModel.findOne.mockResolvedValue({
        email: 'test@example.com',
      });

      await expect(
        service.create({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByEmail', () => {
    it('should return user document by email', async () => {
      const mockUser = { email: 'test@example.com' };
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByEmail('test@example.com');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findById', () => {
    it('should return user document by id', async () => {
      const mockUser = { _id: '123', email: 'test@example.com' };
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const result = await service.findById('123');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findById('123')).rejects.toThrow(NotFoundException);
    });
  });
});
