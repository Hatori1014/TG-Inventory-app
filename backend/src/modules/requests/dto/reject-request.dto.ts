import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Comment is mandatory here (unlike ApproveRequestDto) — the user's
// explicit requirement: "debe si o si colocar un comentario del rechazo".
export class RejectRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  comment: string;
}
