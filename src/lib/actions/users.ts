'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { assertPermission } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';

const userSchema = z.object({
  username: z.string().min(3, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร'),
  email: z.string().email().optional().or(z.literal('')),
  fullName: z.string().min(1, 'กรุณากรอกชื่อ-นามสกุล'),
  roleId: z.string().min(1, 'กรุณาเลือกสิทธิ์'),
  canViewCost: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function createUser(formData: FormData) {
  const actor = await assertPermission(PERMISSIONS.USER_MANAGE);
  const data = userSchema.parse({
    username: formData.get('username'),
    email: formData.get('email') || '',
    fullName: formData.get('fullName'),
    roleId: formData.get('roleId'),
    canViewCost: formData.get('canViewCost') === 'on',
    isActive: formData.get('isActive') === 'on',
  });
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');

  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) throw new Error('มีชื่อผู้ใช้นี้อยู่แล้ว');

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: { ...data, email: data.email || null, passwordHash, mustChangePassword: true },
  });

  await writeAuditLog({ userId: actor.id, action: 'CREATE', entityType: 'User', entityId: created.id, newValue: { username: created.username } });
  revalidatePath('/admin/users');
  redirect('/admin/users');
}

export async function updateUser(id: string, formData: FormData) {
  const actor = await assertPermission(PERMISSIONS.USER_MANAGE);
  const data = userSchema.parse({
    username: formData.get('username'),
    email: formData.get('email') || '',
    fullName: formData.get('fullName'),
    roleId: formData.get('roleId'),
    canViewCost: formData.get('canViewCost') === 'on',
    isActive: formData.get('isActive') === 'on',
  });

  const existing = await prisma.user.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.user.update({ where: { id }, data: { ...data, email: data.email || null } });

  const newPassword = String(formData.get('password') ?? '');
  if (newPassword) {
    if (newPassword.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });
  }

  await writeAuditLog({ userId: actor.id, action: 'UPDATE', entityType: 'User', entityId: id, oldValue: { isActive: existing.isActive, roleId: existing.roleId }, newValue: { isActive: updated.isActive, roleId: updated.roleId } });
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${id}`);
}

export async function deactivateUser(id: string) {
  const actor = await assertPermission(PERMISSIONS.USER_MANAGE);
  if (actor.id === id) throw new Error('ไม่สามารถปิดใช้งานบัญชีตนเองได้');
  const updated = await prisma.user.update({ where: { id }, data: { isActive: false } });
  await writeAuditLog({ userId: actor.id, action: 'UPDATE', entityType: 'User', entityId: id, newValue: { isActive: updated.isActive } });
  revalidatePath('/admin/users');
}

export async function changeOwnPassword(userId: string, formData: FormData) {
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  if (newPassword.length < 8) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });
  await writeAuditLog({ userId, action: 'UPDATE', entityType: 'User', entityId: userId, newValue: { passwordChanged: true } });
}
