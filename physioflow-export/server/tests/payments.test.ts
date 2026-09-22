import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seedTestInstitution } from "./helpers.js";

const app = createApp();

let instA: Awaited<ReturnType<typeof seedTestInstitution>>;
let instB: Awaited<ReturnType<typeof seedTestInstitution>>;
let patientBAgent: ReturnType<typeof request.agent>;
let paymentAId: string;

beforeAll(async () => {
  instA = await seedTestInstitution("payA");
  instB = await seedTestInstitution("payB");

  const patientAAgent = request.agent(app);
  await patientAAgent.post("/api/auth/login").send({ email: instA.patient.email, password: "password123" });
  const created = await patientAAgent.post("/api/payments").send({ patientId: instA.patient.id, amount: 100, method: "CASH" });
  paymentAId = created.body.id;

  patientBAgent = request.agent(app);
  await patientBAgent.post("/api/auth/login").send({ email: instB.patient.email, password: "password123" });
});

describe("payments authorization", () => {
  it("prevents a patient from creating a payment on another patient's behalf (403)", async () => {
    const res = await patientBAgent.post("/api/payments").send({ patientId: instA.patient.id, amount: 50, method: "CASH" });
    expect(res.status).toBe(403);
  });

  it("prevents a patient from fetching another (different-institution) patient's payment by id (404 — not 403, to avoid confirming it exists elsewhere)", async () => {
    const res = await patientBAgent.get(`/api/payments/${paymentAId}`);
    expect(res.status).toBe(404);
  });

  it("scopes a patient's payment list to their own payments only, ignoring any patientId query param", async () => {
    const res = await patientBAgent.get(`/api/payments?patientId=${instA.patient.id}`);
    expect(res.status).toBe(200);
    expect(res.body.every((p: { patientId: string }) => p.patientId !== instA.patient.id)).toBe(true);
  });

  it("blocks a physiotherapist from broadly listing all payments (403)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: instA.physio.email, password: "password123" });
    const res = await agent.get("/api/payments");
    expect(res.status).toBe(403);
  });

  it("scopes a clinic admin's payment listing to their own institution only", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: instA.admin.email, password: "password123" });
    const res = await agent.get("/api/payments");
    expect(res.status).toBe(200);
    expect(res.body.some((p: { id: string }) => p.id === paymentAId)).toBe(true);
    expect(res.body.every((p: { patientId: string }) => p.patientId !== instB.patient.id)).toBe(true);
  });
});
