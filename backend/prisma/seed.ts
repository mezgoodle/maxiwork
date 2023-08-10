import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'johndoe@gmail.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'johndoe@gmail.com',
    },
  });

  const post1 = await prisma.post.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'My first post',
      content: 'Hello world!',
      published: true,
      author: {
        connect: { id: user.id },
      },
    },
  });

  const post2 = await prisma.post.upsert({
    where: { id: 2 },
    update: {},
    create: {
      title: 'My second post',
      content: 'Hello world!',
      published: false,
      author: {
        connect: { id: user.id },
      },
    },
  });

  console.log({ user, post: post1, post2 });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
