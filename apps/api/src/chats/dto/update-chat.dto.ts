import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateChatDto } from './create-chat.dto';

export class UpdateChatDto extends PartialType(
    OmitType(CreateChatDto, ['participants'] as const),
) { }
