import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TaskCustomFieldUpdateItemDto {
  @IsMongoId()
  taskId: string;

  @IsObject()
  @IsNotEmpty()
  customFieldValues: Record<string, unknown>;
}

export class BatchUpdateCustomFieldsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskCustomFieldUpdateItemDto)
  updates: TaskCustomFieldUpdateItemDto[];
}
