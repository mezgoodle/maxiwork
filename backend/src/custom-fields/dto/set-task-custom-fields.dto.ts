import { IsNotEmpty, IsObject } from 'class-validator';

export class SetTaskCustomFieldsDto {
  @IsObject()
  @IsNotEmpty()
  customFieldValues: Record<string, unknown>;
}
