import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { SetTaskCustomFieldsDto } from './dto/set-task-custom-fields.dto';
import { BatchUpdateCustomFieldsDto } from './dto/batch-update-custom-fields.dto';

interface AuthenticatedUser {
  _id: Types.ObjectId | string;
  email: string;
  [key: string]: unknown;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  // ----------------------------------------------------
  // Space Custom Fields
  // ----------------------------------------------------

  @Post('spaces/:spaceId/custom-fields')
  @HttpCode(HttpStatus.CREATED)
  async createSpaceCustomField(
    @Param('spaceId', ParseObjectIdPipe) spaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.customFieldsService.createSpaceCustomField(
      spaceId,
      dto,
      String(user._id),
    );
  }

  @Get('spaces/:spaceId/custom-fields')
  async getSpaceCustomFields(
    @Param('spaceId', ParseObjectIdPipe) spaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customFieldsService.getSpaceCustomFields(
      spaceId,
      String(user._id),
    );
  }

  // ----------------------------------------------------
  // List Custom Fields (Effective Inheritance)
  // ----------------------------------------------------

  @Post('lists/:listId/custom-fields')
  @HttpCode(HttpStatus.CREATED)
  async createListCustomField(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return this.customFieldsService.createListCustomField(
      listId,
      dto,
      String(user._id),
    );
  }

  @Get('lists/:listId/custom-fields')
  async getListEffectiveCustomFields(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customFieldsService.getListEffectiveCustomFields(
      listId,
      String(user._id),
    );
  }

  // ----------------------------------------------------
  // Custom Field Definitions CRUD
  // ----------------------------------------------------

  @Get('custom-fields/:fieldId')
  async getCustomFieldById(
    @Param('fieldId', ParseObjectIdPipe) fieldId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customFieldsService.getCustomFieldById(
      fieldId,
      String(user._id),
    );
  }

  @Patch('custom-fields/:fieldId')
  async updateCustomField(
    @Param('fieldId', ParseObjectIdPipe) fieldId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.customFieldsService.updateCustomField(
      fieldId,
      dto,
      String(user._id),
    );
  }

  @Delete('custom-fields/:fieldId')
  async deleteCustomField(
    @Param('fieldId', ParseObjectIdPipe) fieldId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customFieldsService.deleteCustomField(
      fieldId,
      String(user._id),
    );
  }

  // ----------------------------------------------------
  // Task Custom Field Values
  // ----------------------------------------------------

  @Patch('tasks/:taskId/custom-fields')
  async setTaskCustomFields(
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetTaskCustomFieldsDto,
  ) {
    return this.customFieldsService.setTaskCustomFields(
      taskId,
      dto.customFieldValues,
      String(user._id),
    );
  }

  @Patch('lists/:listId/tasks/:taskId/custom-fields')
  async setListTaskCustomFields(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetTaskCustomFieldsDto,
  ) {
    return this.customFieldsService.setTaskCustomFields(
      taskId,
      dto.customFieldValues,
      String(user._id),
      listId,
    );
  }

  @Patch('lists/:listId/tasks/custom-fields/batch')
  async batchUpdateTaskCustomFields(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BatchUpdateCustomFieldsDto,
  ) {
    return this.customFieldsService.batchUpdateTaskCustomFields(
      listId,
      dto.updates,
      String(user._id),
    );
  }

  @Post('lists/:listId/tasks/custom-fields/batch')
  @HttpCode(HttpStatus.OK)
  async batchUpdateTaskCustomFieldsPost(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BatchUpdateCustomFieldsDto,
  ) {
    return this.customFieldsService.batchUpdateTaskCustomFields(
      listId,
      dto.updates,
      String(user._id),
    );
  }
}
