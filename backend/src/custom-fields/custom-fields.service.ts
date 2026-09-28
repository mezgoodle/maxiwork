import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { WorkspaceRole } from '../hierarchy/enums/workspace-role.enum';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import {
  CustomField,
  CustomFieldDocument,
} from './schemas/custom-field.schema';
import { CustomFieldType } from './enums/custom-field-type.enum';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { TaskCustomFieldUpdateItemDto } from './dto/batch-update-custom-fields.dto';

export interface EffectiveCustomFieldItem {
  id: string;
  name: string;
  type: CustomFieldType;
  options: string[];
  defaultValue?: unknown;
  required: boolean;
  entityType: 'space' | 'list';
  entityId: string;
  order: number;
  description?: string;
  inherited: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class CustomFieldsService {
  constructor(
    @InjectModel(CustomField.name)
    private readonly customFieldModel: Model<CustomFieldDocument>,
    @InjectModel(Task.name)
    private readonly taskModel: Model<TaskDocument>,
    private readonly hierarchyService: HierarchyService,
  ) {}

  // ----------------------------------------------------
  // Space Custom Fields
  // ----------------------------------------------------

  async createSpaceCustomField(
    spaceId: string,
    dto: CreateCustomFieldDto,
    userId: string,
  ): Promise<CustomFieldDocument> {
    const { space, role } = await this.hierarchyService.checkSpaceAccess(
      spaceId,
      userId,
    );
    if (role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('Guests cannot create custom fields');
    }

    if (
      dto.type === CustomFieldType.DROPDOWN &&
      (!dto.options || dto.options.length === 0)
    ) {
      throw new BadRequestException(
        'Dropdown custom fields must contain at least one option',
      );
    }

    const trimmedName = dto.name.trim();
    const existing = await this.customFieldModel
      .findOne({
        entityType: 'space',
        entityId: space._id,
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      })
      .exec();

    if (existing) {
      throw new BadRequestException(
        `Custom field with name '${trimmedName}' already exists in this space`,
      );
    }

    let order = dto.order;
    if (order === undefined) {
      order = await this.customFieldModel
        .countDocuments({ entityType: 'space', entityId: space._id })
        .exec();
    }

    const field = new this.customFieldModel({
      name: trimmedName,
      type: dto.type,
      options: dto.options
        ? dto.options.map((o) => o.trim()).filter(Boolean)
        : [],
      defaultValue: dto.defaultValue ?? null,
      required: !!dto.required,
      entityType: 'space',
      entityId: space._id,
      order,
      description: dto.description || '',
    });

    return field.save();
  }

  async getSpaceCustomFields(
    spaceId: string,
    userId: string,
  ): Promise<CustomFieldDocument[]> {
    await this.hierarchyService.checkSpaceAccess(spaceId, userId);
    return this.customFieldModel
      .find({ entityType: 'space', entityId: new Types.ObjectId(spaceId) })
      .sort({ order: 1, createdAt: 1 })
      .exec();
  }

  // ----------------------------------------------------
  // List Custom Fields
  // ----------------------------------------------------

  async createListCustomField(
    listId: string,
    dto: CreateCustomFieldDto,
    userId: string,
  ): Promise<CustomFieldDocument> {
    const { list, space, role } = await this.hierarchyService.checkListAccess(
      listId,
      userId,
    );
    if (role === WorkspaceRole.GUEST) {
      throw new ForbiddenException('Guests cannot create custom fields');
    }

    if (
      dto.type === CustomFieldType.DROPDOWN &&
      (!dto.options || dto.options.length === 0)
    ) {
      throw new BadRequestException(
        'Dropdown custom fields must contain at least one option',
      );
    }

    const trimmedName = dto.name.trim();
    const existing = await this.customFieldModel
      .findOne({
        $or: [
          { entityType: 'list', entityId: list._id },
          { entityType: 'space', entityId: space._id },
        ],
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
      })
      .exec();

    if (existing) {
      throw new BadRequestException(
        `Custom field with name '${trimmedName}' already exists in this list or parent space`,
      );
    }

    let order = dto.order;
    if (order === undefined) {
      order = await this.customFieldModel
        .countDocuments({ entityType: 'list', entityId: list._id })
        .exec();
    }

    const field = new this.customFieldModel({
      name: trimmedName,
      type: dto.type,
      options: dto.options
        ? dto.options.map((o) => o.trim()).filter(Boolean)
        : [],
      defaultValue: dto.defaultValue ?? null,
      required: !!dto.required,
      entityType: 'list',
      entityId: list._id,
      order,
      description: dto.description || '',
    });

    return field.save();
  }

  async getListEffectiveCustomFields(
    listId: string,
    userId: string,
  ): Promise<EffectiveCustomFieldItem[]> {
    const { list, space } = await this.hierarchyService.checkListAccess(
      listId,
      userId,
    );

    const [spaceFields, listFields] = await Promise.all([
      this.customFieldModel
        .find({ entityType: 'space', entityId: space._id })
        .sort({ order: 1, createdAt: 1 })
        .lean()
        .exec(),
      this.customFieldModel
        .find({ entityType: 'list', entityId: list._id })
        .sort({ order: 1, createdAt: 1 })
        .lean()
        .exec(),
    ]);

    const result: EffectiveCustomFieldItem[] = [];

    for (const f of spaceFields) {
      result.push({
        id: String(f._id),
        name: f.name,
        type: f.type,
        options: f.options || [],
        defaultValue: f.defaultValue,
        required: f.required,
        entityType: 'space',
        entityId: String(f.entityId),
        order: f.order,
        description: f.description,
        inherited: true,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      });
    }

    for (const f of listFields) {
      result.push({
        id: String(f._id),
        name: f.name,
        type: f.type,
        options: f.options || [],
        defaultValue: f.defaultValue,
        required: f.required,
        entityType: 'list',
        entityId: String(f.entityId),
        order: f.order,
        description: f.description,
        inherited: false,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      });
    }

    return result;
  }

  // ----------------------------------------------------
  // Field Definition Operations (By Field ID)
  // ----------------------------------------------------

  async getCustomFieldById(
    fieldId: string,
    userId: string,
  ): Promise<CustomFieldDocument> {
    const field = await this.customFieldModel.findById(fieldId).exec();
    if (!field) {
      throw new NotFoundException('Custom field not found');
    }

    if (field.entityType === 'space') {
      await this.hierarchyService.checkSpaceAccess(
        String(field.entityId),
        userId,
      );
    } else {
      await this.hierarchyService.checkListAccess(
        String(field.entityId),
        userId,
      );
    }

    return field;
  }

  async updateCustomField(
    fieldId: string,
    dto: UpdateCustomFieldDto,
    userId: string,
  ): Promise<CustomFieldDocument> {
    const field = await this.customFieldModel.findById(fieldId).exec();
    if (!field) {
      throw new NotFoundException('Custom field not found');
    }

    if (field.entityType === 'space') {
      const { role } = await this.hierarchyService.checkSpaceAccess(
        String(field.entityId),
        userId,
      );
      if (role === WorkspaceRole.GUEST) {
        throw new ForbiddenException('Guests cannot update custom fields');
      }
    } else {
      const { role } = await this.hierarchyService.checkListAccess(
        String(field.entityId),
        userId,
      );
      if (role === WorkspaceRole.GUEST) {
        throw new ForbiddenException('Guests cannot update custom fields');
      }
    }

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      const duplicate = await this.customFieldModel
        .findOne({
          _id: { $ne: field._id },
          entityType: field.entityType,
          entityId: field.entityId,
          name: { $regex: new RegExp(`^${trimmed}$`, 'i') },
        })
        .exec();
      if (duplicate) {
        throw new BadRequestException(
          `Another custom field with name '${trimmed}' already exists`,
        );
      }
      field.name = trimmed;
    }

    if (dto.options !== undefined) {
      if (
        field.type === CustomFieldType.DROPDOWN &&
        (!dto.options || dto.options.length === 0)
      ) {
        throw new BadRequestException(
          'Dropdown custom fields must contain at least one option',
        );
      }
      field.options = dto.options.map((o) => o.trim()).filter(Boolean);
    }

    if (dto.defaultValue !== undefined) {
      field.defaultValue = dto.defaultValue;
    }
    if (dto.required !== undefined) {
      field.required = dto.required;
    }
    if (dto.order !== undefined) {
      field.order = dto.order;
    }
    if (dto.description !== undefined) {
      field.description = dto.description;
    }

    return field.save();
  }

