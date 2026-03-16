import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import type { ChannelDraft, OutreachTemplateItem } from "@/lib/channel-types";

type TemplateRow = {
  id: string;
  name: string;
  basePrompt: string;
  baseMailText: string;
  createdAt: Date;
  updatedAt: Date;
};

type DraftRow = {
  id: string;
  channelId: string | null;
  channelTitle: string;
  email: string | null;
  subject: string;
  body: string;
  status: string;
  sourceType: string;
  templateId: string | null;
  customPoint: string | null;
  rationale: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OutreachTemplateInput = {
  name: string;
  basePrompt: string;
  baseMailText: string;
};

export type OutreachDraftInput = {
  channelId?: string | null;
  channelTitle: string;
  email?: string | null;
  subject: string;
  body: string;
  status?: "draft" | "reviewed" | "ready_to_send";
  sourceType: string;
  templateId?: string | null;
  customPoint?: string;
  rationale?: string;
};

function serializeTemplate(row: TemplateRow): OutreachTemplateItem {
  return {
    id: row.id,
    name: row.name,
    basePrompt: row.basePrompt,
    baseMailText: row.baseMailText,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeDraft(row: DraftRow): ChannelDraft {
  return {
    id: row.id,
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    email: row.email,
    subject: row.subject,
    body: row.body,
    status: row.status as ChannelDraft["status"],
    sourceType: row.sourceType,
    templateId: row.templateId,
    customPoint: row.customPoint || "",
    rationale: row.rationale || "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureDefaultTemplate() {
  const count = await prisma.outreachTemplate.count();
  if (count > 0) {
    return;
  }

  const settings = await getAppSettings();

  await prisma.outreachTemplate.create({
    data: {
      name: "標準テンプレート",
      basePrompt:
        "YouTubeチャンネル向けの営業メールを、失礼にならない丁寧な日本語で個別最適化してください。相手のチャンネル名、説明文、カテゴリ、地域、連絡先情報を踏まえて、このチャンネルをきちんと見た印象が伝わる文章にしてください。",
      baseMailText: [
        `サービス名: ${settings.serviceName}`,
        `サービス説明: ${settings.serviceDescription}`,
        `提案したい内容: ${settings.defaultPitch}`,
        "トーン: 丁寧で自然、突然送られても不快感の少ない営業文面",
      ].join("\n"),
    },
  });
}

export async function getOutreachTemplates() {
  await ensureDefaultTemplate();

  const rows = await prisma.outreachTemplate.findMany({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return rows.map(serializeTemplate);
}

export async function getOutreachTemplateById(id: string) {
  await ensureDefaultTemplate();

  const row = await prisma.outreachTemplate.findUnique({
    where: { id },
  });

  return row ? serializeTemplate(row) : null;
}

export async function createOutreachTemplate(input: OutreachTemplateInput) {
  const row = await prisma.outreachTemplate.create({
    data: input,
  });

  return serializeTemplate(row);
}

export async function updateOutreachTemplate(id: string, input: OutreachTemplateInput) {
  const row = await prisma.outreachTemplate.update({
    where: { id },
    data: input,
  });

  return serializeTemplate(row);
}

export async function saveOutreachDraft(input: OutreachDraftInput) {
  const row = await prisma.outreachDraft.create({
    data: {
      channelId: input.channelId || null,
      channelTitle: input.channelTitle,
      email: input.email || null,
      subject: input.subject,
      body: input.body,
      status: input.status || "draft",
      sourceType: input.sourceType,
      templateId: input.templateId || null,
      customPoint: input.customPoint || "",
      rationale: input.rationale || "",
    },
  });

  return serializeDraft(row);
}

export async function saveOutreachDraftBatch(items: OutreachDraftInput[]) {
  const drafts: ChannelDraft[] = [];
  const errors: Array<{ channelTitle: string; email?: string | null; error: string }> = [];

  for (const item of items) {
    try {
      const row = await prisma.outreachDraft.create({
        data: {
          channelId: item.channelId || null,
          channelTitle: item.channelTitle,
          email: item.email || null,
          subject: item.subject,
          body: item.body,
          status: item.status || "draft",
          sourceType: item.sourceType,
          templateId: item.templateId || null,
          customPoint: item.customPoint || "",
          rationale: item.rationale || "",
        },
      });

      drafts.push(serializeDraft(row));
    } catch (error) {
      errors.push({
        channelTitle: item.channelTitle,
        email: item.email || null,
        error: error instanceof Error ? error.message : "下書き保存に失敗しました。",
      });
    }
  }

  return { drafts, errors };
}
