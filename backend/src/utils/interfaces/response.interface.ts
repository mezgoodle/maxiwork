import { ApiError } from '../errors';

export interface Response<T> {
  data: T | null;
  error: ApiError | null;
}
