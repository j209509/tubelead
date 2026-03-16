import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import type { ChannelDraft, OutreachTemplateItem } from "@/lib/channel-types";
import type { EmailDraftUpdateInput } from "@/lib/schemas";

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
  personalizationPoints: string | null;
  usedChannelSignals: string | null;
  confidenceNote: string | null;
  gmailDraftId: string | null;
  gmailSaveStatus: string;
  gmailSavedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  template?: {
    name: string;
  } | null;
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
  personalizationPoints?: string;
  usedChannelSignals?: string[];
  confidenceNote?: string;
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
    templateName: row.template?.name || null,
    customPoint: row.customPoint || "",
    rationale: row.rationale || "",
    personalizationPoints: row.personalizationPoints || "",
    usedChannelSignals: row.usedChannelSignals ? JSON.parse(row.usedChannelSignals) : [],
    confidenceNote: row.confidenceNote || "",
    gmailDraftId: row.gmailDraftId,
    gmailSaveStatus: row.gmailSaveStatus as ChannelDraft["gmailSaveStatus"],
    gmailSavedAt: row.gmailSavedAt ? row.gmailSavedAt.toISOString() : null,
    errorMessage: row.errorMessage,
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
        "YouTubeチャンネル運営者向けの営業メールを、失礼にならない丁寧な日本語で個別最適化してください。チャンネル名、説明文、カテゴリ、地域、登録者数、動画数などの公開情報を踏まえて、そのチャンネルを見た印象が伝わる自然な文面にしてください。",
      baseMailText: [
        `サービス名: ${settings.serviceName}`,
        `サービス説明: ${settings.serviceDescription}`,
        `提案したい内容: ${settings.defaultPitch}`,
        "トーン: 丁寧で自然、唐突に見えない営業メール",
      ].join("\n"),
    },
  });
}

function buildDraftCreateData(input: OutreachDraftInput) {
  return {
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
    personalizationPoints: input.personalizationPoints || input.customPoint || "",
    usedChannelSignals: JSON.stringify(input.usedChannelSignals || []),
    confidenceNote: input.confidenceNote || input.rationale || "",
  };
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

export async function getOutreachDrafts() {
  const rows = await prisma.outreachDraft.findMany({
    include: {
      template: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return rows.map(serializeDraft);
}

export async function getOutreachDraftById(id: string) {
  const row = await prisma.outreachDraft.findUnique({
    where: { id },
    include: {
      template: {
        select: {
          name: true,
        },
      },
    },
  });

  return row ? serializeDraft(row) : null;
}

export async function saveOutreachDraft(input: OutreachDraftInput) {
  const row = await prisma.outreachDraft.create({
    data: buildDraftCreateData(input),
    include: {
      template: {
        select: {
          name: true,
        },
      },
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
        data: buildDraftCreateData(item),
        include: {
          template: {
            select: {
              name: true,
            },
          },
        },
      });

      drafts.push(serializeDraft(row));
    } catch (error) {
      errors.push({
        channelTitle: item.channelTitle,
        email: item.email || null,
        error: error instanceof Error ? error.message : "下書きの保存に失敗しました。",
      });
    }
  }

  return { drafts, errors };
}

export async function updateOutreachDraft(id: string, input: EmailDraftUpdateInput) {
  const row = await prisma.outreachDraft.update({
    where: { id },
    data: {
      subject: input.subject,
      body: input.body,
      status: input.status,
      personalizationPoints: input.personalizationPoints || "",
      usedChannelSignals: JSON.stringify(input.usedChannelSignals || []),
      confidenceNote: input.confidenceNote || "",
      errorMessage: null,
    },
    include: {
      template: {
        select: {
          name: true,
        },
      },
    },
  });

  return serializeDraft(row);
}

export async function markGmailDraftSaved(id: string, gmailDraftId: string) {
  const row = await prisma.outreachDraft.update({
    where: { id },
    data: {
      gmailDraftId,
      gmailSaveStatus: "saved",
      gmailSavedAt: new Date(),
      errorMessage: null,
    },
    include: {
      template: {
        select: {
          name: true,
        },
      },
    },
  });

  return serializeDraft(row);
}

export async function markGmailDraftFailed(id: string, errorMessage: string) {
  const row = await prisma.outreachDraft.update({
    where: { id },
    data: {
      gmailSaveStatus: "failed",
      errorMessage,
    },
    include: {
      template: {
        select: {
          name: true,
        },
      },
    },
  });

  return serializeDraft(row);
}
