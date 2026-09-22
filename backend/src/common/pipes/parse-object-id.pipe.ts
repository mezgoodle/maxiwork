import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value || !isValidObjectId(value)) {
      throw new BadRequestException(`Invalid ${metadata.data ?? 'id'} format`);
    }
    return value;
  }
}
