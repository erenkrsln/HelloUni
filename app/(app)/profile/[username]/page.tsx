import { ProfileClient } from "./profile-client";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // Client-Side Rendering für sofortige Navigation
  // Posts-Daten werden bereits im Layout geladen und im Context gespeichert
  return <ProfileClient username={username} />;
}

