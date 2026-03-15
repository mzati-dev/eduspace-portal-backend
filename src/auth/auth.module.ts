import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
// import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/user.entity';
import { PasswordResetToken } from '../users/password-reset-token.entity';
import { UsersModule } from '../users/users.module';
// import { EmailService } from './email.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { School } from '../schools/entities/school.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Student } from 'src/students/entities/student.entity';
import { StudentsModule } from 'src/students/students.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordResetToken, School, Teacher, Student]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key-change-this'),
        signOptions: {
          expiresIn: '7d',
        },
      }),
    }),
    UsersModule,
    StudentsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule { }