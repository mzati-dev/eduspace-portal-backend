import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow ALL origins during development
  app.enableCors();

  // REMOVE THIS LINE: app.setGlobalPrefix('api');

  await app.listen(3000);
  console.log(`🚀 Server ready at http://localhost:3000`);
}
bootstrap();

// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   // SIMPLEST FIX: Allow ALL origins during development
//   app.enableCors();

//   app.setGlobalPrefix('api');
//   await app.listen(3000);
//   console.log(`🚀 Server ready at http://localhost:3000/api`);
// }
// bootstrap();

// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   // 1. Allow your React app (on 8080) to access this data
//   app.enableCors({
//     origin: 'http://localhost:8080',
//     methods: 'GET,POST,PUT,DELETE',
//     credentials: true,
//   });

//   // 2. Add /api before all your routes
//   // Your URL becomes: http://localhost:3000/api/students/results/EX123
//   app.setGlobalPrefix('api');

//   // 3. Listen on port 3000
//   await app.listen(3000);

//   console.log(`🚀 Server ready at http://localhost:3000/api`);
// }
// bootstrap();
