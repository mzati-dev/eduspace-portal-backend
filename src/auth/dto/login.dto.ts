import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'parent@example.com' })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @ApiProperty({ example: 'SecurePass123' })
    @IsNotEmpty()
    @MinLength(8)
    password!: string;

    @ApiPropertyOptional({ description: 'School ID for subdomain validation' })
    @IsOptional()
    @IsString()
    schoolId?: string;
}