import { HttpStatus } from '@nestjs/common';

export class ApiError extends Error {
  status: number;
  message: string;

  constructor(message: string, status: number = HttpStatus.NOT_FOUND) {
    super(message);
    this.status = status;
    this.message = message;
  }
}