  async deleteCustomField(
    fieldId: string,
    userId: string,
  ): Promise<{ message: string; id: string }> {
    const field = await this.customFieldModel.findById(fieldId).exec();
    if (!field) {
      throw new NotFoundException('Custom field not found');
    }

    if (field.entityType === 'space') {
      const { role } = await this.hierarchyService.checkSpaceAccess(
        String(field.entityId),
        userId,
      );
      if (role === WorkspaceRole.GUEST) {
        throw new ForbiddenException('Guests cannot delete custom fields');
      }
    } else {
      const { role } = await this.hierarchyService.checkListAccess(
        String(field.entityId),
        userId,
      );
      if (role === WorkspaceRole.GUEST) {
        throw new ForbiddenException('Guests cannot delete custom fields');
      }
    }

    await this.customFieldModel.findByIdAndDelete(field._id).exec();

    // Clean up task values for this field
    const fieldKey = `customFieldValues.${String(field._id)}`;
    if (field.entityType === 'list') {
      await this.taskModel
        .updateMany({ list: field.entityId }, { $unset: { [fieldKey]: '' } })
        .exec();
    } else if (field.entityType === 'space') {
      // Find all lists belonging to this space
      const lists = await this.hierarchyService.findAllLists(
        String(field.entityId),
        userId,
      );
      const listIds = lists.map((l) => l._id);
      if (listIds.length > 0) {
        await this.taskModel
          .updateMany(
            { list: { $in: listIds } },
            { $unset: { [fieldKey]: '' } },
          )
          .exec();
      }
    }

    return { message: 'Custom field deleted successfully', id: fieldId };
  }

