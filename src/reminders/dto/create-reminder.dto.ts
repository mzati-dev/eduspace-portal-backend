import { IsString, IsNotEmpty, IsIn, IsDateString } from 'class-validator';

export class CreateReminderDto {
    @IsString()
    @IsNotEmpty()
    message!: string;

    @IsIn(['info', 'warning', 'urgent'])
    type!: 'info' | 'warning' | 'urgent';

    @IsIn(['teachers', 'parents', 'both'])
    audience!: 'teachers' | 'parents' | 'both';

    @IsDateString()
    reminder_date!: string;
}