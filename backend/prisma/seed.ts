import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- Applications ---
  const apps = await Promise.all([
    prisma.application.upsert({
      where: { code: 'MEDICAL' },
      update: {},
      create: {
        code: 'MEDICAL',
        name: 'Medical Benefit Application',
        description: 'Handles medical benefit requests and claims',
      },
    }),
    prisma.application.upsert({
      where: { code: 'HR' },
      update: {},
      create: {
        code: 'HR',
        name: 'Human Resources Application',
        description: 'Handles HR processes and notifications',
      },
    }),
  ]);

  console.log(`Created applications: ${apps.map((a) => a.code).join(', ')}`);

  // --- Departments ---
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'MEDICAL' },
      update: {},
      create: { code: 'MEDICAL', name: 'Medical Department' },
    }),
    prisma.department.upsert({
      where: { code: 'HR' },
      update: {},
      create: { code: 'HR', name: 'Human Resources' },
    }),
    prisma.department.upsert({
      where: { code: 'FINANCE' },
      update: {},
      create: { code: 'FINANCE', name: 'Finance' },
    }),
    prisma.department.upsert({
      where: { code: 'IT' },
      update: {},
      create: { code: 'IT', name: 'Information Technology' },
    }),
    prisma.department.upsert({
      where: { code: 'SALES' },
      update: {},
      create: { code: 'SALES', name: 'Sales' },
    }),
    prisma.department.upsert({
      where: { code: 'OPERATIONS' },
      update: {},
      create: { code: 'OPERATIONS', name: 'Operations' },
    }),
  ]);

  console.log(`Created departments: ${departments.map((d) => d.code).join(', ')}`);

  const medicalDept = await prisma.department.findUnique({ where: { code: 'MEDICAL' } });
  const hrDept = await prisma.department.findUnique({ where: { code: 'HR' } });
  const financeDept = await prisma.department.findUnique({ where: { code: 'FINANCE' } });

  // --- Recipients ---
  const recipientData = [
    { employeeCode: 'EMP001', name: 'Dr. Aung', email: 'doctor@company.com', departmentId: medicalDept?.id },
    { employeeCode: 'EMP002', name: 'Finance Manager', email: 'finance@company.com', departmentId: financeDept?.id },
    { employeeCode: 'EMP003', name: 'HR Manager', email: 'hr@company.com', departmentId: hrDept?.id },
    { employeeCode: 'EMP004', name: 'HOD', email: 'hod@company.com', departmentId: medicalDept?.id },
    { employeeCode: 'EMP005', name: 'Manager', email: 'manager@company.com', departmentId: undefined },
    { employeeCode: 'EMP006', name: 'Leave Approver', email: 'leave-approver@company.com', departmentId: hrDept?.id },
    { employeeCode: 'EMP007', name: 'Payroll Officer', email: 'payroll@company.com', departmentId: financeDept?.id },
    { employeeCode: 'EMP008', name: 'Audit Officer', email: 'audit@company.com', departmentId: financeDept?.id },
    { employeeCode: 'EMP009', name: 'IT Support', email: 'itsupport@company.com', departmentId: undefined },
  ];

  const recipients: any[] = [];
  for (const r of recipientData) {
    const existing = await prisma.emailRecipient.findUnique({ where: { email: r.email } });
    if (existing) {
      recipients.push(existing);
    } else {
      recipients.push(await prisma.emailRecipient.create({ data: r as any }));
    }
  }

  console.log(`Created recipients: ${recipients.length}`);

  // --- Email Lists ---
  const medicalApp = await prisma.application.findUnique({ where: { code: 'MEDICAL' } });
  const hrApp = await prisma.application.findUnique({ where: { code: 'HR' } });

  const getRecipient = (email: string) => recipients.find((r) => r.email === email);

  const listData = [
    {
      applicationId: medicalApp!.id,
      code: 'MEDICAL_REQUEST_DOCTOR',
      name: 'Medical Request Doctor',
      description: 'Doctor who reviews medical benefit requests',
    },
    {
      applicationId: medicalApp!.id,
      code: 'MEDICAL_CLAIM_APPROVERS',
      name: 'Medical Claim Approvers',
      description: 'Approvers for medical claims',
    },
    {
      applicationId: hrApp!.id,
      code: 'HR_LEAVE_APPROVERS',
      name: 'HR Leave Approvers',
      description: 'HR recipients for leave approvals',
    },
    {
      applicationId: hrApp!.id,
      code: 'HR_RECRUITMENT_APPROVERS',
      name: 'HR Recruitment Approvers',
      description: 'HR recipients for recruitment approvals',
    },
    {
      applicationId: hrApp!.id,
      code: 'HR_PAYROLL',
      name: 'HR Payroll',
      description: 'HR payroll recipients',
    },
  ];

  const lists: any[] = [];
  for (const l of listData) {
    const existing = await prisma.emailList.findFirst({
      where: { applicationId: l.applicationId, code: l.code },
    });
    if (existing) {
      lists.push(existing);
    } else {
      lists.push(await prisma.emailList.create({ data: l }));
    }
  }

  console.log(`Created email lists: ${lists.length}`);

  // --- List membership ---
  const membership = [
    // MEDICAL_REQUEST_DOCTOR: Dr. Aung (TO)
    {
      listCode: 'MEDICAL_REQUEST_DOCTOR',
      email: 'doctor@company.com',
      recipientType: 'TO',
      priority: 0,
    },
    // MEDICAL_CLAIM_APPROVERS: Finance, HR, HOD, Manager (TO)
    {
      listCode: 'MEDICAL_CLAIM_APPROVERS',
      email: 'finance@company.com',
      recipientType: 'TO',
      priority: 0,
    },
    {
      listCode: 'MEDICAL_CLAIM_APPROVERS',
      email: 'hr@company.com',
      recipientType: 'TO',
      priority: 1,
    },
    {
      listCode: 'MEDICAL_CLAIM_APPROVERS',
      email: 'hod@company.com',
      recipientType: 'TO',
      priority: 2,
    },
    {
      listCode: 'MEDICAL_CLAIM_APPROVERS',
      email: 'manager@company.com',
      recipientType: 'TO',
      priority: 3,
    },
    {
      listCode: 'MEDICAL_CLAIM_APPROVERS',
      email: 'audit@company.com',
      recipientType: 'BCC',
      priority: 0,
    },
    // HR_LEAVE_APPROVERS
    {
      listCode: 'HR_LEAVE_APPROVERS',
      email: 'hr@company.com',
      recipientType: 'TO',
      priority: 0,
    },
    {
      listCode: 'HR_LEAVE_APPROVERS',
      email: 'leave-approver@company.com',
      recipientType: 'CC',
      priority: 0,
    },
    // HR_RECRUITMENT_APPROVERS
    {
      listCode: 'HR_RECRUITMENT_APPROVERS',
      email: 'hr@company.com',
      recipientType: 'TO',
      priority: 0,
    },
    {
      listCode: 'HR_RECRUITMENT_APPROVERS',
      email: 'manager@company.com',
      recipientType: 'CC',
      priority: 0,
    },
    // HR_PAYROLL
    {
      listCode: 'HR_PAYROLL',
      email: 'payroll@company.com',
      recipientType: 'TO',
      priority: 0,
    },
    {
      listCode: 'HR_PAYROLL',
      email: 'finance@company.com',
      recipientType: 'CC',
      priority: 0,
    },
  ];

  let membershipCount = 0;
  for (const m of membership) {
    const list = await prisma.emailList.findFirst({
      where: { code: m.listCode },
    });
    const recipient = getRecipient(m.email) as any;
    if (!list || !recipient) continue;

    const existing = await prisma.emailListRecipient.findFirst({
      where: { emailListId: list.id, recipientId: recipient.id },
    });
    if (existing) continue;

    await prisma.emailListRecipient.create({
      data: {
        emailListId: list.id,
        recipientId: recipient.id,
        recipientType: m.recipientType as any,
        priority: m.priority,
      },
    });
    membershipCount++;
  }

  console.log(`Created list memberships: ${membershipCount}`);

  // --- Application Credentials ---
  const credentials = [
    { appCode: 'MEDICAL', name: 'MEDICAL_APP_PRIMARY' },
    { appCode: 'HR', name: 'HR_APP_PRIMARY' },
  ];

  for (const c of credentials) {
    const app = await prisma.application.findUnique({ where: { code: c.appCode } });
    if (!app) continue;

    const existing = await prisma.applicationCredential.findFirst({
      where: { applicationId: app.id, name: c.name },
    });
    if (existing) continue;

    await prisma.applicationCredential.create({
      data: {
        applicationId: app.id,
        name: c.name,
        description: `Primary API credential for ${c.appCode}`,
        apiKey: `erp_${Buffer.from(c.appCode + '_' + Date.now()).toString('base64url')}${c.appCode.toLowerCase()}_sample`,
      },
    });
  }

  console.log('Created application credentials');

  // --- Default Admin User ---
  const adminEmail = 'admin@portal.com';
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        name: 'Administrator',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log('Created default admin user: admin@portal.com / Admin@123');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });