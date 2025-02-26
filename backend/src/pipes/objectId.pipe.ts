import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import * as mongoose from 'mongoose';

@Injectable()
export class ObjectIdPipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata): string {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new BadRequestException('Invalid ID');
    }
    return value;
  }
}
