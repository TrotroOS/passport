import { UserHelpView } from "@/components/help/user-help-view";
import { createClient } from "@/lib/supabase/server";

export default async function HelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <UserHelpView showFeedback={Boolean(user)} />;
}
