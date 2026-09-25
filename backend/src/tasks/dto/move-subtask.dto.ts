import { IsMongoId, IsNumber, IsOptional, ValidateIf } from 'class-validator';

export class MoveSubtaskDto {
  @IsOptional()
  @ValidateIf((_, val) => val !== null && val !== undefined)
  @IsMongoId({
    message: 'newParentTaskId must be a valid MongoDB ObjectId or null',
  })
  newParentTaskId?: string | null;

  @IsOptional()
  @IsNumber()
  order?: number;
}
