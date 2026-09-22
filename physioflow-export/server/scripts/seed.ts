import bcrypt from "bcryptjs";
import { db, sqlite } from "../src/db/client.js";
import {
  users,
  clinics,
  clinicAdmins,
  managers,
  physiotherapists,
  patients,
  appointments,
  exercises,
  treatmentPlans,
  exerciseAssignments,
  exerciseCompletions,
  recoveryLogs,
  conversations,
  messages,
  payments,
} from "../src/db/schema.js";

const DEMO_PASSWORD = "Demo1234!";

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

/** Seeds one full institution end-to-end. Returns key ids for cross-referencing in messages/etc. */
async function seedInstitution(
  globalPatientCounter: { value: number },
  opts: {
  orgCode: string;
  clinicName: string;
  city: string;
  managerName: string;
  managerEmail: string;
  adminName: string;
  adminEmail: string;
  physios: Array<{ name: string; email: string; specialty: string; years: number }>;
  patientsSeed: Array<{ name: string; email: string; condition: string; physioIndex: number }>;
}) {
  const passwordHash = await hash(DEMO_PASSWORD);

  const [clinic] = await db
    .insert(clinics)
    .values({ name: opts.clinicName, city: opts.city, currency: "GHS", orgCode: opts.orgCode })
    .returning();

  const [managerUser] = await db
    .insert(users)
    .values({ email: opts.managerEmail, passwordHash, role: "MANAGER", fullName: opts.managerName })
    .returning();
  await db.insert(managers).values({ clinicId: clinic.id, userId: managerUser.id });

  const [adminUser] = await db
    .insert(users)
    .values({ email: opts.adminEmail, passwordHash, role: "CLINIC_ADMIN", fullName: opts.adminName })
    .returning();
  await db.insert(clinicAdmins).values({ clinicId: clinic.id, userId: adminUser.id });

  const physios: Array<{ id: string; userId: string; name: string }> = [];
  for (const p of opts.physios) {
    const [user] = await db
      .insert(users)
      .values({ email: p.email, passwordHash, role: "PHYSIOTHERAPIST", fullName: p.name })
      .returning();
    const [physio] = await db
      .insert(physiotherapists)
      .values({ userId: user.id, clinicId: clinic.id, specialty: p.specialty, yearsExperience: p.years })
      .returning();
    physios.push({ id: physio.id, userId: user.id, name: p.name });
  }

  const exerciseRows = await db
    .insert(exercises)
    .values([
      {
        clinicId: clinic.id,
        name: "Knee Flexion",
        bodyArea: "Knee",
        difficulty: "BEGINNER",
        description: "Gentle bending of the knee to restore range of motion.",
        instructions: "Slowly bend the knee as far as comfortable, hold 5s, release.",
        defaultSets: 3,
        defaultReps: 10,
      },
      {
        clinicId: clinic.id,
        name: "Shoulder Pendulum",
        bodyArea: "Shoulder",
        difficulty: "BEGINNER",
        description: "Passive shoulder mobility exercise.",
        instructions: "Lean forward, let arm hang, gently swing in small circles.",
        defaultSets: 2,
        defaultReps: 15,
      },
    ])
    .returning();

  const patientRecords: Array<{ id: string; userId: string; name: string; physioId: string }> = [];
  for (const p of opts.patientsSeed) {
    const physio = physios[p.physioIndex];
    const [user] = await db
      .insert(users)
      .values({ email: p.email, passwordHash, role: "PATIENT", fullName: p.name })
      .returning();
    const [patient] = await db
      .insert(patients)
      .values({
        patientCode: `PF-${String(globalPatientCounter.value++).padStart(6, "0")}`,
        userId: user.id,
        clinicId: clinic.id,
        primaryPhysioId: physio.id,
        condition: p.condition,
        presentingComplaint: p.condition,
        status: "ACTIVE",
      })
      .returning();
    patientRecords.push({ id: patient.id, userId: user.id, name: p.name, physioId: physio.id });
  }

  // One active treatment plan + appointment for the first patient, so dashboards have data.
  const firstPatient = patientRecords[0];
  const firstPhysio = physios[0];
  const [plan] = await db
    .insert(treatmentPlans)
    .values({
      clinicId: clinic.id,
      patientId: firstPatient.id,
      physioId: firstPhysio.id,
      title: "4-Week Rehabilitation Plan",
      goals: JSON.stringify(["Improve strength", "Improve mobility"]),
      status: "ACTIVE",
      startDate: new Date(),
      endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      frequency: "Daily",
    })
    .returning();

  const [assignment] = await db
    .insert(exerciseAssignments)
    .values({
      clinicId: clinic.id,
      treatmentPlanId: plan.id,
      exerciseId: exerciseRows[0].id,
      patientId: firstPatient.id,
      sets: 3,
      reps: 10,
      frequency: "Daily",
    })
    .returning();

  await db.insert(exerciseCompletions).values({ exerciseAssignmentId: assignment.id, state: "COMPLETED", setsCompleted: 3 });

  await db.insert(appointments).values({
    clinicId: clinic.id,
    patientId: firstPatient.id,
    physioId: firstPhysio.id,
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
    status: "CONFIRMED",
    treatmentFocus: firstPatient.name === patientRecords[0].name ? opts.patientsSeed[0].condition : undefined,
  });

  for (let i = 6; i >= 0; i--) {
    await db.insert(recoveryLogs).values({
      clinicId: clinic.id,
      patientId: firstPatient.id,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      painLevel: Math.max(1, 5 - Math.floor(i / 2)),
      mobility: Math.min(9, 4 + Math.floor((6 - i) / 2)),
      mood: 6 + (i % 3),
    });
  }

  const [convo] = await db.insert(conversations).values({ clinicId: clinic.id, patientId: firstPatient.id }).returning();
  await db.insert(messages).values([
    { conversationId: convo.id, senderId: firstPatient.userId, body: "My knee felt a bit stiff this morning, is that normal?" },
    { conversationId: convo.id, senderId: firstPhysio.userId, body: "That's common in week 2 — keep to today's plan and let me know if it persists." },
  ]);

  await db.insert(payments).values({
    clinicId: clinic.id,
    patientId: firstPatient.id,
    amount: 150,
    currency: "GHS",
    method: "MOBILE_MONEY",
    status: "SUCCEEDED",
    providerRef: "momo_demo_1",
  });

  return { clinic, admin: { email: opts.adminEmail }, physios, patients: patientRecords };
}

