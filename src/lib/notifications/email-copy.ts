const COLLABORATOR_ROLE_LABELS: Record<string, string> = {
  viewer: "Viewer — view shipment details and comments",
  commenter: "Commenter — view, comment, and upload documents",
  editor: "Editor — full collaboration, including broker readiness confirmation",
};

export function formatCollaboratorRoleForEmail(role: string): string {
  return COLLABORATOR_ROLE_LABELS[role] ?? role;
}

export function emailSubjectHeading(subject: string): string {
  return subject.replace(/^Passport\s*[:\u2014-]\s*/i, "").trim();
}

export const TRANSACTIONAL_EMAIL_FOOTER =
  "Passport provides assistive trade compliance tools. Outputs are not legal, customs, or tax advice. For binding decisions, consult qualified counsel or your licensed customs broker.";

export const TRANSACTIONAL_EMAIL_SIGNOFF = "Passport Trade Compliance";
