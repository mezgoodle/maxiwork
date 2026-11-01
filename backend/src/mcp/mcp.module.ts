import { Module } from '@nestjs/common';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { McpToolsRegistryService } from './mcp-tools-registry.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [ApiKeysModule],
  controllers: [McpController],
  providers: [McpToolsRegistryService, McpService],
  exports: [McpToolsRegistryService, McpService],
})
export class McpModule {}
