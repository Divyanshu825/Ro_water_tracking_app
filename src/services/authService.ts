import { AuthUser, MockAccount } from '../store/authSlice';

/**
 * Mock auth API. Every function is async and returns the same shapes a real backend client would,
 * so swapping in fetch()/axios calls later only touches this file.
 */
const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms));

export async function login(accounts: MockAccount[], email: string, password: string): Promise<AuthUser> {
  await wait();
  const acc = accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!acc || acc.password !== password) throw new Error('Incorrect email or password');
  const { password: _p, ...user } = acc;
  return user;
}

export async function register(accounts: MockAccount[], v: { name: string; email: string; business: string; password: string }): Promise<MockAccount> {
  await wait();
  if (accounts.some((a) => a.email.toLowerCase() === v.email.trim().toLowerCase())) throw new Error('An account with this email already exists');
  return { id: `u_${Date.now()}`, name: v.name.trim(), email: v.email.trim().toLowerCase(), business: v.business.trim(), password: v.password };
}

export async function requestPasswordReset(accounts: MockAccount[], email: string): Promise<void> {
  await wait();
  if (!accounts.some((a) => a.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('No account found with this email');
}