async function main() {
  console.log("🌱 Seeding two independent institutions (proving tenant isolation is meaningful to test)...");

  const patientCounter = { value: 1 };

  const clinicA = await seedInstitution(patientCounter, {
    orgCode: "PHYSIOCARE-001",
    clinicName: "PhysioCare Accra",
    city: "Accra",
    managerName: "Kwame Asare",
    managerEmail: "manager@physiocare.demo",
    adminName: "Grace Owusu-Ansah",
    adminEmail: "admin@physiocare.demo",
    physios: [
      { name: "Sarah Mensah", email: "sarah.mensah@physiocare.demo", specialty: "Sports & Orthopedic Rehab", years: 8 },
      { name: "Daniel Owusu", email: "daniel.owusu@physiocare.demo", specialty: "Neurological Rehab", years: 5 },
    ],
    patientsSeed: [
      { name: "Lawson Bediako", email: "lawson.bediako@physioflow.demo", condition: "Knee rehabilitation (post-ACL)", physioIndex: 0 },
      { name: "Ama Mensah", email: "ama.mensah@physioflow.demo", condition: "Knee rehabilitation", physioIndex: 0 },
    ],
  });

  const clinicB = await seedInstitution(patientCounter, {
    orgCode: "GREENFIELD-002",
    clinicName: "Greenfield Physiotherapy Clinic",
    city: "Kumasi",
    managerName: "Abena Serwaa",
    managerEmail: "manager@greenfield.demo",
    adminName: "Kojo Antwi",
    adminEmail: "admin@greenfield.demo",
    physios: [{ name: "Michael Addo", email: "michael.addo@greenfield.demo", specialty: "Post-Surgical Recovery", years: 11 }],
    patientsSeed: [{ name: "Kwame Boateng", email: "kwame.boateng@greenfield.demo", condition: "Shoulder mobility", physioIndex: 0 }],
  });

  console.log("✅ Seed complete.\n");
  console.log(`Demo accounts (all use password: ${DEMO_PASSWORD})\n`);
  console.log("Institution A — PhysioCare Accra (Org Code: PHYSIOCARE-001):");
  console.log("  Manager:          manager@physiocare.demo");
  console.log("  Clinic Admin:     admin@physiocare.demo");
  console.log("  Physiotherapist:  sarah.mensah@physiocare.demo");
  console.log("  Patient:          lawson.bediako@physioflow.demo (has an accepted invitation / active login)");
  console.log("\nInstitution B — Greenfield Physiotherapy Clinic (Org Code: GREENFIELD-002):");
  console.log("  Manager:          manager@greenfield.demo");
  console.log("  Clinic Admin:     admin@greenfield.demo");
  console.log("  Physiotherapist:  michael.addo@greenfield.demo");
  console.log("  Patient:          kwame.boateng@greenfield.demo");
  console.log("\nLog in as each institution's admin and confirm you never see the other institution's data.");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => sqlite.close());
