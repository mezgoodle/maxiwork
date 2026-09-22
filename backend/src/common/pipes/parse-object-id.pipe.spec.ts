import { BadRequestException } from '@nestjs/common';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

describe('ParseObjectIdPipe', () => {
  let pipe: ParseObjectIdPipe;

  beforeEach(() => {
    pipe = new ParseObjectIdPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should return valid ObjectId string unchanged', () => {
    const validId = '507f1f77bcf86cd799439011';
    expect(pipe.transform(validId, { type: 'param', data: 'id' })).toBe(
      validId,
    );
  });

  it('should throw BadRequestException when value is invalid ObjectId', () => {
    expect(() =>
      pipe.transform('invalid-id', { type: 'param', data: 'id' }),
    ).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when value is empty string', () => {
    expect(() => pipe.transform('', { type: 'param', data: 'id' })).toThrow(
      BadRequestException,
    );
  });
});
