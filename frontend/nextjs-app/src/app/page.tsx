import { redirect } from 'next/navigation';

// Root redirects to /tasks; middleware will redirect to /login if unauthenticated
export default function RootPage() {
  redirect('/tasks');
}
