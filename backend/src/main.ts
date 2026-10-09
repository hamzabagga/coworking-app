import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // toutes les routes sont servies sous /api (ex. /api/auth/login)
  app.setGlobalPrefix('api');

  // autorise le frontend à appeler l'API
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? true });

  // valide et convertit automatiquement les body / query selon les DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
