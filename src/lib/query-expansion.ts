const DICTIONARY: Array<{ matcher: RegExp; expansions: string[] }> = [
  {
    matcher: /コーギー/i,
    expansions: ["コーギー", "corgi", "ウェルシュコーギー", "犬 コーギー", "corgi vlog"],
  },
  {
    matcher: /柴犬|しば犬/i,
    expansions: ["柴犬", "shiba inu", "犬 柴犬", "しば犬", "shiba vlog"],
  },
  {
    matcher: /プロップファーム|prop/i,
    expansions: ["プロップファーム", "prop firm", "prop trading", "funded trader", "FTMO"],
  },
  {
    matcher: /美容室|美容院|ヘアサロン/i,
    expansions: ["美容室", "ヘアサロン", "美容院", "hair salon", "サロン 集客"],
  },
  {
    matcher: /歯医者|歯科|デンタル/i,
    expansions: ["歯医者", "歯科", "dental clinic", "dentist", "歯科医院"],
  },
  {
    matcher: /FX|自動売買|EA/i,
    expansions: ["FX 自動売買", "EA", "algo trading", "expert advisor", "FX channel"],
  },
  {
    matcher: /犬/i,
    expansions: ["犬", "dog channel", "犬 vlog", "犬好き"],
  },
  {
    matcher: /猫/i,
    expansions: ["猫", "cat channel", "猫 vlog", "保護猫"],
  },
];

const MAX_QUERIES = 6;

export function expandQueries(input: string) {
  const base = input.trim();
  if (!base) {
    return [];
  }

  const variants = new Set<string>([base]);
  variants.add(base.replace(/\s+/g, " ").trim());

  for (const entry of DICTIONARY) {
    if (entry.matcher.test(base)) {
      for (const expansion of entry.expansions) {
        variants.add(expansion);
      }
    }
  }

  if (variants.size < 3 && /\s/.test(base)) {
    for (const token of base.split(/\s+/).filter(Boolean)) {
      variants.add(token);
    }
  }

  return [...variants].filter(Boolean).slice(0, MAX_QUERIES);
}
