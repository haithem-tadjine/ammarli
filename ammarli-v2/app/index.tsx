// Auth gate — redirects to splash (which handles all auth logic)
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/splash" />;
}
