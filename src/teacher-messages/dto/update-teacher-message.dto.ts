import { PartialType } from '@nestjs/swagger';
import { CreateTeacherMessageDto } from './create-teacher-message.dto';

export class UpdateTeacherMessageDto extends PartialType(CreateTeacherMessageDto) {}
