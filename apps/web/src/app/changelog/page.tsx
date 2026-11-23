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
      id: "web-0-4-2",
      product: "web",
      version: t("w6Version"),
      date: t("w6Date"),
      month: t("w6Month"),
      year: t("w6Year"),
      title: t("w6Title"),
      summary: t("w6Summary"),
      features: [
        { title: t("w6Feat1Title"), desc: t("w6Feat1Desc") },
        { title: t("w6Feat2Title"), desc: t("w6Feat2Desc") },
      ],
    },
    {
      id: "cli-0-4-2",
      product: "cli",
      version: t("c6Version"),
      date: t("c6Date"),
      month: t("c6Month"),
      year: t("c6Year"),
      title: t("c6Title"),
      summary: t("c6Summary"),
      features: [
        { title: t("c6Feat1Title"), desc: t("c6Feat1Desc") },
        { title: t("c6Feat2Title"), desc: t("c6Feat2Desc") },
      ],
    },
    {
      id: "web-0-4-1",
      product: "web",
      version: t("w5Version"),
      date: t("w5Date"),
      month: t("w5Month"),
      year: t("w5Year"),
      title: t("w5Title"),
      summary: t("w5Summary"),
      features: [
        { title: t("w5Feat1Title"), desc: t("w5Feat1Desc") },
        { title: t("w5Feat2Title"), desc: t("w5Feat2Desc") },
      ],
    },
    {
      id: "cli-0-4-1",
      product: "cli",
      version: t("c5Version"),
      date: t("c5Date"),
      month: t("c5Month"),
      year: t("c5Year"),
      title: t("c5Title"),
      summary: t("c5Summary"),
      features: [
        { title: t("c5Feat1Title"), desc: t("c5Feat1Desc") },
        { title: t("c5Feat2Title"), desc: t("c5Feat2Desc") },
      ],
    },
    {
      id: "web-0-4-0",
      product: "web",
      version: t("w4Version"),
      date: t("w4Date"),
      month: t("w4Month"),
      year: t("w4Year"),
      title: t("w4Title"),
      summary: t("w4Summary"),
      features: [
        { title: t("w4Feat1Title"), desc: t("w4Feat1Desc") },
        { title: t("w4Feat2Title"), desc: t("w4Feat2Desc") },
      ],
    },
    {
      id: "cli-0-4-0",
      product: "cli",
      version: t("c4Version"),
      date: t("c4Date"),
      month: t("c4Month"),
      year: t("c4Year"),
      title: t("c4Title"),
      summary: t("c4Summary"),
      features: [
        { title: t("c4Feat1Title"), desc: t("c4Feat1Desc") },
        { title: t("c4Feat2Title"), desc: t("c4Feat2Desc") },
      ],
    },
    {
      id: "web-0-3-0",
      product: "web",
      version: t("w3Version"),
      date: t("w3Date"),
      month: t("w3Month"),
      year: t("w3Year"),
      title: t("w3Title"),
      summary: t("w3Summary"),
      features: [
        { title: t("w3Feat1Title"), desc: t("w3Feat1Desc") },
        { title: t("w3Feat2Title"), desc: t("w3Feat2Desc") },
      ],
    },
    {
      id: "cli-0-3-0",
      product: "cli",
      version: t("c3Version"),
      date: t("c3Date"),
      month: t("c3Month"),
      year: t("c3Year"),
      title: t("c3Title"),
      summary: t("c3Summary"),
      features: [
        { title: t("c3Feat1Title"), desc: t("c3Feat1Desc") },
        { title: t("c3Feat2Title"), desc: t("c3Feat2Desc") },
      ],
    },
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
