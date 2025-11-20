import { IsIn, IsString } from 'class-validator';

export class ConnectAccountingDto {
  @IsIn(['QUICKBOOKS'])
  provider!: 'QUICKBOOKS';

  @IsString()
  realmId!: string;
}
