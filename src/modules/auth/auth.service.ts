import { Role } from "@prisma/client";
import { prisma } from "../../shared/config/prisma.client.js";
import { hashPassword, verifyPassword } from "../../shared/utils/hash.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from "../../shared/utils/jwt.js";
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
} from "./auth.schema.js";
import type { FastifyInstance } from "fastify";

// ─────────────────────────────────────────────────────────────
// Podara — Auth Service
// All authentication business logic lives here
// Controller only calls service — never touches DB directly
// ─────────────────────────────────────────────────────────────

export class AuthService {
  constructor(private readonly fastify: FastifyInstance) {}

  // ── Register ───────────────────────────────────────────────

  async register(input: RegisterInput) {
    const { email, password, role, displayName, username } = input;

    // 1. Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw {
        statusCode: 409,
        message: "An account with this email already exists.",
      };
    }

    // 2. Hash password
    const passwordHash = await hashPassword(password);

    // 3. Create user + role-specific profile in a transaction
    // Either everything succeeds or nothing does
    const user = await prisma.$transaction(async (tx) => {
      // Create base user
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
        },
      });

      // Create role-specific profile
      if (role === Role.CREATOR) {
        const emailPrefix = email.split("@")[0] ?? "creator";

        await tx.creator.create({
          data: {
            userId: newUser.id,
            displayName: displayName ?? emailPrefix,
            slug: await generateUniqueSlug(emailPrefix, tx),
          },
        });
      } else if (role === Role.LISTENER) {
        await tx.listener.create({
          data: {
            userId: newUser.id,
            username: username ?? null,
          },
        });
      }
      // ADMIN role — no profile created, managed manually

      return newUser;
    });

    // 4. Generate tokens
    const { accessToken, refreshToken } = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  // ── Login ──────────────────────────────────────────────────

  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const { email, password } = input;

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        isBanned: true,
        isVerified: true,
        deletedAt: true,
      },
    });

    // Use same error for not found and wrong password
    // Prevents email enumeration attacks
    const invalidCredentialsError = {
      statusCode: 401,
      message: "Invalid email or password.",
    };

    if (!user) throw invalidCredentialsError;

    // 2. Check account status
    if (user.deletedAt) throw invalidCredentialsError;
    if (!user.isActive) {
      throw { statusCode: 403, message: "Your account has been deactivated." };
    }
    if (user.isBanned) {
      throw { statusCode: 403, message: "Your account has been suspended." };
    }

    // 3. Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) throw invalidCredentialsError;

    // 4. Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 5. Generate tokens
    const { accessToken, refreshToken } = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  // ── Refresh Token ──────────────────────────────────────────

  async refresh(input: RefreshTokenInput) {
    const { refreshToken } = input;

    const tokenHash = hashRefreshToken(refreshToken);

    // 1. Find token in DB
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            isBanned: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!stored) {
      throw { statusCode: 401, message: "Invalid refresh token." };
    }

    // 2. Check token validity
    if (stored.revokedAt) {
      throw { statusCode: 401, message: "Refresh token has been revoked." };
    }

    if (stored.expiresAt < new Date()) {
      throw { statusCode: 401, message: "Refresh token has expired." };
    }

    const { user } = stored;

    if (!user.isActive || user.isBanned || user.deletedAt) {
      throw { statusCode: 403, message: "Account is not accessible." };
    }

    // 3. Rotate refresh token — revoke old, issue new
    // This is token rotation — industry standard security practice
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokenPair(user.id, user.email, user.role);

    return { accessToken, refreshToken: newRefreshToken };
  }

  // ── Logout ─────────────────────────────────────────────────

  async logout(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);

    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: "Logged out successfully." };
  }

  // ── Logout All Devices ─────────────────────────────────────

  async logoutAll(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: "Logged out from all devices." };
  }

  // ── Me ─────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        listener: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw { statusCode: 404, message: "User not found." };
    }

    return user;
  }

  // ── Private: Generate Token Pair ───────────────────────────

  private async generateTokenPair(
    userId: string,
    email: string,
    role: Role,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Sign JWT access token
    const accessToken = this.fastify.jwt.sign(
      { sub: userId, email, role },
      { expiresIn: "15m" },
    );

    // Generate random refresh token + store its hash
    const refreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        ipAddress: ipAddress ?? null,
        deviceInfo: userAgent ?? null,
        expiresAt: refreshTokenExpiresAt(),
      },
    });

    return { accessToken, refreshToken };
  }
}

// ── Helper: Generate unique slug ───────────────────────────────

async function generateUniqueSlug(base: string, tx: any): Promise<string> {
  // Clean base string — lowercase, replace spaces/special chars with hyphens
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  // Check if slug exists, append random suffix if it does
  const existing = await tx.creator.findUnique({
    where: { slug: cleaned },
    select: { id: true },
  });

  if (!existing) return cleaned;

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${cleaned}-${suffix}`;
}
