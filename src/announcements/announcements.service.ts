// src/modules/announcements/announcements.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementRead } from './entities/announcement-read.entity';

@Injectable()
export class AnnouncementsService {
    constructor(
        @InjectRepository(Announcement)
        private announcementRepository: Repository<Announcement>,
        @InjectRepository(AnnouncementRead)
        private announcementReadRepository: Repository<AnnouncementRead>,
    ) { }

    async create(data: any, userId: string, userRole: string, schoolId: string): Promise<Announcement> {
        const announcementData: Partial<Announcement> = {
            title: data.title,
            content: data.content,
            type: data.type,
            audience: data.audience,
            priority: data.priority || 'medium',
            isPinned: data.is_pinned || false,
            publishDate: data.publish_date ? new Date(data.publish_date) : new Date(),
            schoolId: schoolId,
            publishedBy: userId,
            publishedByRole: userRole,
        };

        if (data.expiry_date) {
            announcementData.expiryDate = new Date(data.expiry_date);
        }

        const announcement = this.announcementRepository.create(announcementData);
        return await this.announcementRepository.save(announcement);
    }

    async findAll(schoolId: string): Promise<Announcement[]> {
        return await this.announcementRepository.find({
            where: { schoolId },
            order: { isPinned: 'DESC', publishDate: 'DESC' },
        });
    }

    async findOne(id: string, schoolId: string): Promise<Announcement> {
        const announcement = await this.announcementRepository.findOne({
            where: { id, schoolId }
        });
        if (!announcement) {
            throw new NotFoundException('Announcement not found');
        }
        return announcement;
    }

    async update(id: string, data: any, schoolId: string): Promise<Announcement> {
        const announcement = await this.findOne(id, schoolId);

        if (data.title !== undefined) announcement.title = data.title;
        if (data.content !== undefined) announcement.content = data.content;
        if (data.type !== undefined) announcement.type = data.type;
        if (data.audience !== undefined) announcement.audience = data.audience;
        if (data.priority !== undefined) announcement.priority = data.priority;
        if (data.is_pinned !== undefined) announcement.isPinned = data.is_pinned;
        if (data.publish_date !== undefined) announcement.publishDate = new Date(data.publish_date);
        if (data.expiry_date !== undefined) {
            announcement.expiryDate = data.expiry_date ? new Date(data.expiry_date) : null;
        }

        return await this.announcementRepository.save(announcement);
    }

    async remove(id: string, schoolId: string): Promise<void> {
        const result = await this.announcementRepository.delete({ id, schoolId });
        if (result.affected === 0) {
            throw new NotFoundException('Announcement not found');
        }
    }

    async markAsRead(announcementId: string, userId: string, userRole: string, schoolId: string): Promise<void> {
        const existing = await this.announcementReadRepository.findOne({
            where: {
                announcementId,
                userId,
                userRole,
                schoolId
            }
        });

        if (!existing) {
            const readData: Partial<AnnouncementRead> = {
                announcementId,
                userId,
                userRole,
                schoolId,
            };
            const read = this.announcementReadRepository.create(readData);
            await this.announcementReadRepository.save(read);
        }
    }

    async hasRead(announcementId: string, userId: string, schoolId: string): Promise<boolean> {
        const read = await this.announcementReadRepository.findOne({
            where: {
                announcementId,
                userId,
                schoolId
            }
        });
        return !!read;
    }

    async getReadCount(announcementId: string, schoolId: string): Promise<number> {
        return await this.announcementReadRepository.count({
            where: {
                announcementId,
                schoolId
            }
        });
    }
}