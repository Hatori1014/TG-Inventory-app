import { MovementResponseDto } from './movement-response.dto';

export interface TransferResponseDto {
  out: MovementResponseDto;
  in: MovementResponseDto;
}
