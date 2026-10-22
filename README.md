# PMIST Real-Time Bus Tracker — Shift I

This package contains the student map and driver GPS page. It is **not ready for live tracking until Firebase Authentication, the database rules, and HTTPS hosting are configured**. No default driver password is built into the project.

The JavaScript module error is fixed: the student page now loads `student.js` as a module, and both pages use the modular Firebase configuration. Driver and student pages now use the same `locations/<busId>` path with `lat`, `lng`, and `updatedAt` fields.

## Important: use one Firebase project consistently

Your latest screenshot shows the Realtime Database for project ID `pmist-bus-tracker-ec6a1` and database URL:

`https://pmist-bus-tracker-ec6a1-default-rtdb.asia-southeast1.firebasedatabase.app`

An earlier screenshot showed a different project named `pmist-smart-bus`. Do not mix their configuration values. These files are set up to use `pmist-bus-tracker-ec6a1`.

## 1. Get the correct Web App config

1. Open Firebase Console and select **PMIST-Bus-Tracker** (project ID `pmist-bus-tracker-ec6a1`).
2. Open **Project settings > General > Your apps**.
3. If there is no Web App, tap `</>` to register one.
4. Copy the Web App config from THIS project.
5. Open `firebase-config.js` and replace:
   - `PASTE_API_KEY_FROM_PMIST_BUS_TRACKER_WEB_APP`
   - `PASTE_STORAGE_BUCKET_FROM_SAME_WEB_APP`
   - `PASTE_MESSAGING_SENDER_ID_FROM_SAME_WEB_APP`
   - `PASTE_APP_ID_FROM_SAME_WEB_APP`
   Keep `databaseURL` and `projectId` as shown unless your console shows a different actual value.
6. Save the file.

## 2. Enable driver email/password login

1. Firebase Console > **Authentication** > **Sign-in method**.
2. Enable **Email/Password** and save.
3. Open **Users > Add user**.
4. Create a driver account using an email you control and a strong password. There is no default password.
5. If you use an email other than `pmistdr1@gmail.com`, update `PMIST_ALLOWED_DRIVER_EMAILS` in `firebase-config.js`.

## 3. Configure Realtime Database security

Open **Realtime Database > Rules**. Use the rules in `database.rules.json`, then click **Publish**.

Then approve each driver:
1. Authentication > Users > copy the driver's **UID**.
2. Realtime Database > Data, add a boolean value `true` at:
   `approvedDrivers/DRIVER_UID`
   Replace `DRIVER_UID` with the actual UID (not the email).
3. Do not make database writes public.

The included rules allow public reads of `locations` so students can see bus positions, while driver writes require an authenticated UID approved under `approvedDrivers`. Only use public location reads if the college has approved public sharing of bus locations. Do not store personal details in location records.

## 4. Host and test

1. Serve/host this folder over HTTPS (Firebase Hosting or another HTTPS static host). Opening `file://` directly can cause browser/GPS problems.
2. Open `driver.html` on the authorized driver's phone.
3. Sign in, choose the assigned bus, allow location permission, and tap **Start GPS tracking**.
4. Keep the page active while testing; mobile browsers may pause GPS in the background.
5. Open `index.html` on a student's device and check for the live marker.

## Troubleshooting

- **“Firebase is not configured”**: at least one placeholder in `firebase-config.js` is still present. Fill in all Web App config values from the same project.
- **“auth/invalid-credential”**: confirm the account exists in Authentication and the password is correct.
- **“This email is not listed as an approved driver”**: add the exact email to `PMIST_ALLOWED_DRIVER_EMAILS`.
- **Permission denied while sending GPS**: confirm the driver's UID has `approvedDrivers/UID = true`, and the published database rules match `database.rules.json`.
- **GPS error / location permission**: allow location access and test on HTTPS; enable phone location services.

## Files

- `index.html` — student live map
- `driver.html` — driver login and GPS sharing
- `firebase-config.js` — Firebase web config and allowed driver emails
- `routes.js` — Shift I route labels
- `student.js` / `driver.js` — map updates and GPS publishing
- `database.rules.json` — suggested database rules

The project uses real phone GPS. It does not generate fake locations, road-snapped routes, or ETAs. Verify route IDs/times and obtain college/driver permission before real use.
