# Business Requirement Document (BRD)
## Hospital Appointment Booking System

| Item | Detail |
|---|---|
| Document version | 1.0 |
| Date | 16 October 2026 |
| Author | Archana Jangamgunta (Business Analyst) |
| Status | Draft for review |
| Related artefacts | User flows (`docs/user-flows`), Wireframes (`docs/wireframes`), Prototype (`prototype/`), Test cases (`docs/testing`) |

---

## 1. Executive Summary

The hospital currently schedules outpatient appointments manually (phone and front desk). This causes double bookings, idle doctor time from unreleased cancellations, and a poor patient experience. This document defines the requirements for a web application that lets patients find doctors, see real availability, and book, cancel and reschedule appointments themselves; lets doctors control their own availability and schedule; and gives administrators oversight and reporting.

## 2. Business Objectives

| ID | Objective | Measure of success (KPI) |
|---|---|---|
| BO-01 | Reduce manual appointment scheduling | ≥ 60% of outpatient appointments booked online within 6 months of launch |
| BO-02 | Eliminate double bookings | Zero confirmed appointments sharing the same doctor and time slot |
| BO-03 | Improve patient experience | Booking completed in ≤ 3 minutes; patient satisfaction ≥ 4/5 |
| BO-04 | Improve doctor utilisation | ≥ 90% of cancelled slots made available again immediately; fewer unfilled slots |
| BO-05 | Give management visibility | Daily/weekly appointment reports available to admins on demand |

## 3. Project Scope

### 3.1 In scope
- Patient self-registration, login and logout.
- Doctor search and filtering by specialization (and by name).
- Doctor profile with qualifications, experience, consultation fee and available slots.
- Booking, confirmation, cancellation and rescheduling of appointments.
- Patient dashboard (upcoming and past appointments).
- Doctor profile maintenance, availability (date and slot) management, schedule view, and marking appointments completed / cancelled.
- Administrator management of patients, doctors and appointments; booking monitoring; basic reports.
- Role-based access control for Patient, Doctor and Administrator.
- Responsive web UI (desktop, tablet, mobile browser).

### 3.2 Out of scope (this phase)
- Online payment of consultation fees (fee is displayed; paid at the hospital).
- Electronic medical records, prescriptions, lab results.
- Video / tele-consultation.
- Native mobile apps.
- Integration with hospital PAS/HIS, insurance or billing systems.
- SMS / email delivery infrastructure (notifications are specified, delivery provider to be chosen later).
- For the assessment prototype: a real backend, database and authentication (mock data only).

## 4. Stakeholders

| Stakeholder | Role / interest | Involvement |
|---|---|---|
| Patients | Primary users; want quick, reliable booking | Requirements validation, UAT |
| Doctors / consultants | Control availability; see their schedule | Requirements, UAT |
| Hospital administrators / front desk | Manage accounts, schedules and bookings; reporting | Requirements, UAT, system owner (operational) |
| Hospital management | Sponsor; KPIs, cost and patient satisfaction | Sign-off |
| IT department | Build, hosting, support, security | Delivery, operations |
| Information governance / DPO | Patient data protection (UK GDPR, DPA 2018) | Review and approval |
| Clinical safety officer | Patient safety impact of scheduling errors (DCB0129/0160 if applicable) | Review |

## 5. User Roles

| Role | Description |
|---|---|
| Guest | Unauthenticated visitor; can search doctors and view profiles but cannot book. |
| Patient | Registered user who books and manages their own appointments. |
| Doctor | Clinician who manages own profile, availability and appointments only. |
| Administrator | Hospital staff with full management rights over doctors, patients and appointments. |

## 6. Functional Requirements

Priority uses MoSCoW (M = Must, S = Should, C = Could).

### 6.1 Authentication and access
| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Patients can register with full name, email, mobile number, date of birth and password. | M |
| FR-02 | Email must be unique; duplicate registration is rejected with a clear message. | M |
| FR-03 | Users log in with email and password; the system identifies their role and opens the matching dashboard. | M |
| FR-04 | Invalid credentials show a generic error (does not reveal whether the email exists). | M |
| FR-05 | Each page and action is restricted by role; direct navigation to an unauthorised page redirects to the user's own dashboard or login. | M |
| FR-06 | Users can log out; session ends after 15 minutes of inactivity. | M |
| FR-07 | Patients can reset a forgotten password via email link. | S |
| FR-08 | Doctor and admin accounts are created by an administrator only (no self-registration). | M |