  // ----------------------------------------------------
  // Value Validation & Sanitization
  // ----------------------------------------------------

  validateAndSanitizeFieldValue(
    field: CustomField | EffectiveCustomFieldItem,
    value: unknown,
  ): unknown {
    if (value === null || value === undefined || value === '') {
      if (field.required) {
        throw new BadRequestException(
          `Custom field '${field.name}' is required`,
        );
      }
      return null;
    }

    switch (field.type) {
      case CustomFieldType.TEXT: {
        if (typeof value !== 'string') {
          throw new BadRequestException(
            `Field '${field.name}' value must be a string`,
          );
        }
        return value.trim();
      }

      case CustomFieldType.NUMBER: {
        const num = typeof value === 'number' ? value : Number(value);
        if (isNaN(num) || !isFinite(num)) {
          throw new BadRequestException(
            `Field '${field.name}' value must be a valid number`,
          );
        }
        return num;
      }

      case CustomFieldType.DATE: {
        const d = new Date(value as string | number | Date);
        if (isNaN(d.getTime())) {
          throw new BadRequestException(
            `Field '${field.name}' value must be a valid date`,
          );
        }
        return d.toISOString();
      }

      case CustomFieldType.DROPDOWN: {
        if (typeof value !== 'string') {
          throw new BadRequestException(
            `Field '${field.name}' value must be a string`,
          );
        }
        const val = value.trim();
        if (field.options && !field.options.includes(val)) {
          throw new BadRequestException(
            `Option '${val}' is not valid for '${field.name}'. Allowed options: ${field.options.join(', ')}`,
          );
        }
        return val;
      }

      case CustomFieldType.CHECKBOX: {
        if (typeof value === 'boolean') {
          return value;
        }
        if (value === 'true' || value === 1 || value === '1') {
          return true;
        }
        if (value === 'false' || value === 0 || value === '0') {
          return false;
        }
        throw new BadRequestException(
          `Field '${field.name}' value must be a boolean`,
        );
      }

      default:
        return value;
    }
  }

  validateAndSanitizeValues(
    effectiveFields: (CustomField | EffectiveCustomFieldItem)[],
    inputValues: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    const fieldMap = new Map<string, CustomField | EffectiveCustomFieldItem>();
    for (const f of effectiveFields) {
      const id =
        'id' in f ? String(f.id) : String((f as CustomFieldDocument)._id);
      fieldMap.set(id, f);
    }

    for (const [key, rawValue] of Object.entries(inputValues)) {
      const field = fieldMap.get(key);
      if (field) {
        sanitized[key] = this.validateAndSanitizeFieldValue(field, rawValue);
      }
    }

    return sanitized;
  }

  // ----------------------------------------------------
  // Task Custom Field Values
  // ----------------------------------------------------

  async setTaskCustomFields(
    taskId: string,
    values: Record<string, unknown>,
    userId: string,
  ): Promise<TaskDocument> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.list) {
      const effectiveFields = await this.getListEffectiveCustomFields(
        String(task.list),
        userId,
      );
      const sanitized = this.validateAndSanitizeValues(effectiveFields, values);
      task.customFieldValues = {
        ...(task.customFieldValues || {}),
        ...sanitized,
      };
    } else {
      task.customFieldValues = {
        ...(task.customFieldValues || {}),
        ...values,
      };
    }

    await task.save();

    const updated = await this.taskModel
      .findById(task._id)
      .populate('reporter', 'firstName lastName email avatarUrl')
      .populate('assignee', 'firstName lastName email avatarUrl')
      .populate('parentTaskId', 'title taskKey')
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to retrieve updated task');
    }
    return updated;
  }

  async batchUpdateTaskCustomFields(
    listId: string,
    updates: TaskCustomFieldUpdateItemDto[],
    userId: string,
  ): Promise<{ updatedCount: number; tasks: TaskDocument[] }> {
    const effectiveFields = await this.getListEffectiveCustomFields(
      listId,
      userId,
    );

    const updatedTasks: TaskDocument[] = [];

    for (const item of updates) {
      const task = await this.taskModel
        .findOne({
          _id: new Types.ObjectId(item.taskId),
          list: new Types.ObjectId(listId),
        })
        .exec();

      if (!task) {
        continue;
      }

      const sanitized = this.validateAndSanitizeValues(
        effectiveFields,
        item.customFieldValues,
      );

      task.customFieldValues = {
        ...(task.customFieldValues || {}),
        ...sanitized,
      };

      await task.save();

      const populated = await this.taskModel
        .findById(task._id)
        .populate('reporter', 'firstName lastName email avatarUrl')
        .populate('assignee', 'firstName lastName email avatarUrl')
        .populate('parentTaskId', 'title taskKey')
        .exec();

      if (populated) {
        updatedTasks.push(populated);
      }
    }

    return {
      updatedCount: updatedTasks.length,
      tasks: updatedTasks,
    };
  }
}
