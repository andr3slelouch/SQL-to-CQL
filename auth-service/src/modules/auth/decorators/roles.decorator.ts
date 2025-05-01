import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: boolean[]) => SetMetadata('roles', roles);