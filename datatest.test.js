// Run from the repository root with DATABASE_URL set to file:../dev.db.
// In PowerShell, set it with: $env:DATABASE_URL = 'file:../dev.db'
// 1. Install dependencies: `npm ci` (or `npm.cmd ci` in PowerShell).
// 2. Generate Prisma Client: `npx prisma generate`.
// 3. Apply database migrations: `npx prisma migrate deploy`.
// 4. Run this test: `npx vitest run datatest.test.js`.
// In PowerShell, use the `.cmd` wrappers for npx commands if script execution is blocked.
// On Windows ARM, use x64 Node.js with Prisma 6's query engine.

import { randomUUID } from 'node:crypto';
import { afterAll, expect, test } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'file:../dev.db',
        },
    },
});

afterAll(async () => {
    await prisma.$disconnect();
});

test('writes a user to SQLite and reads it back correctly', async () => {
    const userData = {
        email: `test-${randomUUID()}@example.com`,
        passwordHash: 'test-password-hash',
        firstName: 'John',
        lastName: 'Sherpa',
        role: 'student',
    };
    let createdUser;
    let storedUser;

    try {
        createdUser = await prisma.user.create({ data: userData });
        storedUser = await prisma.user.findUnique({
            where: { id: createdUser.id },
        });

        expect(storedUser).toMatchObject(userData);
        expect(storedUser.id).toBe(createdUser.id);
    } finally {
        if (createdUser) {
            await prisma.user.delete({ where: { id: createdUser.id } });
        }
    }

    console.log('Successfully wrote and verified user:', storedUser);
});