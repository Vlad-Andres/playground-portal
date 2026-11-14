import { getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal/LegalPage";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: `${t("terms.title")} · Study with AI` };
}

export default function TermsPage() {
  return <LegalPage page="terms" />;
}
