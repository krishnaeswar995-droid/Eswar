# User flows

Flow diagrams are written in Mermaid (rendered automatically by GitHub below) with PNG exports alongside. Business-rule IDs (BR-xx) refer to [BRD section 7](../BRD.md#7-business-rules).

| Flow | Source | Image |
|---|---|---|
| Patient: search → book → confirm → cancel / reschedule | [patient-booking.mmd](patient-booking.mmd) | [patient-booking.png](patient-booking.png) |
| Doctor: schedule, availability, profile | [doctor.mmd](doctor.mmd) | [doctor.png](doctor.png) |
| Administrator: appointments, doctors, patients, reports | [admin.mmd](admin.mmd) | [admin.png](admin.png) |
| Role-based access check on every page | [rbac.mmd](rbac.mmd) | [rbac.png](rbac.png) |

## 1. Patient booking journey

```mermaid
flowchart TD
    A([Patient opens site]) --> B[Search doctors<br/>filter by specialization / name]
    B --> C{Doctors found?}
    C -- No --> B1[No doctors found<br/>Clear filters] --> B
    C -- Yes --> D[View doctor profile<br/>fee, experience, 30-day slots]
    D --> E[Select date and open slot]
    E --> F{Logged in as patient?}
    F -- No --> G{Has account?}
    G -- No --> G1[Register] --> H
    G -- Yes --> G2[Log in] --> H
    F -- Yes --> H[Review and confirm<br/>add reason for visit]
    H --> I{Re-check slot at confirm<br/>BR-02/03/04/09/11/16}
    I -- Slot taken / invalid --> I1[Error: choose another time] --> E
    I -- Valid --> J[(Appointment created<br/>status = Booked, ref APT-xxxx)]
    J --> K[Confirmation page<br/>+ email/SMS notification]
    K --> L[Patient dashboard<br/>Upcoming / Past]
    L --> M{Action}
    M -- Cancel --> N{More than 2h before start?<br/>BR-10}
    N -- No --> N1[Disabled: call hospital]
    N -- Yes --> N2[Confirm cancel] --> N3[(Status = Cancelled<br/>slot released BR-05)] --> L
    M -- Reschedule --> R{More than 2h before start?}
    R -- No --> N1
    R -- Yes --> R1[Pick new open slot<br/>same doctor BR-14]
    R1 --> R2{New slot still free?<br/>BR-06}
    R2 -- No --> R3[Error, original kept] --> R1
    R2 -- Yes --> R4[(Moved: old slot released,<br/>new slot reserved)] --> K
```

## 2. Doctor

```mermaid
flowchart TD
    A([Doctor logs in]) --> B[Doctor dashboard - Schedule<br/>own appointments only BR-07]
    B --> C{Choose}
    C -- Schedule --> D[Select day]
    D --> E{Appointment action}
    E -- Mark completed --> E1{Start time passed?<br/>BR-13}
    E1 -- No --> E2[Button disabled]
    E1 -- Yes --> E3[(Status = Completed)]
    E -- Cancel --> E4[Enter reason] --> E5[(Status = Cancelled<br/>patient notified, slot released)]
    C -- Availability --> F[Select date up to 30 days ahead]
    F --> G{Click a time}
    G -- Not published --> G1{Future, on the half hour,<br/>09:00-16:30? BR-09}
    G1 -- No --> G2[Error message]
    G1 -- Yes --> G3[(Slot published - bookable)]
    G -- Open slot --> G4[(Slot removed)]
    G -- Booked slot --> G5[Blocked: cancel the<br/>appointment first BR-12]
    C -- Profile --> H[Edit bio, qualifications,<br/>languages, experience]
    H --> H1[(Saved - visible to patients)]
```

## 3. Administrator

```mermaid
flowchart TD
    A([Admin logs in]) --> B[Overview<br/>today's totals, bookings per doctor, activity log]
    B --> C{Section}
    C -- Appointments --> D[Filter by date, doctor, status, patient]
    D --> D1{Action}
    D1 -- Reschedule --> D2[Pick open slot same doctor] --> D3[(Moved, old slot released)]
    D1 -- Cancel --> D4[Enter reason] --> D5[(Cancelled, slot released)]
    C -- Doctors --> E{Action}
    E -- Add --> E1[Name, email, specialization,<br/>fee, qualifications] --> E2[(Doctor + login created)]
    E -- Edit --> E3[(Profile, fee, specialization updated)]
    E -- Deactivate --> E4{Has upcoming bookings?}
    E4 -- Yes --> E5[Warn with count] --> E6
    E4 -- No --> E6[(Hidden from search,<br/>no new bookings BR-15)]
    C -- Patients --> F[Deactivate / reactivate account]
    C -- Reports --> G[Choose date range] --> G1[Totals by status and doctor] --> G2[Export CSV]
```

## 4. Role-based access

```mermaid
flowchart LR
    U([Any page request]) --> A{Logged in?}
    A -- No --> P{Public page?<br/>home, doctors, profile, login, register}
    P -- Yes --> OK[Show page]
    P -- No --> L[Redirect to login<br/>then back to the page]
    A -- Yes --> R{Role allowed?<br/>patient / doctor / admin}
    R -- Yes --> OK
    R -- No --> H[Redirect to own dashboard<br/>'You do not have access']
```

## Appointment status lifecycle

```mermaid
stateDiagram-v2
    [*] --> Booked: Patient confirms booking
    Booked --> Booked: Rescheduled (same doctor, new free slot)
    Booked --> Cancelled: Patient (≥2h before) / doctor / admin
    Booked --> Completed: Doctor, after start time
    Cancelled --> [*]
    Completed --> [*]
```
