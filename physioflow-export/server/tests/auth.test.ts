import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seedTestInstitution } from "./helpers.js";

const app = createApp();

describe("institution signup (the only public self-registration path)", () => {
  const adminEmail = "vitest.institution.admin@physioflow.dev";

  it("creates a new clinic and its first admin", async () => {
    const res = await request(app)
      .post("/api/auth/register-institution")
      .send({ clinicName: "Vitest Clinic", fullName: "Vitest Admin", email: adminEmail, password: "password123" });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("CLINIC_ADMIN");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects duplicate admin email with 409", async () => {
    const res = await request(app)
      .post("/api/auth/register-institution")
      .send({ clinicName: "Another Clinic", fullName: "Someone Else", email: adminEmail, password: "password123" });
    expect(res.status).toBe(409);
  });

  it("rejects invalid payloads with 400", async () => {
    const res = await request(app)
      .post("/api/auth/register-institution")
      .send({ clinicName: "", fullName: "", email: "not-an-email", password: "short" });
    expect(res.status).toBe(400);
  });

  it("logs the new admin in and confirms /me returns clinic admin membership", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: adminEmail, password: "password123" });
    expect(login.status).toBe(200);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.role).toBe("CLINIC_ADMIN");
    expect(me.body.clinicAdmin?.clinicId).toBeTruthy();
  });

  it("does not accept a role field — patients and physios cannot self-register this way", async () => {
    const res = await request(app)
      .post("/api/auth/register-institution")
      .send({ clinicName: "Sneaky Clinic", fullName: "Sneaky Person", email: "sneaky@physioflow.dev", password: "password123", role: "PATIENT" });
    // The endpoint always creates a CLINIC_ADMIN regardless of any extra fields sent.
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("CLINIC_ADMIN");
  });
});

describe("auth + RBAC for staff-created accounts", () => {
  it("blocks a patient from a physiotherapist-only route (403)", async () => {
    const { patient } = await seedTestInstitution("rbac1");
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: patient.email, password: "password123" });
    const res = await agent.get("/api/physiotherapists/me/dashboard");
    expect(res.status).toBe(403);
  });

  it("allows a physiotherapist to access their own dashboard", async () => {
    const { physio } = await seedTestInstitution("rbac2");
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: physio.email, password: "password123" });
    const res = await agent.get("/api/physiotherapists/me/dashboard");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("todaysAppointmentCount");
  });

  it("logs out and invalidates the session cookie for protected routes", async () => {
    const { admin } = await seedTestInstitution("rbac3");
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: admin.email, password: "password123" });
    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(204);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(401);
  });
});
