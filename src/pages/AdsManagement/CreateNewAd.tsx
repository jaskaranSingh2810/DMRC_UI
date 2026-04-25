import { useLocation } from "react-router-dom";
import type { Ad } from "@/types";
import AdCampaignWizard from "./AdCampaignWizard";

interface LocationState {
  ad?: Ad;
}

export default function CreateNewAd() {
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  return <AdCampaignWizard initialAd={locationState?.ad ?? null} />;
}
