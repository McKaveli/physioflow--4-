import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seedTestInstitution } from "./helpers.js";

const app = createApp();

let institution: Awaited<ReturnType<typeof seedTestInstitution>>;
let physioAgent: ReturnType<typeof request.agent>;
let patientAgent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  institution = await seedTestInstitution("appt");

  physioAgent = request.agent(app);
  await physioAgent.post("/api/auth/login").send({ email: institution.physio.email, password: "password123" });

  patientAgent = request.agent(app);
  await patientAgent.post("/api/auth/login").send({ email: institution.patient.email, password: "password123" });
});

describe("appointments — physiotherapist-driven scheduling", () => {
  const slotStart = new Date("2027-02-15T09:00:00.000Z");
  const slotEnd = new Date("2027-02-15T09:45:00.000Z");

  it("lets a physiotherapist schedule an appointment for their patient", async () => {
    const res = await physioAgent.post("/api/appointments").send({
      patientId: institution.patient.id,
      physioId: institution.physio.id,
      startsAt: slotStart.toISOString(),
      endsAt: slotEnd.toISOString(),
      treatmentFocus: "Initial assessment",
    });
    expect(res.status).toBe(201);
    // Physio-initiated appointments go straight to CONFIRMED — there's no patient
    // confirmation step in this model.
    expect(res.body.status).toBe("CONFIRMED");
  });

  it("rejects a second appointment that overlaps the same physio's slot (409)", async () => {
    const overlapStart = new Date("2027-02-15T09:15:00.000Z");
    const overlapEnd = new Date("2027-02-15T10:00:00.000Z");
    const res = await physioAgent.post("/api/appointments").send({
      patientId: institution.patient.id,
      physioId: institution.physio.id,
      startsAt: overlapStart.toISOString(),
      endsAt: overlapEnd.toISOString(),
    });
    expect(res.status).toBe(409);
  });

  it("rejects end time before start time (400)", async () => {
    const res = await physioAgent.post("/api/appointments").send({
      patientId: institution.patient.id,
      physioId: institution.physio.id,
      startsAt: "2027-02-16T09:00:00.000Z",
      endsAt: "2027-02-16T08:00:00.000Z",
    });
    expect(res.status).toBe(400);
  });

  it("CRITICAL: rejects a patient trying to book their own appointment (403) — patients never self-book in this product", async () => {
    const res = await patientAgent.post("/api/appointments").send({
      patientId: institution.patient.id,
      physioId: institution.physio.id,
      startsAt: "2027-02-17T09:00:00.000Z",
      endsAt: "2027-02-17T09:45:00.000Z",
    });
    expect(res.status).toBe(403);
  });

  it("rejects an unauthenticated booking attempt (401)", async () => {
    const res = await request(app).post("/api/appointments").send({
      patientId: institution.patient.id,
      physioId: institution.physio.id,
      startsAt: slotStart.toISOString(),
      endsAt: slotEnd.toISOString(),
    });
    expect(res.status).toBe(401);
  });

  it("lets the patient VIEW their appointments (read-only) but not create/cancel them", async () => {
    const list = await patientAgent.get("/api/appointments");
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);

    const cancelAttempt = await patientAgent.patch(`/api/appointments/${list.body[0]?.id ?? "whatever"}/cancel`);
    expect(cancelAttempt.status).toBe(403);
  });

  it("prevents scheduling a patient/physio pair that belong to a different institution", async () => {
    const other = await seedTestInstitution("apptOther");
    const res = await physioAgent.post("/api/appointments").send({
      patientId: other.patient.id, // not this physio's institution
      physioId: institution.physio.id,
      startsAt: "2027-02-18T09:00:00.000Z",
      endsAt: "2027-02-18T09:45:00.000Z",
    });
    expect(res.status).toBe(404);
  });
});