### 6.2 Doctor search and profile
| ID | Requirement | Priority |
|---|---|---|
| FR-10 | Users can list all active doctors and filter by specialization. | M |
| FR-11 | Users can search doctors by name (partial, case-insensitive). | S |
| FR-12 | Doctor cards show name, specialization, experience, consultation fee and next available slot. | M |
| FR-13 | Doctor profile shows photo/initials, qualifications, experience, languages, fee, bio and bookable slots for the next 14 days. | M |
| FR-14 | Only future, open slots are shown as selectable; booked and past slots are shown disabled or hidden. | M |

### 6.3 Booking
| ID | Requirement | Priority |
|---|---|---|
| FR-20 | A logged-in patient selects a doctor, date and open slot, optionally enters a reason for visit, reviews a summary and confirms. | M |
| FR-21 | On confirmation the system re-checks slot availability at the moment of saving (concurrency check) and only then creates the appointment. | M |
| FR-22 | A unique booking reference (e.g. APT-1042) is generated and an appointment confirmation page is displayed. | M |
| FR-23 | A confirmation notification is sent to the patient (email / SMS). | S |
| FR-24 | A guest who tries to book is sent to login and returned to the same doctor and slot afterwards. | S |
| FR-25 | A patient cannot hold two active appointments at the same date and time (with any doctor). | M |

### 6.4 Patient appointment management
| ID | Requirement | Priority |
|---|---|---|
| FR-30 | Patient dashboard lists upcoming appointments (soonest first) and past appointments (most recent first) with status. | M |
| FR-31 | Patient can cancel an upcoming appointment after confirming; the slot is released immediately. | M |
| FR-32 | Patient can reschedule an upcoming appointment to another open slot with the same doctor; the old slot is released and the new slot is reserved in one transaction. | M |
| FR-33 | Cancel and reschedule are allowed only up to 2 hours before the appointment start time. | M |
| FR-34 | Patient can view the confirmation details of any appointment. | M |

### 6.5 Doctor functions
| ID | Requirement | Priority |
|---|---|---|
| FR-40 | Doctor can view and edit their profile (bio, qualifications, languages, experience). Specialization and fee changes require admin approval. | M |
| FR-41 | Doctor can add availability for a future date by choosing time slots (30-minute slots in working hours 09:00–17:00). | M |
| FR-42 | Doctor can remove an open (unbooked) slot. | M |
| FR-43 | Doctor cannot remove a booked slot; they must cancel the appointment first (patient notified). | M |
| FR-44 | Doctor can view their schedule by day, showing patient name, time, reason and status. | M |
| FR-45 | Doctor can mark an appointment Completed (only once its start time has passed) or Cancelled (with reason). | M |
| FR-46 | Doctor can only see and act on their own appointments. | M |

### 6.6 Administrator functions
| ID | Requirement | Priority |
|---|---|---|
| FR-50 | Admin can add, edit, deactivate and reactivate doctors (name, specialization, fee, qualifications). | M |
| FR-51 | Admin can view, edit and deactivate patient accounts. | M |
| FR-52 | Admin can view all appointments and filter by date, doctor, status and patient. | M |
| FR-53 | Admin can cancel or reschedule any appointment on behalf of a patient (same rules on slot availability). | M |
| FR-54 | Admin dashboard shows today's totals (booked, completed, cancelled) and bookings per doctor. | M |
| FR-55 | Admin can generate a basic appointment report for a date range and export it as CSV. | M |
| FR-56 | Deactivating a doctor with future appointments requires those appointments to be handled first (warn with count). | S |
| FR-57 | All create/cancel/reschedule/complete actions are recorded in an audit log (who, what, when). | S |

## 7. Business Rules

