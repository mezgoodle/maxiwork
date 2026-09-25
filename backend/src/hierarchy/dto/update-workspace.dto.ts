import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkspaceSettingsDto } from './create-workspace.dto';

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  @MinLength(2, {
    message: 'Workspace name must be at least 2 characters long',
  })
  @MaxLength(50, { message: 'Workspace name cannot exceed 50 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Slug must contain only lowercase alphanumeric characters and hyphens',
  })
  @MinLength(2, { message: 'Slug must be at least 2 characters long' })
  @MaxLength(60, { message: 'Slug cannot exceed 60 characters' })
  slug?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WorkspaceSettingsDto)
  settings?: WorkspaceSettingsDto;
}
