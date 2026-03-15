import { Controller, Get, Param, Query } from '@nestjs/common';
import { ParentsService } from './parents.service';

@Controller('api/parents')
export class ParentsController {
    constructor(private readonly parentsService: ParentsService) { }

    @Get(':parentId/children')
    async getParentChildren(
        @Param('parentId') parentId: string,
        @Query('schoolId') schoolId?: string
    ) {
        return this.parentsService.findChildrenByParentId(parentId, schoolId);
    }
}