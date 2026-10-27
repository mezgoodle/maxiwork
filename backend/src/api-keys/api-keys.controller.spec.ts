import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';

describe('ApiKeysController', () => {
  let controller: ApiKeysController;
  const mockService = {
    findAllByUser: jest.fn(),
    createKey: jest.fn(),
    removeKey: jest.fn(),
  };

  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'dev@maxiwork.com',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [
        {
          provide: ApiKeysService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ApiKeysController>(ApiKeysController);
  });

  it('lists API keys for the current user', async () => {
    const expected = [{ id: '1', name: 'Cursor' }];
    mockService.findAllByUser.mockResolvedValue(expected);

    const res = await controller.findAll(mockUser);
    expect(res).toEqual(expected);
    expect(mockService.findAllByUser).toHaveBeenCalledWith(
      String(mockUser._id),
    );
  });

  it('creates a new API key for the current user', async () => {
    const dto = { name: 'Antigravity' };
    const created = { id: '2', name: 'Antigravity', secret: 'mxw_live_123' };
    mockService.createKey.mockResolvedValue(created);

    const res = await controller.create(mockUser, dto);
    expect(res).toEqual(created);
    expect(mockService.createKey).toHaveBeenCalledWith(
      String(mockUser._id),
      dto,
    );
  });

  it('deletes an API key by ID for the current user', async () => {
    const deleted = { id: '2', message: 'API key deleted successfully' };
    mockService.removeKey.mockResolvedValue(deleted);

    const res = await controller.remove('2', mockUser);
    expect(res).toEqual(deleted);
    expect(mockService.removeKey).toHaveBeenCalledWith(
      String(mockUser._id),
      '2',
    );
  });
});
