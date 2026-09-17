import { randomBytes } from 'crypto';

// Shared by every "provision a real login for someone" flow (promoting a
// sales lead to a customer account, admin creating a sales team member) so
// they hand back credentials in the same format.
export function generateTempPassword(): string {
  return randomBytes(9).toString('base64url');
}
