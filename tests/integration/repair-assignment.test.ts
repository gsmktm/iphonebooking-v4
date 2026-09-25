import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { app } from '../../server/app';
import { db } from '../../server/db';
import { hash, token } from '../../server/core';
import { qcChecks } from '../../server/services/repair-quality';
const prefix = `assignment-${randomUUID()}`;
type Person = { id: string; cookie: string };
let manager: Person, technician: Person, alternate: Person, inspector: Person, customer: Person;
const call = (method: 'get' | 'post' | 'patch', path: string, person: Person) =>
  request(app)
    [method](`/api/v1${path}`)
    .set('Cookie', person.cookie)
    .set('X-Requested-With', 'iPhoneBooking');
beforeAll(async () => {
  if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
    throw new Error('Use an isolated test database.');
  async function person(name: string, permissions: string[]): Promise<Person> {
    const role = permissions.length
      ? await db.role.create({ data: { name: `${prefix}-${name}`, permissions } })
      : null;
    const user = await db.user.create({
      data: {
        name: `${prefix}-${name}`,
        email: `${prefix}-${name}@example.test`,
        passwordHash: 'unused-fixture',
        roleId: role?.id,
      },
    });
    const raw = token();
    await db.userSession.create({
      data: { userId: user.id, tokenHash: hash(raw), expiresAt: new Date(Date.now() + 3600000) },
    });
    return { id: user.id, cookie: `session=${raw}` };
  }
  manager = await person('manager', ['repair.assign', 'repair.read', 'repair.update']);
  technician = await person('technician', ['repair.read', 'repair.update', 'repair.qc']);
  alternate = await person('alternate', ['repair.read', 'repair.update', 'repair.qc']);
  inspector = await person('inspector', ['repair.read', 'repair.qc']);
  customer = await person('customer', []);
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => db.$disconnect());
const repair = () =>
  db.repair.create({
    data: {
      userId: customer.id,
      model: 'Assignment fixture',
      issue: 'Battery',
      description: 'Isolated assignment verification',
      method: 'STORE',
    },
  });
const assign = (id: string, assignee: Person, expectedTechnicianId: string | null = null) =>
  call('post', `/admin/repairs/${id}/assign`, manager).send({
    technicianId: assignee.id,
    expectedTechnicianId,
    reason: 'Assign a qualified service technician.',
  });
describe('Verified repair technician assignment', () => {
  it('restricts the staff picker and assignment, validates eligibility, and keeps staff data private', async () => {
    expect((await call('get', '/admin/repair-technicians', customer)).status).toBe(403);
    expect((await call('get', '/admin/repair-technicians', technician)).status).toBe(403);
    const directory = await call('get', `/admin/repair-technicians?q=${prefix}`, manager);
    expect(directory.status).toBe(200);
    expect(directory.body.map((p: { id: string }) => p.id)).toContain(technician.id);
    expect(directory.body.map((p: { id: string }) => p.id)).not.toContain(inspector.id);
    expect(JSON.stringify(directory.body)).not.toContain('@example.test');
    const row = await repair();
    expect(
      (
        await call('post', `/admin/repairs/${row.id}/assign`, technician).send({
          technicianId: technician.id,
          expectedTechnicianId: null,
          reason: 'Unauthorized self-assignment',
        })
      ).status,
    ).toBe(403);
    expect((await assign(row.id, customer)).status).toBe(422);
    expect(
      (
        await call('patch', `/admin/repairs/${row.id}/status`, manager).send({
          status: 'RECEIVED',
          note: 'Attempt old assignment bypass',
          technician: customer.id,
        })
      ).status,
    ).toBe(422);
    expect((await assign(row.id, technician)).status).toBe(201);
    const saved = await db.repair.findUniqueOrThrow({ where: { id: row.id } });
    expect(saved.assignedTechnicianId).toBe(technician.id);
    const customerRepairs = await call('get', '/repairs', customer);
    expect(customerRepairs.body.find((r: { id: string }) => r.id === row.id)).not.toHaveProperty(
      'assignedTechnicianId',
    );
    expect((await assign(row.id, alternate)).body.error.code).toBe('ASSIGNMENT_CHANGED');
  });
  it('allows one concurrent assignment and protects the recorded history', async () => {
    const row = await repair();
    const outcomes = await Promise.all([assign(row.id, technician), assign(row.id, alternate)]);
    expect(outcomes.map((r) => r.status).sort()).toEqual([201, 409]);
    const assignments = await db.repairAssignment.findMany({ where: { repairId: row.id } });
    expect(assignments).toHaveLength(1);
    await expect(
      db.repairAssignment.update({
        where: { id: assignments[0].id },
        data: { reason: 'Rewrite history' },
      }),
    ).rejects.toThrow();
    await expect(
      db.repairAssignment.delete({ where: { id: assignments[0].id } }),
    ).rejects.toThrow();
    expect(await db.auditLog.count({ where: { action: 'repair.assign', entityId: row.id } })).toBe(
      1,
    );
  });
  it('blocks current and former technicians from independent QC and locks assignment during inspection', async () => {
    vi.stubEnv('REQUIRE_INDEPENDENT_REPAIR_QC', 'true');
    const row = await repair();
    expect((await assign(row.id, technician)).status).toBe(201);
    expect((await assign(row.id, alternate, technician.id)).status).toBe(201);
    await db.repair.update({
      where: { id: row.id },
      data: {
        status: 'QUALITY_CONTROL',
        history: { create: { status: 'QUALITY_CONTROL', note: 'Fixture reached QC' } },
      },
    });
    expect((await assign(row.id, manager, alternate.id)).body.error.code).toBe(
      'ASSIGNMENT_STAGE_LOCKED',
    );
    const checks = qcChecks.map((name) => ({ name, passed: true }));
    for (const actor of [technician, alternate])
      expect(
        (await call('post', `/admin/repairs/${row.id}/qc`, actor).send({ checks })).body.error.code,
      ).toBe('INDEPENDENT_QC_REQUIRED');
    expect(
      (await call('post', `/admin/repairs/${row.id}/qc`, inspector).send({ checks })).status,
    ).toBe(201);
    expect(
      (
        await call('patch', `/admin/repairs/${row.id}/status`, manager).send({
          status: 'READY',
          note: 'Independent checks passed',
        })
      ).status,
    ).toBe(200);
  });
  it('does not treat unmatched legacy technician text as verified independence', async () => {
    vi.stubEnv('REQUIRE_INDEPENDENT_REPAIR_QC', 'true');
    const row = await repair();
    await db.repair.update({
      where: { id: row.id },
      data: { technician: 'Unverified historical name' },
    });
    expect((await assign(row.id, technician)).status).toBe(201);
    await db.repair.update({ where: { id: row.id }, data: { status: 'QUALITY_CONTROL' } });
    const response = await call('post', `/admin/repairs/${row.id}/qc`, inspector).send({
      checks: qcChecks.map((name) => ({ name, passed: true })),
    });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('LEGACY_ASSIGNMENT_REVIEW_REQUIRED');
  });
});
