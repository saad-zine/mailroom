/** Demo access: any credentials open the workspace. */
const KEY = 'mailroom_demo_session';

export function signInDemo() {
  localStorage.setItem(KEY, '1');
}

export function signOutDemo() {
  localStorage.removeItem(KEY);
}

export function isDemoSignedIn() {
  return localStorage.getItem(KEY) === '1';
}
