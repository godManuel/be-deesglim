import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { HashingProvider } from './providers/hashing.provider';
import { AuthProvider, UserRole } from 'src/users/schemas/user.schema';
import { verifyGoogleIdToken } from './strategies/google.strategy';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly hashingProvider: HashingProvider,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.createUser({
      email: registerDto.email,
      fullName: registerDto.fullName,
      password: registerDto.password,
    });
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      emailVerified: user.emailVerified,
      authProvider: user.authProvider,
    };
  }

  async registerAdmin(createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser({
      ...createUserDto,
      role: UserRole.ADMIN,
    } as any);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      emailVerified: user.emailVerified,
      authProvider: user.authProvider,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const matches = await this.hashingProvider.comparePassword(
      loginDto.password,
      user.password,
    );
    if (!matches) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.buildAuthResponse(user);
  }

  async googleAuth(googleAuthDto: { idToken: string }) {
    const profile = await verifyGoogleIdToken(googleAuthDto.idToken);
    if (!profile?.email) {
      throw new UnauthorizedException('Invalid Google credentials');
    }

    let user = await this.usersService.findByEmail(profile.email);
    if (!user) {
      user = await this.usersService.createUser({
        email: profile.email,
        fullName: profile.name ?? profile.email.split('@')[0],
        password: null as any,
        authProvider: AuthProvider.GOOGLE,
        googleId: profile.sub,
      } as any);
    } else if (!user.googleId && profile.sub) {
      user = await this.usersService.updateUser(user.id, {
        googleId: profile.sub,
        authProvider: AuthProvider.GOOGLE,
      } as any);
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload: any = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);
      return this.buildAuthResponse(user);
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private buildAuthResponse(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
        authProvider: user.authProvider,
      },
    };
  }
}
