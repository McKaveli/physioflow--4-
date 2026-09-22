import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seedTestInstitution } from "./helpers.js";
import { db } from "../src/db/client.js";
import { exercises, treatmentPlans, exerciseAssignments } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

const app = createApp();

let instA: Awaited<ReturnType<typeof seedTestInstitution>>;
let instB: Awaited<ReturnType<typeof seedTestInstitution>>;
let adminA: ReturnType<typeof request.agent>;
let adminB: ReturnType<typeof request.agent>;
let physioA: ReturnType<typeof request.agent>;
let physioB: ReturnType<typeof request.agent>;

beforeAll(async () => {
  instA = await seedTestInstitution("isoA");
  instB = await seedTestInstitution("isoB");

  adminA = request.agent(app);
  await adminA.post("/api/auth/login").send({ email: instA.admin.email, password: "password123" });
  adminB = request.agent(app);
  await adminB.post("/api/auth/login").send({ email: instB.admin.email, password: "password123" });
  physioA = request.agent(app);
  await physioA.post("/api/auth/login").send({ email: instA.physio.email, password: "password123" });
  physioB = request.agent(app);
  await physioB.post("/api/auth/login").send({ email: instB.physio.email, password: "password123" });
});

describe("cross-tenant isolation — Institution A can never see Institution B's data", () => {
  it("PATIENTS: A's patient list never includes B's patients, and direct lookup 404s", async () => {
    const list = await physioA.get("/api/patients");
    expect(list.body.some((p: { id: string }) => p.id === instB.patient.id)).toBe(false);

    const direct = await physioA.get(`/api/patients/${instB.patient.id}`);
    expect(direct.status).toBe(404);
  });

  it("STAFF: A's physiotherapist directory never includes B's physiotherapists", async () => {
    const list = await physioA.get("/api/physiotherapists");
    expect(list.body.some((p: { id: string }) => p.id === instB.physio.id)).toBe(false);

    const direct = await physioA.get(`/api/physiotherapists/${instB.physio.id}`);
    expect(direct.status).toBe(404);
  });

  it("APPOINTMENTS: A cannot schedule an appointment using B's patient or physio ids", async () => {
    const crossPatient = await physioA.post("/api/appointments").send({
      patientId: instB.patient.id,
      physioId: instA.physio.id,
      startsAt: "2027-03-01T09:00:00.000Z",
      endsAt: "2027-03-01T09:45:00.000Z",
    });
    expect(crossPatient.status).toBe(404);

    const crossPhysio = await physioA.post("/api/appointments").send({
      patientId: instA.patient.id,
      physioId: instB.physio.id,
      startsAt: "2027-03-01T09:00:00.000Z",
      endsAt: "2027-03-01T09:45:00.000Z",
    });
    expect(crossPhysio.status).toBe(404);
  });

  it("APPOINTMENTS: A's appointment list never includes B's appointments", async () => {
    await physioB.post("/api/appointments").send({
      patientId: instB.patient.id,
      physioId: instB.physio.id,
      startsAt: "2027-03-02T09:00:00.000Z",
      endsAt: "2027-03-02T09:45:00.000Z",
    });
    const listA = await physioA.get("/api/appointments");
    expect(listA.body.every((a: { patientId: string }) => a.patientId !== instB.patient.id)).toBe(true);
  });

  it("EXERCISE LIBRARY: A never sees B's exercises, even though both libraries exist independently", async () => {
    const [exerciseB] = await db
      .insert(exercises)
      .values({
        clinicId: instB.clinic.id,
        name: "Institution B Only Exercise",
        bodyArea: "Back",
        description: "d",
        instructions: "i",
      })
      .returning();

    const listA = await physioA.get("/api/exercises");
    expect(listA.body.some((e: { id: string }) => e.id === exerciseB.id)).toBe(false);

    const directA = await physioA.get(`/api/exercises/${exerciseB.id}`);
    expect(directA.status).toBe(404);
  });

  it("TREATMENT PLANS: A cannot create a plan referencing B's exercise library", async () => {
    const [exerciseB] = await db
      .insert(exercises)
      .values({ clinicId: instB.clinic.id, name: "B Exercise 2", bodyArea: "Hip", description: "d", instructions: "i" })
      .returning();

    const res = await physioA.post("/api/treatment-plans").send({
      patientId: instA.patient.id,
      physioId: instA.physio.id,
      title: "Cross-tenant plan attempt",
      goals: ["Improve mobility"],
      startDate: new Date().toISOString(),
      exerciseInputs: [{ exerciseId: exerciseB.id }],
    });
    expect(res.status).toBe(400); // exercise doesn't belong to this clinic's library
  });

  it("TREATMENT PLANS: A's plan list never includes B's plans", async () => {
    const [planB] = await db
      .insert(treatmentPlans)
      .values({
        clinicId: instB.clinic.id,
        patientId: instB.patient.id,
        physioId: instB.physio.id,
        title: "B's plan",
        goals: "[]",
        startDate: new Date(),
      })
      .returning();

    const listA = await physioA.get("/api/treatment-plans");
    expect(listA.body.some((p: { id: string }) => p.id === planB.id)).toBe(false);

    const directA = await physioA.get(`/api/treatment-plans/${planB.id}`);
    expect(directA.status).toBe(404);
  });

  it("MESSAGES: A cannot read or post into B's patient conversation", async () => {
    const bConvo = await request.agent(app);
    await bConvo.post("/api/auth/login").send({ email: instB.patient.email, password: "password123" });
    const myConvo = await bConvo.get("/api/messages/me");
    const conversationId = myConvo.body.conversationId;

    const readAttempt = await physioA.get(`/api/messages/${conversationId}`);
    expect(readAttempt.status).toBe(404);

    const sendAttempt = await physioA.post(`/api/messages/${conversationId}`).send({ body: "sneaking in" });
    expect(sendAttempt.status).toBe(404);
  });

  it("PAYMENTS: A's admin listing never includes B's payments", async () => {
    const bPatientAgent = request.agent(app);
    await bPatientAgent.post("/api/auth/login").send({ email: instB.patient.email, password: "password123" });
    const paymentB = await bPatientAgent.post("/api/payments").send({ patientId: instB.patient.id, amount: 75, method: "CASH" });

    const listA = await adminA.get("/api/payments");
    expect(listA.body.some((p: { id: string }) => p.id === paymentB.body.id)).toBe(false);
  });

  it("CLINIC SETTINGS: A's admin cannot read or update B's clinic profile", async () => {
    const readAttempt = await adminA.get(`/api/clinics/${instB.clinic.id}/overview`);
    expect(readAttempt.status).toBe(404);

    const updateAttempt = await adminA.patch(`/api/clinics/${instB.clinic.id}`).send({ name: "Hijacked Name" });
    expect(updateAttempt.status).toBe(404);

    // Confirm the update genuinely didn't happen.
    const stillIntact = await adminB.get(`/api/clinics/${instB.clinic.id}`);
    expect(stillIntact.body.name).not.toBe("Hijacked Name");
  });

  it("STAFF CREATION: A cannot plant a staff account into B's clinic, even by sending B's clinicId", async () => {
    const res = await adminA.post("/api/physiotherapists/staff").send({
      email: "planted.staff@physioflow.dev",
      password: "password123",
      fullName: "Planted Staff",
      clinicId: instB.clinic.id, // attempted override — must be ignored
    });
    expect(res.status).toBe(201);

    // The new staff member must have landed in A's clinic, not B's, regardless of what was sent.
    const listB = await physioB.get("/api/physiotherapists");
    expect(listB.body.some((p: { user: { email: string } }) => p.user.email === "planted.staff@physioflow.dev")).toBe(false);

    const listA = await physioA.get("/api/physiotherapists");
    expect(listA.body.some((p: { user: { email: string } }) => p.user.email === "planted.staff@physioflow.dev")).toBe(true);
  });

  it("INVENTORY: A never sees B's stock items, movements, or overview counts", async () => {
    const itemB = await adminB.post("/api/inventory").send({
      name: "Institution B Diclofenac",
      category: "INJECTION",
      quantity: 3,
      unit: "vial",
      minStockThreshold: 5,
    });
    expect(itemB.status).toBe(201);

    const listA = await physioA.get("/api/inventory");
    expect(listA.body.some((i: { id: string }) => i.id === itemB.body.id)).toBe(false);

    const directA = await physioA.get(`/api/inventory/${itemB.body.id}`);
    expect(directA.status).toBe(404);

    const movementAttempt = await physioA.post(`/api/inventory/${itemB.body.id}/movements`).send({
      type: "REMOVED",
      quantityDelta: 1,
      reason: "sneaking in",
    });
    expect(movementAttempt.status).toBe(404);

    // B's low-stock item (3 <= threshold 5) must not appear in A's overview counts.
    const overviewA = await physioA.get("/api/inventory/overview");
    const overviewBefore = overviewA.body.lowStock;

    const itemA = await adminA.post("/api/inventory").send({
      name: "Institution A Item",
      category: "TABLET",
      quantity: 100,
      unit: "tablet",
      minStockThreshold: 10,
    });
    expect(itemA.status).toBe(201);

    const overviewAAfter = await physioA.get("/api/inventory/overview");
    // Only A's own well-stocked item changed A's totals; B's low-stock item never counted toward A.
    expect(overviewAAfter.body.totalItems).toBeGreaterThan(overviewA.body.totalItems);
    expect(overviewAAfter.body.lowStock).toBe(overviewBefore);
  });
});
