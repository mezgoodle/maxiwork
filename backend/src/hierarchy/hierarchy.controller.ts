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
import { HierarchyService } from './hierarchy.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { CreateSubtaskDto } from '../tasks/dto/create-subtask.dto';
import { UpdateTaskDto } from '../tasks/dto/update-task.dto';

interface AuthenticatedUser {
  _id: Types.ObjectId | string;
  email: string;
  [key: string]: unknown;
}

@UseGuards(JwtAuthGuard)
@Controller()
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  // ----------------------------------------------------
  // Workspaces
  // ----------------------------------------------------

  @Post('workspaces')
  @HttpCode(HttpStatus.CREATED)
  async createWorkspace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.hierarchyService.createWorkspace(dto, String(user._id));
  }

  @Get('workspaces')
  async findAllWorkspaces(@CurrentUser() user: AuthenticatedUser) {
    return this.hierarchyService.findAllWorkspaces(String(user._id));
  }

  @Get('workspaces/:workspaceId')
  async findOneWorkspace(
    @Param('workspaceId', ParseObjectIdPipe) workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.findOneWorkspace(
      workspaceId,
      String(user._id),
    );
  }

  @Patch('workspaces/:workspaceId')
  async updateWorkspace(
    @Param('workspaceId', ParseObjectIdPipe) workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.hierarchyService.updateWorkspace(
      workspaceId,
      dto,
      String(user._id),
    );
  }

  @Delete('workspaces/:workspaceId')
  async deleteWorkspace(
    @Param('workspaceId', ParseObjectIdPipe) workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.deleteWorkspace(workspaceId, String(user._id));
  }

  @Get('workspaces/:workspaceId/tree')
  async getWorkspaceTree(
    @Param('workspaceId', ParseObjectIdPipe) workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.getWorkspaceTree(
      workspaceId,
      String(user._id),
    );
  }

  // ----------------------------------------------------
  // Spaces
  // ----------------------------------------------------

  @Post('workspaces/:workspaceId/spaces')
  @HttpCode(HttpStatus.CREATED)
  async createSpace(
    @Param('workspaceId', ParseObjectIdPipe) workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSpaceDto,
  ) {
    return this.hierarchyService.createSpace(
      workspaceId,
      dto,
      String(user._id),
    );
  }

  @Get('workspaces/:workspaceId/spaces')
  async findAllSpaces(
    @Param('workspaceId', ParseObjectIdPipe) workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.findAllSpaces(workspaceId, String(user._id));
  }

  @Get('spaces/:spaceId')
  async findOneSpace(
    @Param('spaceId', ParseObjectIdPipe) spaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.findOneSpace(spaceId, String(user._id));
  }

  @Patch('spaces/:spaceId')
  async updateSpace(
    @Param('spaceId', ParseObjectIdPipe) spaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSpaceDto,
  ) {
    return this.hierarchyService.updateSpace(spaceId, dto, String(user._id));
  }

  @Delete('spaces/:spaceId')
  async deleteSpace(
    @Param('spaceId', ParseObjectIdPipe) spaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.deleteSpace(spaceId, String(user._id));
  }

  // ----------------------------------------------------
  // Folders
  // ----------------------------------------------------

  @Post('spaces/:spaceId/folders')
  @HttpCode(HttpStatus.CREATED)
  async createFolder(
    @Param('spaceId', ParseObjectIdPipe) spaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFolderDto,
  ) {
    return this.hierarchyService.createFolder(spaceId, dto, String(user._id));
  }

  @Get('spaces/:spaceId/folders')
  async findAllFolders(
    @Param('spaceId', ParseObjectIdPipe) spaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.findAllFolders(spaceId, String(user._id));
  }

  @Get('folders/:folderId')
  async findOneFolder(
    @Param('folderId', ParseObjectIdPipe) folderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.findOneFolder(folderId, String(user._id));
  }

  @Patch('folders/:folderId')
  async updateFolder(
    @Param('folderId', ParseObjectIdPipe) folderId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.hierarchyService.updateFolder(folderId, dto, String(user._id));
  }

  @Delete('folders/:folderId')
  async deleteFolder(
    @Param('folderId', ParseObjectIdPipe) folderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.deleteFolder(folderId, String(user._id));
  }

  // ----------------------------------------------------
  // Lists
  // ----------------------------------------------------

  @Post('spaces/:spaceId/lists')
  @HttpCode(HttpStatus.CREATED)
  async createList(
    @Param('spaceId', ParseObjectIdPipe) spaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateListDto,
  ) {
    return this.hierarchyService.createList(spaceId, dto, String(user._id));
  }

  @Get('spaces/:spaceId/lists')
  async findAllLists(
    @Param('spaceId', ParseObjectIdPipe) spaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.findAllLists(spaceId, String(user._id));
  }

  @Get('lists/:listId')
  async findOneList(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.findOneList(listId, String(user._id));
  }

  @Patch('lists/:listId')
  async updateList(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateListDto,
  ) {
    return this.hierarchyService.updateList(listId, dto, String(user._id));
  }

  @Delete('lists/:listId')
  async deleteList(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.deleteList(listId, String(user._id));
  }

  // ----------------------------------------------------
  // List Tasks
  // ----------------------------------------------------

  @Post('lists/:listId/tasks')
  @HttpCode(HttpStatus.CREATED)
  async createListTask(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.hierarchyService.createListTask(listId, dto, String(user._id));
  }

  @Get('lists/:listId/tasks')
  async findListTasks(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.findListTasks(listId, String(user._id));
  }

  @Patch('lists/:listId/tasks/:taskId')
  async updateListTask(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.hierarchyService.updateListTask(
      listId,
      taskId,
      dto,
      String(user._id),
    );
  }

  @Delete('lists/:listId/tasks/:taskId')
  async deleteListTask(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.deleteListTask(
      listId,
      taskId,
      String(user._id),
    );
  }

  @Get('lists/:listId/tasks/:taskId')
  async findOneListTask(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.findOneListTask(
      listId,
      taskId,
      String(user._id),
    );
  }

  @Get('lists/:listId/tasks/:taskId/subtasks')
  async findListSubtasks(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.hierarchyService.findListSubtasks(
      listId,
      taskId,
      String(user._id),
    );
  }

  @Post('lists/:listId/tasks/:taskId/subtasks')
  @HttpCode(HttpStatus.CREATED)
  async createListSubtask(
    @Param('listId', ParseObjectIdPipe) listId: string,
    @Param('taskId', ParseObjectIdPipe) taskId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubtaskDto,
  ) {
    return this.hierarchyService.createListSubtask(
      listId,
      taskId,
      dto,
      String(user._id),
    );
  }
}
