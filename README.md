# GeTs RFI Control — MVP

Static web app prototype for Request for Information (RFI) control.

## Included
- RFI Register dashboard
- New/Edit RFI form
- Auto RFI numbering: `GETS-[PROJECT]-RFI-001`
- Workflow statuses: Draft, Open, Pending Response, Answered, Closed, Cancelled
- Due date + overdue indicator
- Discipline, phase, priority, impact tracking
- Response and closure fields
- Related task/milestone and drawing revision fields
- Print / Save PDF from RFI detail
- CSV export
- Local browser storage for MVP testing

## Run locally
Open `index.html` in a browser, or use any static local server.

## Deploy to Vercel
Upload this folder/repository to Vercel as a static project. No build command is required.

## Next production step
Replace localStorage with Supabase tables and add authentication / role permissions, audit log, attachment upload, and link to the main GeTs Project Control database.
