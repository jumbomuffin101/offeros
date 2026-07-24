import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="July 24, 2026">
    <LegalSection title="What OfferOS stores"><p>OfferOS stores account profile data, applications, recruiting events, resume metadata and extracted text, job descriptions, prep records, interview answers, settings, and product activity you choose to create. Local mode stores workspace records in your browser. API mode stores user-scoped records in the configured OfferOS database.</p></LegalSection>
    <LegalSection title="AI processing"><p>When you run an AI feature in API mode, the relevant resume text, job description, application context, prompt, or interview answer is sent from the OfferOS backend to the configured AI provider. OfferOS does not expose provider keys to the browser. AI output can be incomplete or inaccurate and should be reviewed.</p></LegalSection>
    <LegalSection title="Service providers"><p>OfferOS currently relies on Clerk for authentication, Vercel and Render for application hosting, Neon for database infrastructure, and OpenRouter when AI features are configured. Each provider processes information under its own terms and policies.</p></LegalSection>
    <LegalSection title="Retention and deletion"><p>Workspace data remains until you delete individual records, reset the workspace, or delete the account. Account deletion removes OfferOS database records and requests deletion of the signed-in Clerk account. Temporary resume upload bytes are processed for extraction and are not retained by OfferOS in this release.</p></LegalSection>
    <LegalSection title="Cookies and diagnostics"><p>Authentication providers may use cookies required to keep you signed in. OfferOS may collect operational error and performance diagnostics when monitoring is configured. Sensitive request bodies, authorization headers, resume text, job descriptions, and interview answers are excluded from structured request logs.</p></LegalSection>
    <LegalSection title="Your choices"><p>You can export workspace data from Settings, clear individual workspace areas, switch to local mode in a self-hosted environment, or delete your account. Product questions or privacy requests can be sent through the project support channel listed in the repository documentation.</p></LegalSection>
  </LegalPage>;
}
