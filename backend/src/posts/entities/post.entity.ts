import { ApiProperty } from '@nestjs/swagger';
import { Post } from '@prisma/client';

export class PostEntity implements Post {
  @ApiProperty()
  id: number;
  @ApiProperty()
  title: string;
  @ApiProperty({ required: false })
  content: string | null;
  @ApiProperty({ required: false })
  published: boolean | null;
  @ApiProperty({ required: false })
  authorId: number;
}