Rules BR-01 to BR-08 are from the brief; BR-09 onwards are additional rules identified during analysis (see section 11).

| ID | Rule | Source |
|---|---|---|
| BR-01 | Only registered and logged-in patients can book appointments. | Brief |
| BR-02 | A patient cannot book an already occupied time slot. | Brief |
| BR-03 | A doctor cannot have two appointments for the same time slot. | Brief |
| BR-04 | Patients must select a valid available date and time (future, within the doctor's published availability). | Brief |
| BR-05 | Cancelled appointments release the slot for other patients immediately. | Brief |
| BR-06 | Rescheduling is allowed only if the new slot is available; otherwise the original appointment is unchanged. | Brief |
| BR-07 | Doctors can view and manage only their own appointments. | Brief |
| BR-08 | Administrators can manage doctors, patients and appointments. | Brief |
| BR-09 | Slots are 30 minutes long; bookable up to 30 days ahead; past slots cannot be booked. | Added |
| BR-10 | Patients can cancel or reschedule only up to 2 hours before the start time. | Added |
| BR-11 | A patient cannot have two active appointments that start at the same date and time. | Added |
| BR-12 | A booked slot cannot be deleted from availability; the appointment must be cancelled first. | Added |
| BR-13 | An appointment can be marked Completed only after its start time. Completed and Cancelled are final states. | Added |
| BR-14 | Rescheduling keeps the same doctor; changing doctor = cancel + new booking. | Added |
| BR-15 | Deactivated doctors are hidden from search and cannot receive new bookings. | Added |
| BR-16 | A patient may hold at most 3 upcoming appointments at once (prevents slot hoarding). | Added |

### 7.1 Appointment status lifecycle
`Booked → Completed` (doctor, after start time) · `Booked → Cancelled` (patient ≥2h before / doctor / admin) · `Booked → Booked` with new slot on reschedule (history kept) · `Booked → No-show` (doctor, after start time — Could-have).

## 8. User Stories and Acceptance Criteria

Acceptance criteria are written in Given / When / Then form.

### Patient

**US-01 Register** — *As a patient, I want to create an account so that I can book appointments online.*
- AC1: Given I am on Register, when I enter valid name, email, mobile, date of birth and a password of ≥ 8 characters, then my account is created and I am taken to my dashboard.
- AC2: Given an email already in use, when I submit, then I see "An account with this email already exists" and no account is created.
- AC3: Given a missing or invalid field, when I submit, then the field is highlighted with a message and the form is not submitted.

**US-02 Log in** — *As a user, I want to log in so that I see the functions for my role.*
- AC1: Given valid credentials, when I log in, then I land on my role's dashboard (patient / doctor / admin).
- AC2: Given invalid credentials, when I log in, then I see "Invalid email or password" and remain on login.
- AC3: Given I am logged in as a patient, when I open a doctor or admin URL, then I am redirected to my own dashboard.

**US-03 Find a doctor** — *As a patient, I want to search by specialization so that I find the right doctor.*
- AC1: Given I select "Cardiology", then only active cardiologists are listed.
- AC2: Given I type part of a name, then the list filters by name (case-insensitive).
- AC3: Given no doctors match, then I see "No doctors found" and an option to clear filters.

**US-04 View doctor profile** — *As a patient, I want to see a doctor's details, fee and free slots so that I can choose a time.*
- AC1: Profile shows qualifications, experience, fee and the next 14 days of availability.
- AC2: Booked and past slots are not selectable.

**US-05 Book an appointment** — *As a patient, I want to book an open slot so that my visit is confirmed.*
- AC1: Given I am logged in and select an open slot, when I confirm, then an appointment with status Booked and a reference number is created and I see the confirmation page.
- AC2: Given the slot was taken by someone else after I selected it, when I confirm, then I see "This slot is no longer available" and am asked to choose another; no appointment is created.
- AC3: Given I am not logged in, when I click Book, then I am asked to log in and returned to the booking.
- AC4: Given I already have an appointment at that same date and time, when I confirm, then booking is blocked with an explanation.

**US-06 View my appointments** — *As a patient, I want to see upcoming and past appointments so that I can manage my visits.*
- AC1: Upcoming list shows doctor, date, time, reference and status, soonest first.
- AC2: Past list shows completed, cancelled and no-show appointments.

**US-07 Cancel** — *As a patient, I want to cancel an appointment so that the slot can be used by someone else.*
- AC1: Given an upcoming appointment more than 2 hours away, when I cancel and confirm, then status becomes Cancelled and the slot becomes available to others.
- AC2: Given less than 2 hours remain, then the Cancel option is disabled with a message to call the hospital.

**US-08 Reschedule** — *As a patient, I want to move my appointment to another time so that I don't have to cancel and rebook.*
- AC1: Given an upcoming appointment, when I pick another open slot with the same doctor and confirm, then the appointment moves, the old slot is released and the reference stays the same.
- AC2: Given the new slot is no longer available on confirm, then the original appointment is unchanged and I see an error.

### Doctor

**US-09 Manage availability** — *As a doctor, I want to publish my available slots so that patients can book them.*
- AC1: Given a future date, when I add slots, then they appear as bookable on my public profile.
- AC2: When I remove an open slot, then it disappears from patient view.
- AC3: Given a slot is booked, when I try to remove it, then I am told to cancel the appointment first.
- AC4: I cannot add availability for a past date.

**US-10 View my schedule** — *As a doctor, I want to see my appointments by day so that I can prepare.*
- AC1: I see only my own appointments, with patient name, time, reason and status.

**US-11 Update appointment status** — *As a doctor, I want to mark appointments completed or cancelled so that records are accurate.*
- AC1: Given an appointment whose start time has passed, I can mark it Completed.
- AC2: Given a future appointment, "Complete" is not available.
- AC3: When I cancel, then I must give a reason, the slot is released and the patient is notified.

### Administrator

**US-12 Manage doctors** — *As an admin, I want to add and update doctors so that the directory is accurate.*
- AC1: When I add a doctor with required fields, then they appear in search.
- AC2: When I deactivate a doctor, then they no longer appear in search or accept bookings.

**US-13 Manage patients** — *As an admin, I want to view and deactivate patient accounts so that I can support patients and handle misuse.*

**US-14 Manage appointments** — *As an admin, I want to see, filter, cancel and reschedule any appointment so that I can handle phone requests.*
- AC1: I can filter by date, doctor and status.
- AC2: Cancel / reschedule follow the same availability rules as patients (BR-02, BR-03, BR-06).

**US-15 Reports** — *As an admin, I want a booking report for a date range so that management can monitor demand.*
- AC1: Report shows totals by status and by doctor for the chosen dates and can be exported to CSV.

## 9. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Usability | Responsive from 360 px width; WCAG 2.1 AA; booking in ≤ 4 screens. |
| NFR-02 | Performance | Search and slot views load in < 2 s at 200 concurrent users. |
| NFR-03 | Integrity | Slot reservation is atomic (unique constraint on doctor + slot start) to guarantee BR-02/BR-03 under concurrency. |
| NFR-04 | Security | HTTPS only; passwords hashed (bcrypt/argon2); role-based access enforced server-side; OWASP Top 10 controls; lockout after 5 failed logins. |
| NFR-05 | Privacy | Patient data processed under UK GDPR / DPA 2018; minimum data collected; doctors see only their patients' booking data. |
| NFR-06 | Audit | All appointment state changes logged with user, timestamp and old/new values; logs retained 12 months. |
| NFR-07 | Availability | 99.5% monthly uptime; daily backups. |
| NFR-08 | Time | All times stored in UTC and shown in hospital local time (Europe/London). |

## 10. Data Overview (logical)

| Entity | Key attributes |
|---|---|
| User | id, name, email, mobile, role, status, password hash |
| Patient | user id, date of birth |
| Doctor | user id, specialization, qualifications, experience, fee, languages, bio, active |
| Availability slot | doctor id, date, start time, duration, status (open / booked) |
| Appointment | id/reference, patient id, doctor id, date, start time, reason, status, created/updated, cancellation reason, history |

## 11. Gap Analysis — Missing Requirements Identified

| # | Gap in the brief | Resolution in this BRD |
|---|---|---|
| G-01 | No slot duration or working hours defined | 30-min slots, 09:00–17:00 (BR-09, FR-41) |
| G-02 | No booking horizon or past-date rule | 30 days ahead, no past slots (BR-09) |
| G-03 | No cancellation / reschedule cut-off | 2 hours before start (BR-10) |
| G-04 | Patient could double-book themselves with two doctors at the same time | Blocked (BR-11) |
| G-05 | What happens when a doctor removes availability that is already booked | Not allowed; cancel first (BR-12) |
| G-06 | Concurrency: two patients confirming the same slot simultaneously | Re-check at commit + DB unique constraint (FR-21, NFR-03) |
| G-07 | When a doctor may mark "completed" | Only after start time (BR-13) |
| G-08 | Can reschedule change doctor? | No — cancel and rebook (BR-14) |
| G-09 | Notifications not mentioned | Confirmation / cancellation notifications (FR-23) — provider TBD |
| G-10 | No password reset, session timeout or lockout | FR-07, FR-06, NFR-04 |
| G-11 | Doctor deactivation with future bookings | Warn and require handling (FR-56) |
| G-12 | No audit trail | FR-57, NFR-06 |
| G-13 | No no-show handling | No-show status (Could-have) |
| G-14 | Slot hoarding by one patient | Max 3 upcoming appointments (BR-16) |
| G-15 | Data protection obligations for health data | NFR-05, IG/DPO as stakeholder |
| G-16 | Who creates doctor/admin accounts | Admin only (FR-08) |
| G-17 | Payment / fee collection | Out of scope; fee displayed only |

## 12. Assumptions

1. The hospital operates in a single time zone (Europe/London) and a single site.
2. One appointment = one 30-minute slot = one patient with one doctor.
3. Consultation fees are paid at the hospital; no online payment in this phase.
4. Doctors keep their own availability up to date; admins can edit it on their behalf.
5. Patients book only for themselves (no family/dependant accounts in this phase).
6. Email is the unique login identifier for all roles.
7. Notification delivery (email/SMS) will be provided by an existing hospital service.
8. The assessment prototype uses mock data in the browser; data resets when the browser storage is cleared. Business rules are enforced in the front end only to demonstrate behaviour — production must enforce them server-side.

## 13. Constraints, Risks and Dependencies

| Type | Item | Mitigation |
|---|---|---|
| Risk | Doctors not maintaining availability → patients see no slots | Admin can edit availability; weekly reminder |
| Risk | Concurrent booking of same slot | Atomic reservation (NFR-03) |
| Risk | Data breach of patient data | Security controls (NFR-04), DPIA before go-live |
| Risk | Low adoption by older patients | Front-desk booking via admin role remains |
| Dependency | Notification service, hosting, identity provider | IT department |
| Constraint | Must comply with UK GDPR / DPA 2018 | IG review |

## 14. Traceability (summary)

| Business rule | Functional requirement | User story | Test cases |
|---|---|---|---|
| BR-01 | FR-03, FR-05, FR-24 | US-02, US-05 | TC-21 – TC-25 |
| BR-02 / BR-03 | FR-14, FR-21 | US-05 | TC-04 – TC-08 |
| BR-04 / BR-09 | FR-14, FR-20 | US-05 | TC-09 – TC-12 |
| BR-05 / BR-10 | FR-31, FR-33 | US-07 | TC-13 – TC-16 |
| BR-06 / BR-14 | FR-32 | US-08 | TC-17 – TC-20 |
| BR-07 | FR-46 | US-10 | TC-24 |
| BR-08 | FR-50 – FR-55 | US-12 – US-15 | TC-26, TC-33 – TC-35 |
| BR-11 | FR-25 | US-05 | TC-07 |
| BR-12 / BR-13 | FR-41 – FR-45 | US-09, US-11 | TC-27 – TC-32 |

## 15. Approval

| Name | Role | Signature | Date |
|---|---|---|---|
| | Hospital Operations Manager (Sponsor) | | |
| | Head of IT | | |
| | Clinical Lead | | |
| | Data Protection Officer | | |
