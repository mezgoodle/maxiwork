import {
  IsString,
  IsNotEmpty,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ObjectId } from 'mongodb';

export class IdValidator {
  @IsString()
  @IsNotEmpty({ message: 'Id is required' })
  id: string;

  // Make isObjectId a static method
  static isObjectId(value: string): boolean {
    return ObjectId.isValid(value);
  }

  toObjectId(): ObjectId {
    return new ObjectId(this.id);
  }
}
