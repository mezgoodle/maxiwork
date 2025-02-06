import { Document } from 'mongoose';
import { ApiError } from '../errors';

export interface Response {
  data: Document | null;
  error: ApiError | null;
}
