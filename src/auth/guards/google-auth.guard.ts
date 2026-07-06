import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class GoogleAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Simple guard placeholder — actual validation is performed in AuthService
    return true;
  }
}
