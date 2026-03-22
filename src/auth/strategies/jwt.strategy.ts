import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { School } from '../../schools/entities/school.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        @InjectRepository(School)
        private schoolRepository: Repository<School>,
        @InjectRepository(Teacher)
        private teacherRepository: Repository<Teacher>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key-change-this'),
        });
    }

    async validate(payload: any) {
        // Check if it's a teacher (has name field in payload)
        if (payload.role === 'teacher') {
            const teacher = await this.teacherRepository.findOne({
                where: { id: payload.sub },
                select: ['id', 'email', 'name', 'school_id', 'is_active']
            });

            if (!teacher || !teacher.is_active) {
                throw new UnauthorizedException('Teacher not found or inactive');
            }

            return {
                id: teacher.id,
                email: teacher.email,
                fullName: teacher.name,
                role: 'teacher',
                schoolId: teacher.school_id,
            };
        }

        // Check if it's a school admin
        const school = await this.schoolRepository.findOne({
            where: { id: payload.sub },
            select: ['id', 'adminEmail', 'adminName', 'name', 'isActive']
        });

        if (school && school.isActive) {
            return {
                id: school.id,
                email: school.adminEmail,
                fullName: school.adminName,
                schoolName: school.name,
                role: 'school_admin',
                schoolId: school.id,
            };
        }

        // Check regular users
        const user = await this.usersRepository.findOne({
            where: { id: payload.sub },
            select: ['id', 'email', 'fullName', 'isEmailVerified']
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (!user.isEmailVerified) {
            throw new UnauthorizedException('Please verify your email address');
        }

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role || 'user',
            schoolId: null,
        };
    }
}

// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { ExtractJwt, Strategy } from 'passport-jwt';
// import { ConfigService } from '@nestjs/config';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { User } from '../../users/user.entity';

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//     constructor(
//         private configService: ConfigService,
//         @InjectRepository(User)
//         private usersRepository: Repository<User>,
//     ) {
//         super({
//             jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//             ignoreExpiration: false,
//             secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key-change-this'),
//         });
//     }

//     async validate(payload: any) {
//         const user = await this.usersRepository.findOne({
//             where: { id: payload.sub },
//             select: ['id', 'email', 'fullName', 'isEmailVerified']
//         });

//         if (!user) {
//             throw new UnauthorizedException('User not found');
//         }

//         if (!user.isEmailVerified) {
//             throw new UnauthorizedException('Please verify your email address');
//         }

//         return user;
//     }
// }