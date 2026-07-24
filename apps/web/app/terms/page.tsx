import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return <LegalPage title="Terms of Service" updated="July 24, 2026">
    <LegalSection title="Service"><p>OfferOS is a technical recruiting organization and practice tool. It helps users track applications, manage resumes, prepare for interviews, and review AI-generated guidance.</p></LegalSection>
    <LegalSection title="Acceptable use"><p>Do not use OfferOS to violate law, impersonate another person, attack service infrastructure, submit content you do not have permission to use, or attempt to obtain another user&apos;s data.</p></LegalSection>
    <LegalSection title="AI limitations"><p>AI-generated resume feedback, fit scores, prep plans, drafts, and mock-interview assessments are heuristic guidance. They are not hiring predictions, employment guarantees, legal advice, recruiter approval, or proof that a resume will pass an applicant tracking system.</p></LegalSection>
    <LegalSection title="Your content"><p>You retain responsibility for and ownership of the recruiting content you enter. You grant OfferOS permission to process that content only as needed to provide requested features and operate the service.</p></LegalSection>
    <LegalSection title="Availability"><p>This is an early-stage service. Features may change and availability is not guaranteed. You are responsible for reviewing important deadlines and keeping independent copies of information you cannot afford to lose.</p></LegalSection>
    <LegalSection title="Termination and liability"><p>You may stop using OfferOS and delete your account at any time. OfferOS may restrict abusive use or operation that threatens the service. To the extent permitted by applicable law, the service is provided without guarantees of recruiting outcomes and liability is limited to losses directly caused by operating the service.</p></LegalSection>
  </LegalPage>;
}
