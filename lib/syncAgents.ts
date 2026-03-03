import { supabase } from "./supabase";
import { PARTNERS } from "./partners";

// Module-level cache: disc → Supabase agent UUID
const agentUuids = new Map<string, string>();
let synced = false;

export async function syncAgents(): Promise<void> {
  if (synced) return;
  try {
    for (const partner of PARTNERS) {
      if (!partner.agentId) continue; // skip if agent ID not configured yet
      const { data } = await supabase
        .from("agents")
        .upsert(
          {
            elevenlabs_agent_id: partner.agentId,
            name: partner.name,
            disc_profile: partner.disc,
            color: partner.color,
            emoji: partner.emoji,
            label: partner.label,
            description: partner.description,
            voice_id: partner.voiceId,
            is_active: true,
          },
          { onConflict: "elevenlabs_agent_id" }
        )
        .select("id, disc_profile")
        .single();

      if (data) {
        agentUuids.set(data.disc_profile, data.id);
      }
    }
    synced = true;
  } catch (err) {
    console.error("syncAgents failed:", err);
  }
}

export function getAgentUuid(disc: string): string | undefined {
  return agentUuids.get(disc);
}
