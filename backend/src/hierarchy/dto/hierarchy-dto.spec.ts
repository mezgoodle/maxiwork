import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateWorkspaceDto } from './create-workspace.dto';
import { UpdateWorkspaceDto } from './update-workspace.dto';
import { CreateSpaceDto } from './create-space.dto';
import { UpdateSpaceDto } from './update-space.dto';
import { CreateFolderDto } from './create-folder.dto';
import { UpdateFolderDto } from './update-folder.dto';
import { CreateListDto } from './create-list.dto';
import { UpdateListDto } from './update-list.dto';

describe('Hierarchy DTOs Validation', () => {
  describe('CreateWorkspaceDto', () => {
    it('should validate valid workspace data', async () => {
      const dto = plainToInstance(CreateWorkspaceDto, {
        name: 'Acme Corp',
        slug: 'acme-corp',
        avatarUrl: 'https://example.com/logo.png',
        settings: { defaultTimezone: 'UTC', allowGuestInvites: true },
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid slug format', async () => {
      const dto = plainToInstance(CreateWorkspaceDto, {
        name: 'Acme Corp',
        slug: 'Invalid Slug!',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'slug')).toBe(true);
    });

    it('should reject empty name', async () => {
      const dto = plainToInstance(CreateWorkspaceDto, {
        name: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });
  });

  describe('UpdateWorkspaceDto', () => {
    it('should accept partial update', async () => {
      const dto = plainToInstance(UpdateWorkspaceDto, {
        name: 'Updated Workspace',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('CreateSpaceDto', () => {
    it('should validate valid space data', async () => {
      const dto = plainToInstance(CreateSpaceDto, {
        name: 'Engineering',
        description: 'Core product team',
        icon: 'code',
        color: '#4F46E5',
        isPrivate: false,
        features: {
          customStatuses: true,
          customFields: true,
          calendarView: true,
        },
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject empty space name', async () => {
      const dto = plainToInstance(CreateSpaceDto, {
        name: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });
  });

  describe('UpdateSpaceDto', () => {
    it('should accept partial space update', async () => {
      const dto = plainToInstance(UpdateSpaceDto, {
        color: '#10B981',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('CreateFolderDto & UpdateFolderDto', () => {
    it('should validate valid folder', async () => {
      const dto = plainToInstance(CreateFolderDto, {
        name: 'Sprint 25',
        order: 1,
        isHidden: false,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate folder update', async () => {
      const dto = plainToInstance(UpdateFolderDto, {
        name: 'Sprint 26',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('CreateListDto & UpdateListDto', () => {
    it('should validate valid list with folderId', async () => {
      const dto = plainToInstance(CreateListDto, {
        name: 'Frontend Tasks',
        folderId: '507f1f77bcf86cd799439011',
        order: 0,
        color: '#EF4444',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid folderId', async () => {
      const dto = plainToInstance(CreateListDto, {
        name: 'Frontend Tasks',
        folderId: 'invalid-id',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'folderId')).toBe(true);
    });

    it('should allow null folderId in update to unlink list from folder', async () => {
      const dto = plainToInstance(UpdateListDto, {
        folderId: null,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
