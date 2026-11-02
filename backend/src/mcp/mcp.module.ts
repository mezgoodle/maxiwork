import { Module } from '@nestjs/common';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from '../projects/projects.module';
import { McpToolsRegistryService } from './mcp-tools-registry.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { McpToolsHelper } from './tools/mcp-tools.helper';
import { TaskMcpToolsService } from './tools/task-mcp.tools';
import { HierarchyMcpToolsService } from './tools/hierarchy-mcp.tools';
import { ContextMcpToolsService } from './tools/context-mcp.tools';

@Module({
  imports: [ApiKeysModule, HierarchyModule, TasksModule, ProjectsModule],
  controllers: [McpController],
  providers: [
    McpToolsRegistryService,
    McpService,
    McpToolsHelper,
    TaskMcpToolsService,
    HierarchyMcpToolsService,
    ContextMcpToolsService,
  ],
  exports: [
    McpToolsRegistryService,
    McpService,
    McpToolsHelper,
    TaskMcpToolsService,
    HierarchyMcpToolsService,
    ContextMcpToolsService,
  ],
})
export class McpModule {}
