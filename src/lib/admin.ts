// Accounts that always have admin rights. Keep in sync with isAdmin() in
// firestore.rules and storage.rules — the rules are what actually enforce it.
export const ADMIN_EMAILS = ['ismael.hadzic17@gmail.com', 'brunovujcec6@gmail.com'];

export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());
