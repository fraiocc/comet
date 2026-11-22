import { getTranslations } from "next-intl/server";

import { ChangelogFeed, type ChangelogRelease } from "@/components/ChangelogFeed";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getSessionUser } from "@/lib/auth";

export default async function ChangelogPage() {
  const t = await getTranslations("changelog");
  const user = await getSessionUser();

  const releases: ChangelogRelease[] = [
    {
      id: "web-0-2-0",
      product: "web",
      version: t("w2Version"),
      date: t("w2Date"),
      month: t("w2Month"),
      year: t("w2Year"),
      title: t("w2Title"),
      summary: t("w2Summary"),
      features: [
        { title: t("w2Feat1Title"), desc: t("w2Feat1Desc") },
        { title: t("w2Feat2Title"), desc: t("w2Feat2Desc") },
      ],
    },
    {
      id: "cli-0-2-0",
      product: "cli",
      version: t("c2Version"),
      date: t("c2Date"),
      month: t("c2Month"),
      year: t("c2Year"),
      title: t("c2Title"),
      summary: t("c2Summary"),
      features: [
        { title: t("c2Feat1Title"), desc: t("c2Feat1Desc") },
        { title: t("c2Feat2Title"), desc: t("c2Feat2Desc") },
      ],
    },
    {
      id: "cli-0-1-0",
      product: "cli",
      version: t("c1Version"),
      date: t("c1Date"),
      month: t("c1Month"),
      year: t("c1Year"),
      title: t("c1Title"),
      summary: t("c1Summary"),
      features: [
        { title: t("c1Feat1Title"), desc: t("c1Feat1Desc") },
        { title: t("c1Feat2Title"), desc: t("c1Feat2Desc") },
      ],
    },
    {
      id: "web-0-1-0",
      product: "web",
      version: t("w1Version"),
      date: t("w1Date"),
      month: t("w1Month"),
      year: t("w1Year"),
      title: t("w1Title"),
      summary: t("w1Summary"),
      features: [
        { title: t("w1Feat1Title"), desc: t("w1Feat1Desc") },
        { title: t("w1Feat2Title"), desc: t("w1Feat2Desc") },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar username={user?.username} />

      <main className="mx-auto max-w-5xl px-6 pb-8 pt-16 sm:px-8 sm:pt-20">
        <ChangelogFeed releases={releases} />
      </main>

      <Footer />
    </div>
  );
}
