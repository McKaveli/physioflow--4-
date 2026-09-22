import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { seedTestInstitution } from "./helpers.js";

const app = createApp();

let instA: Awaited<ReturnType<typeof seedTestInstitution>>;
let instB: Awaited<ReturnType<typeof seedTestInstitution>>;
let physioA: ReturnType<typeof request.agent>;
let physioB: ReturnType<typeof request.agent>;

beforeAll(async () => {
  instA = await seedTestInstitution("resA");
  instB = await seedTestInstitution("resB");
  physioA = request.agent(app);
  await physioA.post("/api/auth/login").send({ email: instA.physio.email, password: "password123" });
  physioB = request.agent(app);
  await physioB.post("/api/auth/login").send({ email: instB.physio.email, password: "password123" });
});

describe("exercise creation — physiotherapist writes their own clinical content", () => {
  it("rejects a non-YouTube URL for youtubeUrl", async () => {
    const res = await physioA.post("/api/exercises").send({
      name: "Bad Resource",
      bodyArea: "Knee",
      description: "A description",
      instructions: "My own instructions",
      youtubeUrl: "https://vimeo.com/12345",
    });
    expect(res.status).toBe(400);
  });

  it("accepts a valid YouTube URL and stores it verbatim (never re-hosted)", async () => {
    const res = await physioA.post("/api/exercises").send({
      name: "Knee Extension",
      bodyArea: "Knee",
      description: "A description",
      instructions: "My own clinical instructions",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(res.status).toBe(201);
    expect(res.body.youtubeUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("rejects exercise creation with instructions too short (physio must write real content)", async () => {
    const res = await physioA.post("/api/exercises").send({
      name: "Too Short",
      bodyArea: "Knee",
      description: "A description",
      instructions: "hi",
    });
    expect(res.status).toBe(400);
  });
});

describe("exercise media isolation", () => {
  it("rejects an unsupported file type on upload", async () => {
    const res = await physioA
      .post("/api/exercises/upload")
      .attach("file", Buffer.from("not really an executable"), { filename: "malware.exe", contentType: "application/x-msdownload" });
    expect(res.status).toBe(400);
  });

  it("a physio from Institution B cannot fetch Institution A's uploaded exercise media", async () => {
    const upload = await physioA
      .post("/api/exercises/upload")
      .attach("file", Buffer.from("fake video bytes"), { filename: "clip.mp4", contentType: "video/mp4" });
    expect(upload.status).toBe(201);
    const mediaUrl: string = upload.body.url;

    const created = await physioA.post("/api/exercises").send({
      name: "Video Exercise",
      bodyArea: "Shoulder",
      description: "A shoulder mobility exercise",
      instructions: "real instructions here",
      mediaUrl,
    });
    expect(created.status).toBe(201);

    const sameInstitution = await physioA.get(mediaUrl);
    expect(sameInstitution.status).toBe(200);

    const crossInstitution = await physioB.get(mediaUrl);
    expect(crossInstitution.status).toBe(404);
  });
});

describe("session notes — physio-authored, tenant isolated", () => {
  it("a physio cannot create a session note for a patient in another institution", async () => {
    const res = await physioA.post("/api/session-notes").send({
      patientId: instB.patient.id,
      summary: "Sneaking a note into another clinic",
    });
    expect(res.status).toBe(404);
  });

  it("creates a note and it is only visible within the owning institution", async () => {
    const created = await physioA.post("/api/session-notes").send({
      patientId: instA.patient.id,
      summary: "Good progress, full range of motion improving.",
      nextSteps: "Continue current plan.",
    });
    expect(created.status).toBe(201);

    const ownInstitution = await physioA.get(`/api/session-notes/patient/${instA.patient.id}`);
    expect(ownInstitution.status).toBe(200);
    expect(ownInstitution.body.some((n: { id: string }) => n.id === created.body.id)).toBe(true);

    const crossInstitution = await physioB.get(`/api/session-notes/patient/${instA.patient.id}`);
    expect(crossInstitution.status).toBe(404);
  });
});
