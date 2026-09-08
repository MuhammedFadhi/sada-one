# SA'DA ONE — Add staff & get their temporary credentials

Two steps. About five minutes.

---

## Step 1 · Add the people

Supabase → **SQL Editor** → paste **`supabase/migrations/037_staff_import.sql`** → **Run**.

- Adds the 10 business units as divisions
- Adds **45 people** (50 on the sheet, 5 already in the system)
- Minimal record each — name, job title, email, mobile, iqama. They fill in the rest themselves.
- Also repairs schema drift: `iqama_number`, `passport_number`, `emergency_contact` were missing from the live table and the onboarding wizard writes all three.

Then run **`supabase/migrations/038_full_self_service.sql`** as well — it lets staff fill in their own employment details (the earlier rules blocked them from setting job title, division, join date or contract).

Both are safe to re-run.

**Skipped as duplicates:** Muhammed Fadhil · Muhammed Ali Hussain · Khan Mazhar · **Nahan** · Syed Khalid
Nahan is caught by *mobile number*, not email — his sheet address differs from the one already on file.

**No email on the sheet?** Not a problem. Zeeshan gets a generated sign-in address (`zeeshan.sg0016@sadawater.com`) so he still receives credentials like everyone else, and can change it to his real address inside the wizard.

---

## Step 2 · Create accounts and collect the credentials

Sign in to the live app as **admin**, press **F12** → **Console**, paste this, press Enter:

```js
(async () => {
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzamNtaXR4b3V6d3RsanJsdWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODA5NzMsImV4cCI6MjA5Nzk1Njk3M30.pEL3-rvuwbBLC1_xfj6qXiY60kiup7KQWysReTfhNH4';
  const tk  = Object.keys(localStorage).find(k => k.includes('auth-token'));
  const tok = JSON.parse(localStorage.getItem(tk)).access_token;
  const H   = { apikey: ANON, Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
  const REST = 'https://psjcmitxouzwtljrlucv.supabase.co/rest/v1';
  const FN   = 'https://psjcmitxouzwtljrlucv.supabase.co/functions/v1';

  const emps  = await (await fetch(`${REST}/employees?select=id,full_name_en,work_email&order=full_name_en`, { headers: H })).json();
  const profs = await (await fetch(`${REST}/user_profiles?select=employee_id`, { headers: H })).json();
  const has   = new Set(profs.map(p => p.employee_id));
  const todo  = emps.filter(e => !has.has(e.id) && e.work_email);

  console.log(`Creating ${todo.length} accounts...`);
  const out = [];
  for (const e of todo) {
    let j = {};
    try {
      const r = await fetch(`${FN}/create-employee-account`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ employee_id: e.id, email: e.work_email, role: 'employee' }),
      });
      j = await r.json().catch(() => ({}));
    } catch (err) { j = { error: String(err) }; }
    out.push({ name: e.full_name_en, email: e.work_email, password: j.temp_password ?? '', result: j.error ?? 'OK' });
    console.log(`${out.length}/${todo.length}  ${e.full_name_en}  ${j.error ?? 'OK'}`);
    await new Promise(s => setTimeout(s, 400));
  }

  console.table(out);
  console.log('\n===== COPY EVERYTHING BELOW =====\n' +
    ['Name,Email,TempPassword,Result']
      .concat(out.map(o => `"${o.name}","${o.email}","${o.password}","${o.result}"`)).join('\n'));
  window.__accounts = out;
})();
```

It prints a **CSV of names, emails and temporary passwords** — your handout list — plus a live progress line per person.

Everyone is created as **employee**. Promote anyone later from Admin → Users → *person* → Role & Permissions.

> Copy the CSV before closing the console; passwords are shown once. If one is lost, an admin can reset that person's password from their user page.

---

## What each person does

Signs in with the email + temporary password you hand them, and lands in a **4-step wizard** where they enter their entire record:

| Step | They enter |
|---|---|
| **Sign-in** | Their own email (username) and password |
| **About you** | Name in English and Arabic, mobile, date of birth, gender, nationality |
| **Documents** | Iqama / ID number and expiry, passport number and expiry, emergency contact |
| **Your role** | Job title (EN/AR), company / division, department, joining date, contract type |

Nothing is pre-filled by you beyond what was on the sheet, and the wizard tells them anything can be corrected later.

## Admins can edit all of it afterwards

**Admin → Users → *person* → Employee Details → Edit** now covers every field staff enter: employee number, both names, both job titles, work email, mobile, date of birth, gender, nationality, iqama number and expiry, passport number and expiry, emergency contact, joining date, contract type and end date, employment status, company, division, department and manager.

Five fields remain server-controlled so staff can't change them on their own record — employee number, employment status, company, manager and work schedule. Admins can still edit all of those; the restriction only applies to someone editing their own row.

---

## Worth knowing

- **Join dates** aren't on the sheet, so everyone is imported with today's date. End-of-service calculations depend on this.
- **Two people share iqama `2570585048`** (Arsalanjaved Mughal Javed Ahmed, Faisal Mahmood Younas). Both imported; one is wrong on the sheet.
- **Asif Sayed** has no designation on the sheet, so his job title is `Staff`.
- Password-reset emails won't reach Zeeshan's generated address until he changes it to a real one.
