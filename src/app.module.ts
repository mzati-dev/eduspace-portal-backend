import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Add ConfigService
import { StudentsModule } from './students/students.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SchoolsModule } from './schools/schools.module';
import { TeachersModule } from './teachers/teachers.module';

@Module({
  imports: [
    // 1. Tell NestJS which .env file to load
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true,
    }),

    // 2. Use a "Factory" to wait for the config variables before connecting
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => {
        const isProd = configService.get<string>('NODE_ENV') === 'production';

        return {
          type: 'postgres',
          ...(isProd
            ? {
              url: configService.get<string>('DATABASE_URL'),
            }
            : {
              host: configService.get<string>('DB_HOST', 'localhost'),
              port: Number(configService.get<string>('DB_PORT', '5432')),
              username: configService.get<string>('DB_USERNAME', 'postgres'),
              password: configService.get<string>('DB_PASSWORD'),
              database: configService.get<string>('DB_NAME', 'parent_portal_db'),
            }),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: !isProd,
          logging: !isProd,
          extra: isProd
            ? { ssl: { rejectUnauthorized: false } }
            : {},
        };
      },
    }),

    StudentsModule,

    AuthModule,

    UsersModule,

    SchoolsModule,

    TeachersModule,




  ],
})
export class AppModule { }