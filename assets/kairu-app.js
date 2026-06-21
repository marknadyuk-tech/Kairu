const XP_TIERS = {
  Common: 100,
  Uncommon: 250,
  Rare: 500,
  Epic: 1000,
  Legendary: 2500
};

const XP_ENGINE = {
  presenceMultipliers: {
    mechanical: 0.75,
    present: 1.0,
    deep: 1.25
  },
  depthModifiers: {
    beginner: 1.0,
    intermediate: 1.1,
    advanced: 1.2,
    mentor: 1.3
  },
  ritualValues: {
    reflection: 10,
    prayer_meditation: 20,
    study: 20,
    service_charity: 30,
    fasting: 40,
    community_gathering: 50,
    retreat_pilgrimage: 100,
    major_holy_observance: 150
  },
  calculateCXP(baseXP, activeDailyMultiplier = 1) {
    // CXP measures completed external achievement.
    return Math.round((Number(baseXP) || 0) * (Number(activeDailyMultiplier) || 1));
  },
  skillSplit(rarity) {
    const legendary = String(rarity || "").toLowerCase() === "legendary";
    return legendary
      ? { primary: 0.60, support: 0.40 }
      : { primary: 0.70, support: 0.30 };
  },
  allocateKXP(cxp, rarity, primarySkill, supportSkills = []) {
    // KXP measures capability growth attached to completed achievement.
    const awardedCXP = Math.max(0, Number(cxp) || 0);
    const primary = String(primarySkill || "").trim();
    const support = [...new Set((supportSkills || []).map(skill => String(skill || "").trim()).filter(Boolean))]
      .filter(skill => skill.toLowerCase() !== primary.toLowerCase());
    if (!primary || awardedCXP <= 0) return {};

    const split = this.skillSplit(rarity);
    const allocation = { [primary]: Math.round(awardedCXP * split.primary) };
    if (support.length) {
      const supportTotal = Math.round(awardedCXP * split.support);
      const eachSupport = Math.floor(supportTotal / support.length);
      let remainder = supportTotal - (eachSupport * support.length);
      support.forEach(skill => {
        allocation[skill] = eachSupport + (remainder > 0 ? 1 : 0);
        remainder -= 1;
      });
    }
    return allocation;
  },
  consistencyMultiplier(days) {
    const count = Number(days) || 0;
    if (count >= 365) return 1.50;
    if (count >= 90) return 1.30;
    if (count >= 30) return 1.15;
    if (count >= 7) return 1.05;
    return 1.0;
  },
  calculateSXP(practice = {}) {
    // SXP measures inner-life cultivation across spiritual frameworks.
    const ritualType = practice.ritualType || practice.type || "reflection";
    const base = Number(practice.baseRitualValue) || this.ritualValues[ritualType] || this.ritualValues.reflection;
    const presence = this.presenceMultipliers[practice.presence] || this.presenceMultipliers.present;
    const consistency = this.consistencyMultiplier(practice.consistencyDays || practice.streakDays);
    const depth = this.depthModifiers[practice.depth] || this.depthModifiers.beginner;
    return Math.round(base * presence * consistency * depth);
  }
};

const PIPELINE_STAGES = ['Identified', 'Applied', 'Interview', 'Offer'];

const STORAGE_KEY = "kairu_alpha_v1";
const LEGACY_STORAGE_KEY = "kairu_v1";
const FAITH_DISCIPLINE_ID = "faith-belief-protocol";
const FAITH_DISCIPLINE_PREFIX = "faith-protocol-";

const ARCHETYPE_OPTIONS = [
  { value: "The Sovereign", drive: "Systems + Scale", focus: "Strategic systems design" },
  { value: "The Warrior", drive: "Discipline + Dominance", focus: "Physical periodization and programming" },
  { value: "The Scholar", drive: "Knowledge + Mastery", focus: "Reading, retention, and synthesis" },
  { value: "The Creator", drive: "Vision + Artifact", focus: "Rapid prototyping and shipped work" },
  { value: "The Guardian", drive: "Protection + Legacy", focus: "Covenant, stewardship, and continuity" },
  { value: "The Explorer", drive: "Discovery + Frontier", focus: "Adaptation and frontier exposure" },
  { value: "The Sage", drive: "Wisdom + Stillness", focus: "Contemplative practice and direction" },
  { value: "The Merchant", drive: "Exchange + Return", focus: "Negotiation and deal structuring" }
];

const FAITH_OPTIONS = [
  "Orthodox Christian",
  "Catholic Christian",
  "Protestant Christian",
  "Islam - Sunni",
  "Islam - Shia",
  "Hindu - Shaivite",
  "Hindu - Vaishnavite",
  "Buddhist - Theravada",
  "Buddhist - Mahayana/Zen",
  "Jewish - Orthodox",
  "Jewish - Conservative/Reform",
  "Secular / No Formal Faith",
  "Other / Custom Later"
];

const FAITH_PRESETS = {
  "Orthodox Christian": [
    { key: "morning-prayer", name: "Orthodox Morning Prayer Rule", timeBlock: "06:15", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Morning prayers or a short prayer rule; adapt with priest/spiritual father guidance." },
    { key: "jesus-prayer", name: "Jesus Prayer", timeBlock: "06:35", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Focused repetition of the Jesus Prayer with attention and humility." },
    { key: "spiritual-reading", name: "Scripture / Patristic Reading", timeBlock: "20:30", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Read Scripture, lives of saints, or Orthodox spiritual teaching." },
    { key: "evening-prayer", name: "Evening Prayer / Examen", timeBlock: "21:30", durationMinutes: 10, xpPerCompletion: 40, frequency: "daily", protocol: "Brief examination of conscience, repentance, thanksgiving, and evening prayers." },
    { key: "fast-check", name: "Wednesday / Friday Fast Check", timeBlock: "07:30", durationMinutes: 5, xpPerCompletion: 25, frequency: "Wed/Fri", protocol: "Review fasting rule for Wednesday and Friday; follow appropriate pastoral guidance." },
    { key: "divine-liturgy", name: "Divine Liturgy", timeBlock: "09:30", durationMinutes: 90, xpPerCompletion: 100, frequency: "weekly", protocol: "Attend Sunday Divine Liturgy when possible." }
  ],
  "Catholic Christian": [
    { key: "morning-offering", name: "Morning Offering", timeBlock: "06:15", durationMinutes: 5, xpPerCompletion: 25, frequency: "daily", protocol: "Offer the day to God with a short traditional or personal prayer." },
    { key: "lectio-divina", name: "Lectio Divina", timeBlock: "06:30", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Read, meditate, pray, and contemplate Scripture." },
    { key: "rosary", name: "Rosary", timeBlock: "20:30", durationMinutes: 20, xpPerCompletion: 60, frequency: "daily", protocol: "Pray the Rosary or one decade when time is constrained." },
    { key: "examen-compline", name: "Examen / Compline", timeBlock: "21:30", durationMinutes: 10, xpPerCompletion: 40, frequency: "daily", protocol: "Review the day, repent, give thanks, and pray night prayer." },
    { key: "mass", name: "Sunday Mass", timeBlock: "09:30", durationMinutes: 75, xpPerCompletion: 100, frequency: "weekly", protocol: "Attend Sunday Mass or Saturday Vigil." }
  ],
  "Protestant Christian": [
    { key: "scripture-prayer", name: "Scripture + Prayer", timeBlock: "06:30", durationMinutes: 20, xpPerCompletion: 50, frequency: "daily", protocol: "Read Scripture and pray with focus." },
    { key: "worship", name: "Worship / Praise", timeBlock: "07:00", durationMinutes: 10, xpPerCompletion: 30, frequency: "daily", protocol: "Short worship, gratitude, or psalm/hymn practice." },
    { key: "evening-review", name: "Evening Review", timeBlock: "21:30", durationMinutes: 10, xpPerCompletion: 35, frequency: "daily", protocol: "Review obedience, gratitude, repentance, and tomorrow's commitments." },
    { key: "church", name: "Church Service", timeBlock: "10:00", durationMinutes: 75, xpPerCompletion: 100, frequency: "weekly", protocol: "Attend weekly church service or community worship." }
  ],
  "Islam - Sunni": [
    { key: "fajr", name: "Fajr Prayer", timeBlock: "05:30", durationMinutes: 10, xpPerCompletion: 40, frequency: "daily", fixedTime: true, fixedReason: "Tied to the local sunrise prayer window.", protocol: "Perform Fajr within its proper local prayer window." },
    { key: "dhuhr", name: "Dhuhr Prayer", timeBlock: "12:30", durationMinutes: 10, xpPerCompletion: 40, frequency: "daily", fixedTime: true, fixedReason: "Tied to the local midday prayer window.", protocol: "Perform Dhuhr within its proper local prayer window." },
    { key: "asr", name: "Asr Prayer", timeBlock: "16:30", durationMinutes: 10, xpPerCompletion: 40, frequency: "daily", fixedTime: true, fixedReason: "Tied to the local afternoon prayer window.", protocol: "Perform Asr within its proper local prayer window." },
    { key: "maghrib", name: "Maghrib Prayer", timeBlock: "18:30", durationMinutes: 10, xpPerCompletion: 40, frequency: "daily", fixedTime: true, fixedReason: "Tied to local sunset.", protocol: "Perform Maghrib after sunset within its proper local prayer window." },
    { key: "isha", name: "Isha Prayer", timeBlock: "20:30", durationMinutes: 10, xpPerCompletion: 40, frequency: "daily", fixedTime: true, fixedReason: "Tied to the local night prayer window.", protocol: "Perform Isha within its proper local prayer window." },
    { key: "quran", name: "Qur'an Recitation", timeBlock: "21:00", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Read, recite, or review Qur'an with attention." }
  ],
  "Islam - Shia": [
    { key: "fajr", name: "Fajr Prayer", timeBlock: "05:30", durationMinutes: 10, xpPerCompletion: 40, frequency: "daily", fixedTime: true, fixedReason: "Tied to the local sunrise prayer window.", protocol: "Perform Fajr within its proper local prayer window." },
    { key: "dhuhr-asr", name: "Dhuhr / Asr Prayers", timeBlock: "12:30", durationMinutes: 20, xpPerCompletion: 70, frequency: "daily", fixedTime: true, fixedReason: "Tied to the local midday/afternoon prayer window.", protocol: "Perform Dhuhr and Asr according to your school/community practice." },
    { key: "maghrib-isha", name: "Maghrib / Isha Prayers", timeBlock: "18:30", durationMinutes: 20, xpPerCompletion: 70, frequency: "daily", fixedTime: true, fixedReason: "Tied to local sunset/night.", protocol: "Perform Maghrib and Isha according to your school/community practice." },
    { key: "quran", name: "Qur'an Recitation", timeBlock: "21:00", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Read, recite, or review Qur'an with attention." }
  ],
  "Hindu - Shaivite": [
    { key: "morning-puja", name: "Morning Puja", timeBlock: "06:30", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Simple home puja or devotional offering." },
    { key: "japa", name: "Mantra Japa", timeBlock: "07:00", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Repeat a chosen mantra with attention; use mala if part of your practice." },
    { key: "scripture", name: "Scripture / Teaching Study", timeBlock: "20:30", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Study a text or teaching from your tradition." },
    { key: "seva", name: "Seva / Service", timeBlock: "18:00", durationMinutes: 20, xpPerCompletion: 50, frequency: "weekly", protocol: "A concrete act of service, charity, or household duty offered deliberately." }
  ],
  "Hindu - Vaishnavite": [
    { key: "morning-puja", name: "Morning Puja", timeBlock: "06:30", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Simple home puja or devotional offering." },
    { key: "japa", name: "Nama Japa", timeBlock: "07:00", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Repeat a chosen divine name or mantra with attention." },
    { key: "scripture", name: "Bhagavad Gita / Scripture Study", timeBlock: "20:30", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Read and reflect on a passage from the Gita or tradition text." },
    { key: "seva", name: "Seva / Service", timeBlock: "18:00", durationMinutes: 20, xpPerCompletion: 50, frequency: "weekly", protocol: "A concrete act of service, charity, or household duty offered deliberately." }
  ],
  "Buddhist - Theravada": [
    { key: "morning-meditation", name: "Morning Meditation", timeBlock: "06:30", durationMinutes: 20, xpPerCompletion: 50, frequency: "daily", protocol: "Mindfulness of breathing, body, or loving-kindness meditation." },
    { key: "precepts", name: "Precepts Reflection", timeBlock: "07:00", durationMinutes: 5, xpPerCompletion: 25, frequency: "daily", protocol: "Review the precepts and set intention for conduct." },
    { key: "dhamma-study", name: "Dhamma Study", timeBlock: "20:30", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Read or listen to Dhamma teaching and extract one practice point." },
    { key: "evening-meditation", name: "Evening Meditation", timeBlock: "21:30", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Evening sitting, metta, or review of mind and conduct." }
  ],
  "Buddhist - Mahayana/Zen": [
    { key: "zazen", name: "Zazen / Sitting Meditation", timeBlock: "06:30", durationMinutes: 20, xpPerCompletion: 50, frequency: "daily", protocol: "Sitting meditation according to your tradition or teacher." },
    { key: "chanting", name: "Chanting / Sutra Practice", timeBlock: "07:00", durationMinutes: 10, xpPerCompletion: 35, frequency: "daily", protocol: "Chant or recite a short sutra, vow, or refuge practice." },
    { key: "dharma-study", name: "Dharma Study", timeBlock: "20:30", durationMinutes: 15, xpPerCompletion: 50, frequency: "daily", protocol: "Read or listen to Dharma teaching and extract one practice point." },
    { key: "evening-review", name: "Evening Review", timeBlock: "21:30", durationMinutes: 10, xpPerCompletion: 35, frequency: "daily", protocol: "Review conduct, attention, and compassion for the day." }
  ],
  "Jewish - Orthodox": [
    { key: "shacharit", name: "Shacharit", timeBlock: "06:45", durationMinutes: 30, xpPerCompletion: 60, frequency: "daily", protocol: "Morning prayer according to your siddur/community practice." },
    { key: "torah-study", name: "Torah Study", timeBlock: "20:30", durationMinutes: 20, xpPerCompletion: 50, frequency: "daily", protocol: "Read Torah, Tanakh, halacha, or tradition text." },
    { key: "mincha", name: "Mincha", timeBlock: "16:30", durationMinutes: 10, xpPerCompletion: 35, frequency: "daily", protocol: "Afternoon prayer according to your siddur/community practice." },
    { key: "maariv-shema", name: "Maariv / Bedtime Shema", timeBlock: "21:30", durationMinutes: 15, xpPerCompletion: 45, frequency: "daily", protocol: "Evening prayer or bedtime Shema according to your practice." },
    { key: "shabbat", name: "Shabbat Preparation / Observance", timeBlock: "17:00", durationMinutes: 30, xpPerCompletion: 75, frequency: "weekly", protocol: "Prepare for and honor Shabbat according to household/community practice." }
  ],
  "Jewish - Conservative/Reform": [
    { key: "morning-prayer", name: "Morning Prayer / Shema", timeBlock: "07:00", durationMinutes: 15, xpPerCompletion: 45, frequency: "daily", protocol: "Morning prayer, Shema, or gratitude practice according to your community." },
    { key: "torah-study", name: "Torah / Jewish Study", timeBlock: "20:30", durationMinutes: 20, xpPerCompletion: 50, frequency: "daily", protocol: "Read Torah, Jewish ethics, history, or tradition text." },
    { key: "evening-review", name: "Evening Prayer / Review", timeBlock: "21:30", durationMinutes: 10, xpPerCompletion: 35, frequency: "daily", protocol: "Evening reflection, prayer, or bedtime Shema." },
    { key: "shabbat", name: "Shabbat Practice", timeBlock: "17:00", durationMinutes: 30, xpPerCompletion: 75, frequency: "weekly", protocol: "Mark Shabbat with rest, candles, service, meal, or intentional observance." }
  ],
  "Secular / No Formal Faith": [
    { key: "values-review", name: "Values Review", timeBlock: "06:30", durationMinutes: 10, xpPerCompletion: 35, frequency: "daily", protocol: "Review chosen values and one concrete action for the day." },
    { key: "mindfulness", name: "Mindfulness / Stillness", timeBlock: "07:00", durationMinutes: 15, xpPerCompletion: 45, frequency: "daily", protocol: "Quiet attention, breath practice, or nonreligious meditation." },
    { key: "service", name: "Service / Gratitude", timeBlock: "18:00", durationMinutes: 10, xpPerCompletion: 35, frequency: "daily", protocol: "Record gratitude or perform one useful act for another person." },
    { key: "evening-review", name: "Evening Review", timeBlock: "21:30", durationMinutes: 10, xpPerCompletion: 35, frequency: "daily", protocol: "Review actions against values; choose one correction for tomorrow." }
  ],
  "Other / Custom Later": [
    { key: "belief-reflection", name: "Belief Reflection", timeBlock: "06:30", durationMinutes: 10, xpPerCompletion: 35, frequency: "daily", protocol: "Placeholder practice: reflect on values, duties, gratitude, and chosen commitments." }
  ]
};

// ============================================================
// KAIRU RANK STATE MACHINE  (E -> SSS)
// Pure evaluators (read-only) + advanceRank (returns next state).
// Source of truth for all rank progression logic.
// Adapted for this app: quest tier reads quest.rarity (falling back to
// the legacy quest.difficulty field),
// discipline streak is derived from disciplineLog, XP is a SOFT
// gate (informational, not required to advance), and advanceRank
// returns updatedState instead of writing localStorage itself.
// ============================================================
const RANK_CONFIG = {

  tiers: ["E", "D", "C", "B", "A", "S", "SS", "SSS"],

  // XP thresholds are a soft gate -- they will be recalibrated
  // after 30 days of real Doc 10 competence XP accrual data.
  // Quest counts and time in grade are the binding constraints at E-tier.
  requirements: {
    D:   { xpThreshold: 15000,    timeInGradeDays: 90,   rareQuests: 25,   epicQuests: 5,   legendaryQuests: 0,  disciplineStreak: 90,   verifiedCredentials: 1,    specialCondition: false },
    C:   { xpThreshold: 75000,    timeInGradeDays: 365,  rareQuests: 75,   epicQuests: 20,  legendaryQuests: 1,  disciplineStreak: 180,  verifiedCredentials: 2,    specialCondition: false },
    B:   { xpThreshold: 250000,   timeInGradeDays: 730,  rareQuests: 175,  epicQuests: 50,  legendaryQuests: 3,  disciplineStreak: 365,  verifiedCredentials: 3,    specialCondition: false },
    A:   { xpThreshold: 750000,   timeInGradeDays: 1460, rareQuests: 300,  epicQuests: 100, legendaryQuests: 7,  disciplineStreak: 500,  verifiedCredentials: 5,    specialCondition: false },
    S:   { xpThreshold: 2000000,  timeInGradeDays: 2555, rareQuests: 500,  epicQuests: 175, legendaryQuests: 15, disciplineStreak: 730,  verifiedCredentials: null,  specialCondition: true  },
    SS:  { xpThreshold: 5000000,  timeInGradeDays: 3650, rareQuests: 750,  epicQuests: 300, legendaryQuests: 25, disciplineStreak: 1000, verifiedCredentials: null,  specialCondition: true  },
    SSS: { xpThreshold: 15000000, timeInGradeDays: 5475, rareQuests: 1000, epicQuests: 500, legendaryQuests: 50, disciplineStreak: 1500, verifiedCredentials: null,  specialCondition: true  }
  },

  // Special conditions (S/SS/SSS) are DEFERRED in this build: they are
  // surfaced in the UI as a manual stub and never auto-satisfied.
  specialConditions: {
    "The Sovereign": { S: "documented_institution_building", SS: "institution_operating_at_scale", SSS: "institution_at_scale_with_succession" },
    "The Warrior":   { S: "verified_competitive_achievement", SS: "documented_physical_legacy", SSS: "verified_competitive_legacy" },
    "The Scholar":   { S: "published_work_with_impact", SS: "recognized_intellectual_authority", SSS: "canonical_published_works" },
    "The Creator":   { S: "artifact_reaching_100k", SS: "cultural_artifact_500k", SSS: "cultural_artifact_1M" },
    "The Guardian":  { S: "documented_family_institution", SS: "multi_generation_covenant_established", SSS: "multigenerational_covenant" },
    "The Explorer":  { S: "documented_frontier_achievement", SS: "multiple_frontier_firsts", SSS: "documented_frontier_first" },
    "The Sage":      { S: "recognized_teaching_lineage", SS: "wisdom_tradition_documented", SSS: "recognized_wisdom_tradition" },
    "The Merchant":  { S: "verified_market_impact", SS: "generational_wealth_vehicle_initiated", SSS: "generational_wealth_vehicle" }
  },

  titles: {
    E:   ["The Awakening", "First Blood", "Quest Seeker"],
    D:   ["Disciplined", "Oathkeeper", "Trailblazer"],
    C:   ["Strategist", "Pathfinder", "Steward"],
    B:   ["Commander", "Founder", "Mentor"],
    A:   ["Architect", "Guardian", "Vanguard"],
    S:   ["World Builder", "Covenant Bearer", "Kingmaker"],
    SS:  ["Civilization Steward"],
    SSS: ["The Kairu"]
  }
};

// Derived global discipline streak: the longest active per-practice streak.
// Mirrors getDisciplineStreak() but runs off a passed-in state so the
// evaluators stay pure.
function deriveCurrentStreak(userState) {
  const log = userState.disciplineLog || [];
  const discs = userState.disciplines || [];
  let best = 0;
  discs.forEach(d => {
    const dates = new Set(log.filter(e => e.disciplineId === d.id).map(e => e.date));
    let streak = 0;
    const cursor = new Date();
    while (true) {
      const ds = cursor.getFullYear() + '-'
        + String(cursor.getMonth() + 1).padStart(2, '0') + '-'
        + String(cursor.getDate()).padStart(2, '0');
      if (!dates.has(ds)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    if (streak > best) best = streak;
  });
  return best;
}

// evaluateRankProgress(userState) -> full breakdown of next-rank gates.
// Read-only. No side effects.
function evaluateRankProgress(userState) {
  const tiers = RANK_CONFIG.tiers;
  const currentRankName = userState.identity.tier;
  const currentTierIndex = tiers.indexOf(currentRankName);

  if (currentTierIndex === tiers.length - 1) {
    return { atMaxRank: true, progress: 100, requirements: [] };
  }

  const nextRank = tiers[currentTierIndex + 1];
  const reqs = RANK_CONFIG.requirements[nextRank];

  // Cumulative quest counts from full archive. NOTE: quests store `difficulty`,
  // which is this app's rarity vocabulary (Common..Legendary).
  const allArchivedQuests = userState.archivedQuests || [];
  const rarity = q => q.rarity || q.difficulty;
  const rareQuestCount = allArchivedQuests.filter(q => rarity(q) === "Rare").length;
  const epicQuestCount = allArchivedQuests.filter(q => rarity(q) === "Epic").length;
  const legendaryQuestCount = allArchivedQuests.filter(q => rarity(q) === "Legendary").length;

  // Time in current grade
  const rankHistory = userState.rankHistory || [];
  const activeGrade = rankHistory.find(r => r.rank === currentRankName && r.exitedAt === null);
  const daysInGrade = activeGrade
    ? Math.floor((Date.now() - new Date(activeGrade.enteredAt).getTime()) / 86400000)
    : 0;

  const totalXP = userState.totalXP || 0;
  const currentStreak = deriveCurrentStreak(userState);
  const verifiedCredentials = userState.verifiedCredentials || 0;
  const specialConditionsMet = userState.specialConditionsMet || {};
  const specialConditionMet = specialConditionsMet[nextRank] || false;

  // XP is a SOFT gate: shown for context, but not required to advance.
  const requirements = [
    { key: "xpThreshold",      label: "Total XP",                current: totalXP,        required: reqs.xpThreshold,     met: totalXP >= reqs.xpThreshold, soft: true },
    { key: "timeInGrade",      label: "Days in Current Rank",    current: daysInGrade,    required: reqs.timeInGradeDays,  met: daysInGrade >= reqs.timeInGradeDays },
    { key: "rareQuests",       label: "Rare Quests Completed",   current: rareQuestCount, required: reqs.rareQuests,       met: rareQuestCount >= reqs.rareQuests },
    { key: "epicQuests",       label: "Epic Quests Completed",   current: epicQuestCount, required: reqs.epicQuests,       met: epicQuestCount >= reqs.epicQuests },
    { key: "disciplineStreak", label: "Discipline Streak",       current: currentStreak,  required: reqs.disciplineStreak, met: currentStreak >= reqs.disciplineStreak }
  ];

  if (reqs.legendaryQuests > 0) {
    requirements.push({ key: "legendaryQuests", label: "Legendary Quests Completed", current: legendaryQuestCount, required: reqs.legendaryQuests, met: legendaryQuestCount >= reqs.legendaryQuests });
  }
  if (reqs.verifiedCredentials) {
    requirements.push({ key: "verifiedCredentials", label: "Verified Credentials", current: verifiedCredentials, required: reqs.verifiedCredentials, met: verifiedCredentials >= reqs.verifiedCredentials });
  }
  if (reqs.specialCondition) {
    // Deferred: surfaced but treated as a soft gate so E->A flows fully.
    requirements.push({ key: "specialCondition", label: "Archetype Special Condition (manual)", current: specialConditionMet ? 1 : 0, required: 1, met: specialConditionMet, soft: true });
  }

  // Binding gates = hard gates only. allMet/progress ignore soft gates.
  const hardReqs = requirements.filter(r => !r.soft);
  const hardMet = hardReqs.filter(r => r.met).length;
  const progressPct = hardReqs.length ? Math.round((hardMet / hardReqs.length) * 100) : 100;

  return {
    atMaxRank: false,
    currentRank: currentRankName,
    nextRank,
    progress: progressPct,
    requirements,
    allMet: hardMet === hardReqs.length
  };
}

// canAdvanceRank(userState) -> boolean. All HARD gates must pass.
// Read-only. No side effects.
function canAdvanceRank(userState) {
  const evaluation = evaluateRankProgress(userState);
  if (evaluation.atMaxRank) return false;
  return evaluation.allMet;
}

// advanceRank(userState) -> { success, ..., updatedState }
// Closes current grade, opens the next, unlocks the first title of the new
// rank. PURE: returns the next state; the caller persists it (attemptAscend).
function advanceRank(userState) {
  if (!canAdvanceRank(userState)) {
    return { success: false, reason: "Not all rank requirements met." };
  }

  const tiers = RANK_CONFIG.tiers;
  const currentRankName = userState.identity.tier;
  const currentTierIndex = tiers.indexOf(currentRankName);
  const newRank = tiers[currentTierIndex + 1];
  const now = new Date().toISOString();

  const rankHistory = [...(userState.rankHistory || [])];
  const activeGradeIndex = rankHistory.findIndex(r => r.rank === currentRankName && r.exitedAt === null);
  if (activeGradeIndex !== -1) {
    rankHistory[activeGradeIndex] = { ...rankHistory[activeGradeIndex], exitedAt: now };
  }
  rankHistory.push({ rank: newRank, enteredAt: now, exitedAt: null });

  const newRankTitles = RANK_CONFIG.titles[newRank] || [];
  const titlesEarned = [...(userState.titlesEarned || [])];
  const unlockedTitle = newRankTitles[0] || null;
  if (unlockedTitle && !titlesEarned.includes(unlockedTitle)) {
    titlesEarned.push(unlockedTitle);
  }

  const updatedState = {
    ...userState,
    identity: { ...userState.identity, tier: newRank, lastUpdated: now },
    rankHistory,
    titlesEarned,
    activeTitle: unlockedTitle || userState.activeTitle
  };

  return { success: true, previousRank: currentRankName, newRank, titleUnlocked: unlockedTitle, timestamp: now, updatedState };
}

// UI wrapper: advance the live app state, persist, re-render.
function attemptAscend() {
  const result = advanceRank(state);
  if (!result.success) {
    showToast(result.reason || "Rank requirements not met");
    return;
  }
  state = result.updatedState;
  saveState();
  renderAll();
  showXPFlash(`RANK UP // ${result.newRank}`);
  showToast(`Ascended to ${result.newRank}${result.titleUnlocked ? " // " + result.titleUnlocked : ""}`);
}

// Concise, actionable titles. The descriptive copy is now a live status line
// (see viewStatusHTML) so the header surfaces numbers, not restated labels.
const copy = {
  command:   { eyebrow: "KAIRU Command",       title: "Command Center" },
  quests:    { eyebrow: "Quest Board",         title: "Quests" },
  archive:   { eyebrow: "KAIRU Chronicle",     title: "Chronicle" },
  skills:    { eyebrow: "Skill Registry",      title: "Skills" },
  financial: { eyebrow: "Financial Inventory", title: "Financial" },
  pipeline:  { eyebrow: "Income & Opportunity", title: "Pipeline" },
  discipline:{ eyebrow: "Discipline Stack",    title: "Discipline" },
  tasks:     { eyebrow: "Maintenance Layer",   title: "Tasks" }
};

// Live status line for the header. Surfaces real numbers per view; the command
// view renders a compact multi-stat HUD. Recomputed on nav and on every render.
function viewStatusHTML(view) {
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  switch (view) {
    case 'command': {
      const quests = (state.activeQuests || []).length;
      const protocols = (state.disciplines || []).filter(disciplineAppliesToday).length;
      const cxp = getCompetenceXP();
      const tracked = isTrackedToday();
      const chip = (val, label, cls) => `<span class="cmd-hud__chip${cls ? ' ' + cls : ''}"><b>${val}</b>${label}</span>`;
      return `<span class="cmd-hud">${
        chip(quests, 'Active Quests')}${
        chip(protocols, 'Protocols Today')}${
        chip(cxp.toLocaleString() + ' ', 'CXP')}${
        tracked ? chip('+3%', 'Tracking Active', 'is-live') : chip('OFF', 'Tracking', 'is-off')
      }</span>`;
    }
    case 'quests':    return escapeHTML(plural((state.activeQuests || []).length, 'active mission'));
    case 'discipline':return escapeHTML(plural((state.disciplines || []).filter(disciplineAppliesToday).length, 'protocol') + ' today');
    case 'skills':    return escapeHTML(plural((state.skills || []).length, 'active skill'));
    case 'pipeline':  return escapeHTML(plural((state.jobPipeline || []).length, 'opportunity', 'opportunities') + ' tracked');
    case 'tasks':     return escapeHTML(plural((state.tasks || []).filter(t => !t.done && !t.completed).length, 'open task'));
    case 'financial': return escapeHTML(formatMoney((state.financials.assets || 0) - (state.financials.liabilities || 0)) + ' net worth');
    case 'archive':   return escapeHTML(plural((state.archivedQuests || []).length, 'quest') + ' chronicled');
    default:          return '';
  }
}

function updateViewStatus() {
  const active = document.querySelector('.view.active');
  if (!active || !els.viewCopy) return;
  els.viewCopy.innerHTML = viewStatusHTML(active.id);
}

const defaultState = {
  totalXP: 0,
  daysTracked: 0,
  lastTrackDate: null,
  activeQuests: [],
  archivedQuests: [],
  dailyXPLedger: {},
  xpLog: [],
  rankHistory: [],
  titlesEarned: ["Awakened"],
  activeTitle: "Awakened",
  verifiedCredentials: 0,
  specialConditionsMet: {},
  serendipity: {
    buffExpiry: 0,
    multiplier: 1.0,
    source: null,
    flaggedQuestId: null
  },
  financials: {
    assets: 0,
    liabilities: 0,
    income: 0,
    expenses: 0
  },
  incomeConfig: {
    hourlyRate: 17,
    baseHours: 27,
    extendedHours: 36,
    maxHours: 40,
    position: 'Wellness Expert',
    employer: 'CBD Wellness Store'
  },
  jobPipeline: [
    { id: 'pipe-001', company: 'USAA', role: 'Insurance / Financial', stage: 'Applied', notes: 'Referral pending', dateAdded: '2026-06-12' },
    { id: 'pipe-002', company: 'C-in2 New York', role: 'Remote Role', stage: 'Applied', notes: 'Resume shared', dateAdded: '2026-06-12' },
    { id: 'pipe-003', company: 'Tractor Supply', role: 'Team Lead', stage: 'Applied', notes: '', dateAdded: '2026-06-12' }
  ],
  disciplines: [
    { id: 'disc-002', name: 'Workout', frequency: '4x/week', targetPerWeek: 4, xpPerCompletion: 75, category: 'Physical', timeBlock: '07:00', durationMinutes: 45, source: 'core', protocol: 'Strength, conditioning, mobility, or programmed recovery work.' }
  ],
  disciplineLog: [],
  echoes: [],
  tasks: [],
  resumeProfile: {
    rawText: "",
    extractedSkills: [],
    approvedSkillIds: [],
    suggestedQuests: []
  },
  spiritualPractices: [
    { id: 'sxp-001', name: 'Morning Prayer Rule', ritualType: 'prayer_meditation', presence: 'present', consistencyDays: 7, depth: 'intermediate' },
    { id: 'sxp-002', name: 'Scripture / Patristic Study', ritualType: 'study', presence: 'deep', consistencyDays: 30, depth: 'intermediate' },
    { id: 'sxp-003', name: 'Service / Charity', ritualType: 'service_charity', presence: 'present', consistencyDays: 1, depth: 'beginner' }
  ],
  identity: {
    name: null,
    archetype: "The Sovereign",
    tier: "E",
    faith: "Orthodox Christian",
    cycleDay: 1,
    trackingActive: false,
    startDate: null
  },
  // Skills start empty for every new operator. The registry is populated through
  // onboarding (resume extraction, career selection, or manual creation) so KAIRU
  // ships as a clean product rather than seeded with one person's capabilities.
  skills: []
};

let state = structuredClone(defaultState);
let pendingQuestId = null;

function assembleContext() {
  const s = state;

  // Identity
  const archetypeProfile = ARCHETYPE_OPTIONS.find(option => option.value === normalizeArchetype(s.identity?.archetype));
  const identity = {
    name: s.identity?.name ?? null,
    archetype: normalizeArchetype(s.identity?.archetype),
    archetypeDrive: archetypeProfile ? archetypeProfile.drive : null,
    archetypeFocus: archetypeProfile ? archetypeProfile.focus : null,
    tier: s.identity?.tier ?? null,
    faith: cleanFaithValue(s.identity?.faith)
  };

  // Progression
  const developmentTotals = getDevelopmentTotals();
  const progression = {
    totalXP: Number(s.totalXP) || 0,
    competenceXP: developmentTotals.cxp,
    skillXP: developmentTotals.kxp,
    spiritualXP: developmentTotals.sxp,
    totalDevelopmentScore: developmentTotals.tds,
    daysTracked: Number(s.daysTracked) || 0
  };

  // Skills: surface expert-tier explicitly (high-signal for opportunity routing),
  // plus a count per tier.
  const tierCounts = {};
  (s.skills || []).forEach(sk => {
    tierCounts[sk.tier] = (tierCounts[sk.tier] || 0) + 1;
  });
  const skills = {
    expert: (s.skills || []).filter(sk => sk.tier === 'expert').map(sk => sk.name),
    registryXP: developmentTotals.kxp,
    questAllocatedKXP: getQuestAllocatedKXP(),
    tierCounts
  };

  // Income FLOW (contracted, from incomeConfig)
  const cfg = s.incomeConfig || {};
  const rate = Number(cfg.hourlyRate) || 0;
  const incomeFlow = {
    hourlyRate: rate,
    baseWeekly: rate * (Number(cfg.baseHours) || 0),
    extendedWeekly: rate * (Number(cfg.extendedHours) || 0),
    position: cfg.position ?? null,
    employer: cfg.employer ?? null
  };

  // BALANCE SHEET (manual, from financials). Net worth derived, not stored.
  const f = s.financials || {};
  const assets = Number(f.assets) || 0;
  const liabilities = Number(f.liabilities) || 0;
  const balanceSheet = {
    assets,
    liabilities,
    netWorth: assets - liabilities,
    reportedIncome: Number(f.income) || 0,
    reportedExpenses: Number(f.expenses) || 0
  };

  // Job pipeline: counts by stage + the entries
  const stageCounts = {};
  (s.jobPipeline || []).forEach(j => {
    stageCounts[j.stage] = (stageCounts[j.stage] || 0) + 1;
  });
  const pipeline = {
    stageCounts,
    entries: (s.jobPipeline || []).map(j => ({
      company: j.company, role: j.role, stage: j.stage, notes: j.notes
    }))
  };

  // Discipline: per-practice streak + 30-day completed/missed (truth, no inflation)
  const discipline = (s.disciplines || []).map(d => {
    const cells = getCalendarCells(d.id, 30);
    const completed = cells.filter(c => c.completed).length;
    return {
      name: d.name,
      category: d.category || null,
      source: d.source || "custom",
      frequency: d.frequency || null,
      timeBlock: d.timeBlock || null,
      durationMinutes: Number(d.durationMinutes) || null,
      protocol: d.protocol || null,
      streak: getDisciplineStreak(d.id),
      completedLast30: completed,
      missedLast30: cells.length - completed
    };
  });

  const spiritualPractices = (s.spiritualPractices || []).map(practice => ({
    name: practice.name,
    ritualType: practice.ritualType,
    presence: practice.presence,
    consistencyDays: Number(practice.consistencyDays) || 0,
    depth: practice.depth,
    sxp: calculateSXP(practice)
  }));

  // Serendipity buff (the temporary XP multiplier). Lives in main state so it
  // serializes with everything else and maps cleanly to a future Supabase row.
  const ser = s.serendipity || {};
  const serBuffExpiry = Number(ser.buffExpiry) || 0;
  const serActive = Date.now() < serBuffExpiry;
  const serendipity = {
    active: serActive,
    multiplier: serActive ? (Number(ser.multiplier) || 1.5) : 1.0,
    expiresAt: serBuffExpiry ? new Date(serBuffExpiry).toISOString() : null,
    source: ser.source || null
  };

  return { generatedAt: new Date().toISOString(), identity, progression,
           skills, incomeFlow, balanceSheet, pipeline, discipline, spiritualPractices,
           serendipity };
}

window.kairuContext = assembleContext;

function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId(prefix) {
  return crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random()}`;
}

function minutesFromTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 24 * 60;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function formatTimeBlock(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "Unscheduled";
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${suffix}`;
}

function normalizeDiscipline(disc = {}, index = 0) {
  const fallback = defaultState.disciplines[index] || {};
  const category = disc.category || fallback.category || "Other";
  return {
    ...disc,
    id: disc.id || createId("disc"),
    name: String(disc.name || fallback.name || "Untitled Discipline").trim(),
    category,
    frequency: disc.frequency || fallback.frequency || "daily",
    xpPerCompletion: Number(disc.xpPerCompletion ?? fallback.xpPerCompletion ?? 50) || 0,
    targetPerWeek: disc.targetPerWeek ?? fallback.targetPerWeek ?? null,
    timeBlock: disc.timeBlock || fallback.timeBlock || "08:00",
    durationMinutes: Number(disc.durationMinutes ?? fallback.durationMinutes ?? 15) || 15,
    source: disc.source || fallback.source || "custom",
    // anchorDate seeds the recurrence math for weekly/monthly/seasonal/annual
    // protocols. Legacy disciplines without one are treated as always-applicable.
    anchorDate: disc.anchorDate || fallback.anchorDate || null,
    protocol: disc.protocol || fallback.protocol || ""
  };
}

// Frequencies KAIRU understands. "4x/week" + "custom" are legacy/back-compat and
// always surface; the dated frequencies only surface on the days they apply.
const DISCIPLINE_FREQUENCIES = ["daily", "weekly", "monthly", "seasonal", "annual", "4x/week", "custom"];

// disciplineAppliesToday(disc) -> boolean. Pure. Decides whether a protocol should
// surface in today's Day Protocol / Command brief. Missing anchor => always show.
function disciplineAppliesToday(disc) {
  const freq = String(disc && disc.frequency || "daily").toLowerCase();
  if (freq === "daily" || freq === "4x/week" || freq === "custom") return true;

  const anchorStr = disc && disc.anchorDate;
  if (!anchorStr) return true; // never hide a protocol we can't schedule

  const now = new Date(`${localToday()}T00:00:00`);
  const anchor = new Date(`${anchorStr}T00:00:00`);
  if (Number.isNaN(anchor.valueOf())) return true;

  // Clamp an anchor day-of-month to the current month's length (e.g. 31 -> 30/28).
  const clampDay = (day, ref) => {
    const last = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    return Math.min(day, last);
  };

  switch (freq) {
    case "weekly":
      return now.getDay() === anchor.getDay();
    case "monthly":
      return now.getDate() === clampDay(anchor.getDate(), now);
    case "seasonal": {
      // Every 3rd month from the anchor month, on the anchor day-of-month.
      const monthDelta = (now.getFullYear() - anchor.getFullYear()) * 12 + (now.getMonth() - anchor.getMonth());
      return monthDelta % 3 === 0 && now.getDate() === clampDay(anchor.getDate(), now);
    }
    case "annual":
      return now.getMonth() === anchor.getMonth() && now.getDate() === clampDay(anchor.getDate(), now);
    default:
      return true;
  }
}

function normalizeArchetype(value) {
  const archetype = String(value || "").trim();
  const exact = ARCHETYPE_OPTIONS.find(option => option.value === archetype);
  if (exact) return exact.value;
  const lower = archetype.toLowerCase();
  const fuzzy = ARCHETYPE_OPTIONS.find(option => option.value.toLowerCase() === lower || option.value.toLowerCase().replace("the ", "") === lower);
  return fuzzy ? fuzzy.value : defaultState.identity.archetype;
}

function cleanFaithValue(value) {
  const faith = String(value || "").trim();
  if (!faith || faith === "#FAITH#") return defaultState.identity.faith;
  const exact = FAITH_OPTIONS.find(option => option === faith);
  if (exact) return exact;

  const lower = faith.toLowerCase();
  if (lower.includes("orthodox") && (lower.includes("christ") || lower.includes("catholic"))) return "Orthodox Christian";
  if (lower.includes("catholic")) return "Catholic Christian";
  if (lower.includes("protestant")) return "Protestant Christian";
  if (lower.includes("sunni")) return "Islam - Sunni";
  if (lower.includes("shia") || lower.includes("shi'a")) return "Islam - Shia";
  if (lower.includes("hindu") && lower.includes("vaish")) return "Hindu - Vaishnavite";
  if (lower.includes("hindu") || lower.includes("shaiv")) return "Hindu - Shaivite";
  if (lower.includes("theravada")) return "Buddhist - Theravada";
  if (lower.includes("buddhist") || lower.includes("zen") || lower.includes("mahayana")) return "Buddhist - Mahayana/Zen";
  if (lower.includes("jew") && lower.includes("orthodox")) return "Jewish - Orthodox";
  if (lower.includes("jewish") || lower.includes("conservative") || lower.includes("reform")) return "Jewish - Conservative/Reform";
  if (lower.includes("none") || lower.includes("secular") || lower.includes("agnostic") || lower.includes("atheist")) return "Secular / No Formal Faith";
  return "Other / Custom Later";
}

function faithPresetId(faith, key) {
  return `${FAITH_DISCIPLINE_PREFIX}${faith.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${key}`;
}

function buildFaithDiscipline(faith, preset, existing = {}) {
  const fixedTime = !!preset.fixedTime;
  // Adjustable practices keep the user's chosen time; absolute-rule practices
  // (e.g. sun-tied prayer windows) always snap back to the canonical time.
  const timeBlock = fixedTime
    ? (preset.timeBlock || "06:30")
    : (existing.timeBlock || preset.timeBlock || "06:30");
  return normalizeDiscipline({
    ...existing,
    id: faithPresetId(faith, preset.key),
    name: preset.name,
    category: "Faith / Belief",
    frequency: existing.frequency || preset.frequency || "daily",
    xpPerCompletion: Number(existing.xpPerCompletion ?? preset.xpPerCompletion) || 0,
    timeBlock,
    durationMinutes: Number(existing.durationMinutes ?? preset.durationMinutes) || 15,
    source: "faith",
    faith,
    presetKey: preset.key,
    fixedTime,
    fixedReason: preset.fixedReason || "",
    protocol: preset.protocol
  });
}

function syncFaithDiscipline(userState) {
  const faith = cleanFaithValue(userState.identity && userState.identity.faith);
  if (!Array.isArray(userState.disciplines)) userState.disciplines = [];
  userState.identity.faith = faith;

  const existingFaithDisciplines = new Map(
    userState.disciplines
      .filter(disc => disc && disc.source === "faith" && disc.faith === faith)
      .map(disc => [disc.presetKey, disc])
  );

  userState.disciplines = userState.disciplines.filter(disc =>
    disc && disc.source !== "faith" && disc.id !== FAITH_DISCIPLINE_ID
  );

  const presets = FAITH_PRESETS[faith] || FAITH_PRESETS["Other / Custom Later"];
  const generated = presets.map(preset => buildFaithDiscipline(faith, preset, existingFaithDisciplines.get(preset.key) || {}));
  userState.disciplines.unshift(...generated);

  return userState;
}

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  boot: $("#boot"),
  bootCompound: $("#bootCompound"),
  clock: $("#clock"),
  viewEyebrow: $("#viewEyebrow"),
  viewTitle: $("#viewTitle"),
  viewCopy: $("#viewCopy"),
  trackPanel: $("#trackPanel"),
  trackKicker: $("#trackKicker"),
  trackTitle: $("#trackTitle"),
  trackCopy: $("#trackCopy"),
  metricCXP: $("#metricCXP"),
  metricKXP: $("#metricKXP"),
  metricSXP: $("#metricSXP"),
  metricTDS: $("#metricTDS"),
  metricDays: $("#metricDays"),
  metricCompound: $("#metricCompound"),
  metricQuests: $("#metricQuests"),
  metricDue: $("#metricDue"),
  metricNet: $("#metricNet"),
  metricFlow: $("#metricFlow"),
  rankName: $("#rankName"),
  rankProgress: $("#rankProgress"),
  rankCurrent: $("#rankCurrent"),
  rankNext: $("#rankNext"),
  activeList: $("#activeList"),
  archiveList: $("#archiveList"),
  fullArchiveList: $("#fullArchiveList"),
  intelDue: $("#intelDue"),
  intelPotential: $("#intelPotential"),
  intelArchived: $("#intelArchived"),
  financeAssets: $("#financeAssets"),
  financeLiabilities: $("#financeLiabilities"),
  financeNet: $("#financeNet"),
  financeIncome: $("#financeIncome"),
  financeExpenses: $("#financeExpenses"),
  financeFlow: $("#financeFlow"),
  financeFlowLine: $("#financeFlowLine"),
  questModal: $("#questModal"),
  questTitle: $("#questTitle"),
  questDifficulty: $("#questDifficulty"),
  questDue: $("#questDue"),
  questPrimarySkill: $("#questPrimarySkillInput"),
  questSupportSkills: $("#questSupportSkillsInput"),
  questDescription: $("#questDescription"),
  noteModal: $("#noteModal"),
  noteXP: $("#noteXP"),
  noteText: $("#noteText"),
  financeModal: $("#financeModal"),
  editAssets: $("#editAssets"),
  editLiabilities: $("#editLiabilities"),
  editIncome: $("#editIncome"),
  editExpenses: $("#editExpenses"),
  toast: $("#toast"),
  serendipityIndicator: $("#serendipityIndicator"),
  serendipityCountdown: $("#serendipityCountdown"),
  disciplineModal: $("#disciplineModal"),
  disciplineName: $("#disciplineNameInput"),
  disciplineCategory: $("#disciplineCategoryInput"),
  disciplineTime: $("#disciplineTimeInput"),
  disciplineDuration: $("#disciplineDurationInput"),
  disciplineFrequency: $("#disciplineFrequencyInput"),
  disciplineXP: $("#disciplineXPInput"),
  disciplineProtocol: $("#disciplineProtocolInput"),
  identityGrid: $("#identityGrid"),
  identityName: $("#identityName"),
  identityArchetype: $("#identityArchetype"),
  identityTier: $("#identityTier"),
  identityFaith: $("#identityFaith"),
  skillsList: $("#skillsList"),
  identityModal: $("#identityModal"),
  editName: $("#editName"),
  editArchetype: $("#editArchetype"),
  editTier: $("#editTier"),
  editFaith: $("#editFaith"),
  skillModal: $("#skillModal"),
  skillName: $("#skillName"),
  skillCategory: $("#skillCategory"),
  skillXP: $("#skillXP"),
  incomeModal: $("#incomeModal"),
  incomePosition: $("#incomePositionInput"),
  incomeEmployer: $("#incomeEmployerInput"),
  incomeRate: $("#incomeRateInput"),
  incomeBaseHours: $("#incomeBaseHoursInput"),
  incomeExtendedHours: $("#incomeExtendedHoursInput"),
  incomeMaxHours: $("#incomeMaxHoursInput"),
  pipelineModal: $("#pipelineModal"),
  pipelineCompany: $("#pipelineCompanyInput"),
  pipelineRole: $("#pipelineRoleInput"),
  pipelineStage: $("#pipelineStageInput"),
  pipelineNotes: $("#pipelineNotesInput"),
  echoModal: $("#echoModal"),
  echoTitle: $("#echoTitleInput"),
  echoReflection: $("#echoReflectionInput"),
  echoPattern: $("#echoPatternInput"),
  echoTone: $("#echoToneInput"),
  echoImportance: $("#echoImportanceInput"),
  taskModal: $("#taskModal"),
  taskTitle: $("#taskTitleInput"),
  taskCategory: $("#taskCategoryInput"),
  taskDue: $("#taskDueInput"),
  taskUrgency: $("#taskUrgencyInput"),
  taskEnergy: $("#taskEnergyInput"),
  taskConsequence: $("#taskConsequenceInput"),
  taskRecurring: $("#taskRecurringInput"),
  taskNotes: $("#taskNotesInput"),
  resumeText: $("#resumeTextInput"),
  coachExportModal: $("#coachExportModal"),
  coachExportText: $("#coachExportText")
};

function syncActiveRankHistory(userState) {
  if (!userState.identity) userState.identity = { ...defaultState.identity };
  if (!RANK_CONFIG.tiers.includes(userState.identity.tier)) {
    userState.identity.tier = "E";
  }

  const rank = userState.identity.tier;
  const now = new Date().toISOString();
  const enteredAt = userState.identity.lastUpdated || userState.identity.startDate || now;
  const rankHistory = Array.isArray(userState.rankHistory) ? userState.rankHistory : [];
  const hasMatchingOpenRank = rankHistory.some(entry => entry && entry.rank === rank && entry.exitedAt === null);

  if (hasMatchingOpenRank) {
    userState.rankHistory = rankHistory;
    return userState;
  }

  userState.rankHistory = rankHistory
    .filter(Boolean)
    .map(entry => entry.exitedAt === null ? { ...entry, exitedAt: now } : entry);

  userState.rankHistory.push({ rank, enteredAt, exitedAt: null });
  return userState;
}

function normalizeQuest(quest = {}) {
  const migrated = !quest.rarity && quest.difficulty
    ? (() => { const { difficulty, ...rest } = quest; return { ...rest, rarity: difficulty }; })()
    : { ...quest };
  migrated.xpType = migrated.xpType || "competence";
  migrated.primarySkill = migrated.primarySkill || null;
  migrated.supportSkills = Array.isArray(migrated.supportSkills) ? migrated.supportSkills : [];
  migrated.skillXpEarned = migrated.skillXpEarned && typeof migrated.skillXpEarned === "object"
    ? migrated.skillXpEarned
    : {};
  const formulaCXP = Number(migrated.raw_cxp ?? migrated.raw_xp ?? migrated.cxp_earned ?? migrated.xp_earned) || 0;
  migrated.cxp_earned = formulaCXP;
  if (migrated.raw_cxp === undefined && formulaCXP) migrated.raw_cxp = formulaCXP;
  migrated.rawInputs = normalizeRawInputs(migrated);
  return migrated;
}

// Structured mirror of the raw Doc 10 inputs that produced a quest's XP.
// Nullable: quests with no captured inputs keep rawInputs === null.
// skillWeights / spiritualRelevance are forward hooks (V2 / V1 spiritual tab).
function normalizeRawInputs(quest = {}) {
  const ri = (quest.rawInputs && typeof quest.rawInputs === 'object') ? quest.rawInputs : null;
  if (ri) {
    return {
      minutes: ri.minutes ?? null,
      quality: ri.quality ?? null,
      K: ri.K ?? null,
      P: ri.P ?? null,
      A: ri.A ?? null,
      skillWeights: Array.isArray(ri.skillWeights) ? ri.skillWeights : [],
      spiritualRelevance: ri.spiritualRelevance ?? null
    };
  }
  // Backfill from legacy flat fields if any were captured; otherwise null.
  const hasFlat = quest.minutesFocused != null || quest.qualityBand != null ||
    quest.knowHow != null || quest.problemSolving != null || quest.accountability != null;
  if (!hasFlat) return null;
  return {
    minutes: quest.minutesFocused ?? null,
    quality: quest.qualityBand ?? null,
    K: quest.knowHow ?? null,
    P: quest.problemSolving ?? null,
    A: quest.accountability ?? null,
    skillWeights: [],
    spiritualRelevance: null
  };
}

function normalizeSpiritualPractice(practice = {}, index = 0) {
  const fallback = defaultState.spiritualPractices[index] || {};
  return {
    ...fallback,
    ...practice,
    id: practice.id || fallback.id || createId("sxp"),
    name: practice.name || fallback.name || "Spiritual Practice",
    ritualType: XP_ENGINE.ritualValues[practice.ritualType] ? practice.ritualType : (fallback.ritualType || "reflection"),
    presence: XP_ENGINE.presenceMultipliers[practice.presence] ? practice.presence : (fallback.presence || "present"),
    consistencyDays: Number(practice.consistencyDays ?? practice.streakDays ?? fallback.consistencyDays) || 1,
    depth: XP_ENGINE.depthModifiers[practice.depth] ? practice.depth : (fallback.depth || "beginner")
  };
}

function normalizeState(raw) {
  const merged = {
    ...defaultState,
    ...raw,
    financials: {
      ...defaultState.financials,
      ...(raw && raw.financials ? raw.financials : {})
    }
  };

  merged.activeQuests = Array.isArray(merged.activeQuests) ? merged.activeQuests : [];
  merged.jobPipeline = (Array.isArray(merged.jobPipeline) && merged.jobPipeline.length > 0)
    ? merged.jobPipeline
    : [...defaultState.jobPipeline];
  merged.disciplines = (Array.isArray(merged.disciplines) && merged.disciplines.length > 0)
    ? merged.disciplines.map(normalizeDiscipline)
    : [...defaultState.disciplines];
  merged.disciplineLog = Array.isArray(merged.disciplineLog) ? merged.disciplineLog : [];
  // Echo: reflective log. Safe migration default for older saves that predate it.
  merged.echoes = Array.isArray(merged.echoes) ? merged.echoes.map(normalizeEcho) : [];
  // Tasks: maintenance layer (no XP). Safe migration default for older saves.
  merged.tasks = Array.isArray(merged.tasks) ? merged.tasks.map(normalizeTask) : [];
  // Resume import profile. Safe migration default for older saves.
  const rp = (merged.resumeProfile && typeof merged.resumeProfile === 'object') ? merged.resumeProfile : {};
  merged.resumeProfile = {
    rawText: typeof rp.rawText === 'string' ? rp.rawText : "",
    extractedSkills: Array.isArray(rp.extractedSkills) ? rp.extractedSkills : [],
    approvedSkillIds: Array.isArray(rp.approvedSkillIds) ? rp.approvedSkillIds : [],
    suggestedQuests: Array.isArray(rp.suggestedQuests) ? rp.suggestedQuests : []
  };
  merged.spiritualPractices = (Array.isArray(merged.spiritualPractices) && merged.spiritualPractices.length > 0)
    ? merged.spiritualPractices.map(normalizeSpiritualPractice)
    : [...defaultState.spiritualPractices];
  merged.skills = (Array.isArray(merged.skills) && merged.skills.length > 0)
    ? merged.skills
    : [...defaultState.skills];
  merged.incomeConfig = merged.incomeConfig || defaultState.incomeConfig;
  merged.archivedQuests = Array.isArray(merged.archivedQuests) ? merged.archivedQuests : [];
  merged.dailyXPLedger = (merged.dailyXPLedger && typeof merged.dailyXPLedger === 'object')
    ? merged.dailyXPLedger : {};
  merged.xpLog = Array.isArray(merged.xpLog) ? merged.xpLog : [];
  merged.activeQuests = merged.activeQuests.map(normalizeQuest);
  merged.archivedQuests = merged.archivedQuests.map(normalizeQuest);
  merged.totalXP = Number(merged.totalXP) || 0;
  merged.daysTracked = Number(merged.daysTracked) || 0;

  merged.identity = { ...defaultState.identity, ...(raw && raw.identity ? raw.identity : {}) };
  merged.identity.archetype = normalizeArchetype(merged.identity.archetype);
  merged.identity.faith = cleanFaithValue(merged.identity.faith);
  if (!merged.identity.cycleDay && merged.daysTracked) {
    merged.identity.cycleDay = Number(merged.daysTracked) + 1;
  }

  // --- Rank state machine (E -> SSS) ---
  // Migrate any legacy tier name (Initiate..Prime) to the base tier.
  if (!RANK_CONFIG.tiers.includes(merged.identity.tier)) {
    merged.identity.tier = "E";
  }
  merged.titlesEarned = Array.isArray(merged.titlesEarned) ? merged.titlesEarned : [];
  // "Awakened" is auto-awarded to every operator the moment they enter KAIRU.
  if (!merged.titlesEarned.includes("Awakened")) merged.titlesEarned.unshift("Awakened");
  merged.activeTitle = merged.activeTitle || "Awakened";
  merged.verifiedCredentials = Number(merged.verifiedCredentials) || 0;
  merged.specialConditionsMet = (merged.specialConditionsMet && typeof merged.specialConditionsMet === 'object')
    ? merged.specialConditionsMet : {};
  merged.rankHistory = Array.isArray(merged.rankHistory) ? merged.rankHistory : [];
  merged.serendipity = (merged.serendipity && typeof merged.serendipity === 'object')
    ? {
        buffExpiry: Number(merged.serendipity.buffExpiry) || 0,
        multiplier: Number(merged.serendipity.multiplier) || 1.0,
        source: merged.serendipity.source || null,
        flaggedQuestId: merged.serendipity.flaggedQuestId || null
      }
    : structuredClone(defaultState.serendipity);
  syncActiveRankHistory(merged);
  syncFaithDiscipline(merged);

  return merged;
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (raw) state = normalizeState(raw);
  } catch (error) {
    state = structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function compound() {
  return Math.pow(1.01, state.daysTracked);
}

function isTrackedToday() {
  return state.lastTrackDate === localToday();
}

function questBaseXP(quest) {
  if (quest.rawXPBeforeCaps !== null && quest.rawXPBeforeCaps !== undefined) {
    return Number(quest.base_xp) || 0;
  }
  return XP_TIERS[quest.rarity || quest.difficulty] || XP_TIERS.Common;
}

function calculateSXP(practice) {
  return XP_ENGINE.calculateSXP(practice);
}

function parseSkillList(value, primarySkill = "") {
  const primary = String(primarySkill || "").trim().toLowerCase();
  return [...new Set(String(value || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean))]
    .filter(skill => skill.toLowerCase() !== primary);
}

function refreshQuestSkillOptions() {
  const select = document.getElementById("questPrimarySkillInput");
  if (!select) return;
  const skills = Array.isArray(state.skills) ? state.skills : [];
  select.innerHTML = '<option value="">None</option>' + skills
    .map(skill => `<option value="${escapeHTML(skill.name)}">${escapeHTML(skill.name)}</option>`)
    .join("");
}

function applySkillXPAllocation(skillXpEarned = {}) {
  const entries = Object.entries(skillXpEarned);
  if (!entries.length || !Array.isArray(state.skills)) return;
  entries.forEach(([name, amount]) => {
    const skill = state.skills.find(item => String(item.name || "").toLowerCase() === String(name).toLowerCase());
    if (skill) skill.xp = Math.round((Number(skill.xp) || 0) + (Number(amount) || 0));
  });
}

// Compact "Skill +N · Skill +N" breakdown of an allocation map, for completion
// feedback. Sorted high-to-low; caps the visible list so the toast stays short.
function formatSkillXPBreakdown(skillXpEarned = {}, maxShown = 2) {
  const entries = Object.entries(skillXpEarned)
    .map(([name, amount]) => [name, Number(amount) || 0])
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "";
  const shown = entries.slice(0, maxShown)
    .map(([name, amount]) => `${name} +${amount.toLocaleString()}`)
    .join(" · ");
  const extra = entries.length - maxShown;
  return extra > 0 ? `${shown} · +${extra} more` : shown;
}

function getCompetenceXP() {
  return (state.archivedQuests || []).reduce((sum, quest) => {
    return sum + (Number(quest.cxp_earned ?? quest.xp_earned) || 0);
  }, 0);
}

function getQuestAllocatedKXP() {
  return (state.archivedQuests || []).reduce((sum, quest) => {
    const skillXP = quest.skillXpEarned && typeof quest.skillXpEarned === "object"
      ? Object.values(quest.skillXpEarned).reduce((inner, value) => inner + (Number(value) || 0), 0)
      : 0;
    return sum + skillXP;
  }, 0);
}

function getSkillXP() {
  return (state.skills || []).reduce((sum, skill) => sum + (Number(skill.xp) || 0), 0);
}

// Discipline categories that count as spiritual cultivation. Completing one of
// these disciplines feeds Spiritual XP (SXP) so prayer / faith / spiritual reps
// produce visible spiritual progression, not just generic XP.
const SPIRITUAL_DISCIPLINE_CATEGORIES = ["Spiritual", "Faith / Belief"];

function isSpiritualDiscipline(disc) {
  return !!disc && SPIRITUAL_DISCIPLINE_CATEGORIES.includes(disc.category);
}

// SXP earned from logged spiritual/faith disciplines. Derived from disciplineLog
// (the same source of truth as discipline streaks) so it stays in sync with what
// the user has actually completed. Entries whose discipline has been deleted are
// ignored.
function getDisciplineSpiritualXP() {
  const log = Array.isArray(state.disciplineLog) ? state.disciplineLog : [];
  const discs = Array.isArray(state.disciplines) ? state.disciplines : [];
  const spiritualIds = new Set(discs.filter(isSpiritualDiscipline).map(d => d.id));
  if (!spiritualIds.size) return 0;
  return log.reduce((sum, entry) => {
    return spiritualIds.has(entry.disciplineId)
      ? sum + (Number(entry.postedXP) || 0)
      : sum;
  }, 0);
}

// SXP earned from spiritual/faith disciplines logged on a specific date (default
// today). Used by the Coach Brief to report spiritual consistency per day.
function getDisciplineSpiritualXPOn(dateString = localToday()) {
  const log = Array.isArray(state.disciplineLog) ? state.disciplineLog : [];
  const discs = Array.isArray(state.disciplines) ? state.disciplines : [];
  const spiritualIds = new Set(discs.filter(isSpiritualDiscipline).map(d => d.id));
  if (!spiritualIds.size) return 0;
  return log.reduce((sum, entry) => {
    return (entry.date === dateString && spiritualIds.has(entry.disciplineId))
      ? sum + (Number(entry.postedXP) || 0)
      : sum;
  }, 0);
}

function getSpiritualXP() {
  const practicesSXP = (state.spiritualPractices || []).reduce((sum, practice) => sum + calculateSXP(practice), 0);
  return practicesSXP + getDisciplineSpiritualXP();
}

function getDevelopmentTotals() {
  const cxp = getCompetenceXP();
  const kxp = getSkillXP();
  const sxp = getSpiritualXP();
  return { cxp, kxp, sxp, tds: cxp + kxp + sxp };
}

function dueSoonCount() {
  const today = new Date(`${localToday()}T00:00:00`);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 7);

  return state.activeQuests.filter((quest) => {
    if (!quest.due_date) return false;
    const due = new Date(`${quest.due_date}T00:00:00`);
    return !Number.isNaN(due.valueOf()) && due <= soon;
  }).length;
}

function potentialXP() {
  return state.activeQuests.reduce((sum, quest) => sum + questBaseXP(quest), 0);
}

function renderRank() {
  const ev = evaluateRankProgress(state);
  const title = state.activeTitle ? ` · ${state.activeTitle}` : "";

  // Persistent header HUD: rank letter + competence XP, visible app-wide.
  const brandRankValue = document.getElementById('brandRankValue');
  if (brandRankValue) brandRankValue.textContent = state.identity.tier;
  const brandRankCXP = document.getElementById('brandRankCXP');
  if (brandRankCXP) brandRankCXP.textContent = getCompetenceXP().toLocaleString() + ' CXP';

  els.rankName.textContent = state.identity.tier;
  els.rankProgress.style.width = `${ev.progress}%`;
  els.rankCurrent.textContent = `${state.identity.tier}-Rank${title}`;

  if (ev.atMaxRank) {
    els.rankNext.textContent = "Apex // The Kairu";
  } else {
    const hard = ev.requirements.filter(r => !r.soft);
    const met = hard.filter(r => r.met).length;
    els.rankNext.textContent = `Next ${ev.nextRank} · ${met}/${hard.length} gates`;
  }

  const gatesEl = document.getElementById('rankGates');
  if (gatesEl) {
    if (ev.atMaxRank) {
      gatesEl.innerHTML = '<div class="rank-gate met"><span>✓ Apex tier reached</span><b>The Kairu</b></div>';
    } else {
      gatesEl.innerHTML = ev.requirements.map(r => {
        const cur = typeof r.current === 'number' ? r.current.toLocaleString() : r.current;
        const req = typeof r.required === 'number' ? r.required.toLocaleString() : r.required;
        const cls = r.met ? 'met' : (r.soft ? 'soft' : 'unmet');
        const mark = r.met ? '✓' : (r.soft ? '◦' : '○');
        return `<div class="rank-gate ${cls}"><span>${mark} ${escapeHTML(r.label)}</span><b>${cur} / ${req}</b></div>`;
      }).join('');
    }
  }

  const ascendBtn = document.getElementById('ascendBtn');
  if (ascendBtn) ascendBtn.hidden = ev.atMaxRank || !canAdvanceRank(state);
}

function formatMoney(value) {
  const number = Number(value) || 0;
  const prefix = number < 0 ? "-$" : "$";
  return prefix + Math.abs(number).toLocaleString();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function difficultyClass(difficulty) {
  return String(difficulty || "Common").toLowerCase();
}

function setView(view) {
  $$(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === view));
  $$(".view").forEach((section) => section.classList.toggle("active", section.id === view));

  // Mobile bottom nav: highlight the matching primary item. Views that live behind
  // the "More" sheet (tasks/pipeline/financial/archive) leave every primary inactive.
  $$(".bottom-nav__item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  closeMore();

  const nextCopy = copy[view];
  if (nextCopy) {
    els.viewEyebrow.textContent = nextCopy.eyebrow;
    els.viewTitle.textContent = nextCopy.title;
  }
  updateViewStatus();

  // Bring the freshly shown view into focus on mobile (content scrolls under header).
  const mainEl = document.querySelector(".main");
  if (mainEl) mainEl.scrollTo({ top: 0, behavior: "auto" });
}

function openMore() {
  const sheet = document.getElementById("moreSheet");
  if (sheet) sheet.classList.add("open");
}

function closeMore() {
  const sheet = document.getElementById("moreSheet");
  if (sheet) sheet.classList.remove("open");
}

function trackToday() {
  if (isTrackedToday()) {
    showToast("Already tracked today");
    return;
  }

  state.daysTracked += 1;
  state.lastTrackDate = localToday();
  saveState();
  renderAll();
  showToast("Tracking locked // +3% XP active");
}

function openQuest() {
  els.questTitle.value = "";
  els.questDifficulty.value = "Rare";
  els.questDue.value = "";
  refreshQuestSkillOptions();
  if (els.questPrimarySkill) els.questPrimarySkill.value = "";
  if (els.questSupportSkills) els.questSupportSkills.value = "";
  els.questDescription.value = "";
  document.getElementById('questMinutes').value = '';
  document.getElementById('questQuality').value = '1.00';
  document.getElementById('questKnowHow').value = '3';
  document.getElementById('questProblemSolving').value = '3';
  document.getElementById('questAccountability').value = '3';
  document.getElementById('doc10Preview').style.display = 'none';
  syncXP();
  showModal(els.questModal);
  window.setTimeout(() => els.questTitle.focus(), 50);
}

function closeQuest() {
  hideModal(els.questModal);
}

function computeDoc10XP() {
  const minutes = parseFloat(document.getElementById('questMinutes').value);
  const quality = parseFloat(document.getElementById('questQuality').value);
  const k = parseFloat(document.getElementById('questKnowHow').value);
  const p = parseFloat(document.getElementById('questProblemSolving').value);
  const a = parseFloat(document.getElementById('questAccountability').value);

  if (!minutes || !quality || !k || !p || !a) return null;

  const C = 0.35 * (k / 3) + 0.25 * (p / 3) + 0.40 * (a / 3);
  return Math.round(minutes * quality * C);
}

function syncXP() {
  const doc10XP = computeDoc10XP();
  const preview = document.getElementById('doc10Preview');
  const previewVal = document.getElementById('doc10XPValue');

  if (doc10XP !== null) {
    preview.style.display = 'block';
    previewVal.textContent = doc10XP.toLocaleString() + ' CXP';
  } else {
    preview.style.display = 'none';
  }
}

function saveQuest() {
  const minutes = parseFloat(document.getElementById('questMinutes').value);
  const quality = parseFloat(document.getElementById('questQuality').value);
  const knowHow = parseFloat(document.getElementById('questKnowHow').value);
  const problemSolving = parseFloat(document.getElementById('questProblemSolving').value);
  const accountability = parseFloat(document.getElementById('questAccountability').value);

  if (!minutes || minutes < 1) {
    showToast('Doc 10: focused minutes required');
    document.getElementById('questMinutes').focus();
    return;
  }
  if (!quality) {
    showToast('Doc 10: quality band required');
    document.getElementById('questQuality').focus();
    return;
  }
  if (!knowHow) {
    showToast('Doc 10: Know-How score required');
    document.getElementById('questKnowHow').focus();
    return;
  }
  if (!problemSolving) {
    showToast('Doc 10: Problem Solving score required');
    document.getElementById('questProblemSolving').focus();
    return;
  }
  if (!accountability) {
    showToast('Doc 10: Accountability score required');
    document.getElementById('questAccountability').focus();
    return;
  }

  const title = els.questTitle.value.trim();
  if (!title) {
    showToast("Quest title required");
    els.questTitle.focus();
    return;
  }

  if (title.length > 80) {
    showToast("Title must be 80 characters or fewer");
    els.questTitle.focus();
    return;
  }

  const difficulty = els.questDifficulty.value;
  const baseXP = computeDoc10XP();
  const primarySkill = els.questPrimarySkill ? els.questPrimarySkill.value.trim() || null : null;
  const supportSkills = parseSkillList(els.questSupportSkills ? els.questSupportSkills.value : "", primarySkill);

  const due = els.questDue.value;
  const today = localToday();
  if (!due || due < today) {
    showToast("Due date must be today or later");
    els.questDue.focus();
    return;
  }

  const description = els.questDescription.value.trim() || null;

  state.activeQuests.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    title,
    rarity: difficulty,
    base_xp: baseXP,
    date_created: today,
    due_date: due,
    date_completed: null,
    status: "In Progress",
    xpType: "competence",
    xp_earned: 0,
    cxp_earned: 0,
    primarySkill,
    supportSkills,
    skillXpEarned: {},
    is_locked: false,
    completion_note: null,
    description,
    serendipity_flagged: false,
    minutesFocused: minutes,
    qualityBand: quality,
    knowHow,
    problemSolving,
    accountability,
    rawInputs: {
      minutes,
      quality,
      K: knowHow,
      P: problemSolving,
      A: accountability,
      skillWeights: [],        // V2 hook
      spiritualRelevance: null // V1 spiritual tab hook
    },
    rawXPBeforeCaps: baseXP
  });

  maybeBacklogEcho(); // Echo: warn when open loops pile up (no XP awarded)
  saveState();
  closeQuest();
  renderAll();
  setView("quests");
  showToast("Quest deployed");
}

function findQuestIndex(id) {
  return state.activeQuests.findIndex((quest) => quest.id === id);
}

// ============================================================
// DAILY XP CAP ENGINE (Doc 10 compliance)
// Soft cap: 300 raw XP/day posts at 100%
// Overflow: 301-500 raw XP/day posts at 50%
// Hard stop: above 500 raw XP/day posts at 0%
// ============================================================

function getDailyRawXP(dateString) {
  const ledger = state.dailyXPLedger || {};
  const entry = ledger[dateString];
  return entry ? (Number(entry.rawXP) || 0) : 0;
}

function calculatePostableXP(rawXP, dateString) {
  const alreadyToday = getDailyRawXP(dateString);
  const softCap = 300;
  const hardCap = 500;

  if (alreadyToday >= hardCap) {
    return { rawXP, postedXP: 0, band: 'hardstop' };
  }

  const remaining = hardCap - alreadyToday;
  const primeRemaining = Math.max(0, softCap - alreadyToday);

  let postedXP = 0;

  if (rawXP <= primeRemaining) {
    postedXP = rawXP;
  } else {
    const primeChunk = primeRemaining;
    const overflowRaw = Math.min(rawXP - primeChunk, remaining - primeChunk);
    postedXP = primeChunk + Math.floor(overflowRaw * 0.5);
  }

  const band = alreadyToday >= softCap ? 'overflow'
    : (alreadyToday + rawXP > softCap ? 'overflow' : 'prime');

  return { rawXP, postedXP, band };
}

// Auto-advance the operating cycle the first time any XP-earning activity is
// logged on a new day. "Days Tracked" is meant to reflect intentional active
// days; relying on the manual Track button alone left it stagnant for users who
// were clearly active (completing quests / disciplines). Returns true if it
// advanced the counter this call. The explicit Track button still works.
function ensureTrackedToday() {
  if (isTrackedToday()) return false;
  state.daysTracked += 1;
  state.lastTrackDate = localToday();
  return true;
}

function recordDailyXP(rawXP, postedXP, dateString) {
  ensureTrackedToday();
  if (!state.dailyXPLedger) state.dailyXPLedger = {};
  const existing = state.dailyXPLedger[dateString] || { rawXP: 0, postedXP: 0 };
  state.dailyXPLedger[dateString] = {
    rawXP: existing.rawXP + rawXP,
    postedXP: existing.postedXP + postedXP
  };
}

function recordXPEvent(source, rawXP, postedXP, band, metadata = {}) {
  if (!Array.isArray(state.xpLog)) state.xpLog = [];
  state.xpLog.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    source,
    rawXP,
    postedXP,
    band,
    ...metadata
  });
}

function completeQuest(questId) {
  const index = findQuestIndex(questId);
  const quest = state.activeQuests[index];
  if (!quest) return;

  if (quest.is_locked) {
    showToast("Quest already locked");
    return;
  }

  quest.date_completed = localToday();
  quest.status = "Completed";
  const rawCXP = XP_ENGINE.calculateCXP(questBaseXP(quest), getActiveMultiplier());
  const today = localToday();
  const capResult = calculatePostableXP(rawCXP, today);
  const skillXpEarned = XP_ENGINE.allocateKXP(
    rawCXP,
    quest.rarity || quest.difficulty,
    quest.primarySkill,
    quest.supportSkills
  );
  const totalKXP = Object.values(skillXpEarned).reduce((sum, value) => sum + (Number(value) || 0), 0);
  quest.xpType = "competence";
  quest.xp_earned = capResult.postedXP;
  quest.cxp_earned = rawCXP;
  quest.raw_xp = capResult.rawXP;
  quest.raw_cxp = rawCXP;
  quest.xp_band = capResult.band;
  quest.skillXpEarned = skillXpEarned;
  applySkillXPAllocation(skillXpEarned);
  state.totalXP += capResult.postedXP;
  recordDailyXP(capResult.rawXP, capResult.postedXP, today);
  recordXPEvent(
    'quest',
    rawCXP,
    rawCXP,
    'competence',
    {
      questTitle: quest.title,
      rarity: quest.rarity || quest.difficulty,
      economy: "CXP",
      legacyPostedXP: capResult.postedXP,
      legacyBand: capResult.band,
      kxpEarned: totalKXP,
      primarySkill: quest.primarySkill || null,
      supportSkills: quest.supportSkills || []
    }
  );
  quest.is_locked = true;

  state.archivedQuests.unshift(quest);
  state.activeQuests.splice(index, 1);

  generateQuestEcho(quest); // Echo: reflective log only — no XP awarded

  saveState();
  if (els.noteModal.classList.contains("show")) hideModal(els.noteModal);
  renderAll();
  const bandMsg = capResult.band === 'hardstop'
    ? ` // legacy daily cap reached`
    : capResult.band === 'overflow'
    ? ` // legacy cap posted +${capResult.postedXP}`
    : '';
  showXPFlash(`+${rawCXP.toLocaleString()} CXP`);
  const skillBreakdown = formatSkillXPBreakdown(skillXpEarned);
  const skillMsg = skillBreakdown
    ? ` // ${skillBreakdown}`
    : (totalKXP ? ` // +${totalKXP.toLocaleString()} KXP` : "");
  showToast(`Chronicled // +${rawCXP.toLocaleString()} CXP${skillMsg}${bandMsg}`);

  promptContributor(questId);
}

function logContribution(questId, contactName, contributionType, note) {
  const contributors = JSON.parse(localStorage.getItem('questContributors') || '[]');
  contributors.push({
    contribution_id: 'con_' + Date.now(),
    contact_name: contactName.trim(),
    quest_id: questId,
    contribution_type: contributionType,
    data_source: 'USER_CLAIMED',
    logged_at: new Date().toISOString(),
    note: note || null
  });
  localStorage.setItem('questContributors', JSON.stringify(contributors));
}

function getTopContributors(limit = 5) {
  const contributors = JSON.parse(localStorage.getItem('questContributors') || '[]');
  const frequency = contributors.reduce((acc, entry) => {
    acc[entry.contact_name] = (acc[entry.contact_name] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, contributions: count }));
}

// Post-completion prompt: offer to log a contributor for the quest. Built to match
// the file's existing static modal markup (.modal-bg/.modal + .btn data-actions) but
// created on the fly and self-wired, so it stays out of the global modal handler.
// Skip simply removes the modal — completeQuest() has already finished (XP awarded,
// quest archived) by the time this runs, so dismissing never blocks completion.
function promptContributor(questId) {
  const CONTRIBUTION_TYPES = [
    'ADVICE', 'INTRODUCTION', 'ACCOUNTABILITY',
    'COLLABORATION', 'RESOURCE', 'GUIDANCE', 'SPONSORSHIP'
  ];

  const modal = document.createElement('div');
  modal.className = 'modal-bg show';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'contributorModalTitle');
  modal.innerHTML = `
    <div class="modal">
      <h2 id="contributorModalTitle">Did anyone help advance this quest?</h2>
      <label>
        Contributor Name
        <input type="text" id="contributorName" placeholder="Who moved this forward?">
      </label>
      <label>
        Contribution Type
        <select id="contributorType">
          ${CONTRIBUTION_TYPES.map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>
      </label>
      <label>
        Note (optional)
        <textarea id="contributorNote" placeholder="How did they help?"></textarea>
      </label>
      <div class="modal-foot">
        <button class="btn primary" type="button" data-action="log-contributor">Log Contributor</button>
        <button class="btn ghost" type="button" data-action="skip-contributor">Skip</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const close = () => modal.remove();

  modal.querySelector('[data-action="skip-contributor"]').addEventListener('click', close);
  modal.querySelector('[data-action="log-contributor"]').addEventListener('click', () => {
    const name = modal.querySelector('#contributorName').value;
    if (!name.trim()) { close(); return; }
    const type = modal.querySelector('#contributorType').value;
    const note = modal.querySelector('#contributorNote').value;
    logContribution(questId, name, type, note);
    showToast(`Contributor logged // ${name.trim()}`);
    close();
  });
}

function flagSerendipity(questId) {
  const quest = state.activeQuests.find((q) => q.id === questId);
  if (!quest || quest.serendipity_flagged || quest.is_locked) return;

  const buffExpiry = Date.now() + (24 * 60 * 60 * 1000);
  state.serendipity = {
    buffExpiry,
    multiplier: 1.5,
    source: 'serendipity_flag',
    flaggedQuestId: questId
  };
  const today = localToday();
  const capResult = calculatePostableXP(250, today);
  state.totalXP += capResult.postedXP;
  recordDailyXP(capResult.rawXP, capResult.postedXP, today);
  recordXPEvent(
    'serendipity',
    capResult.rawXP,
    capResult.postedXP,
    capResult.band,
    { questTitle: quest.title }
  );

  quest.serendipity_flagged = true;
  saveState();
  renderAll();
  showXPFlash(`+${capResult.postedXP.toLocaleString()} XP`);
  showToast(`Serendipity flagged // +${capResult.postedXP.toLocaleString()} XP // 1.5x active`);
}

function getActiveMultiplier() {
  const ser = state.serendipity || {};
  const buffExpiry = Number(ser.buffExpiry) || 0;
  let multiplier = 1.0;

  if (Date.now() < buffExpiry) {
    multiplier *= (Number(ser.multiplier) || 1.5);
  }

  if (isTrackedToday()) {
    multiplier *= 1.03;
  }

  return multiplier;
}

/* ===================== ECHO SYSTEM =====================
   Echo is the reflective intelligence layer: short logs generated after
   meaningful activity. It is NOT XP, NOT a quest, NOT a task. It never
   awards XP and never mutates progression state. */
const ECHO_MILESTONES = [3, 7, 14, 30];
const ECHO_BACKLOG_THRESHOLD = 8;
const ECHO_SOURCE_TYPES = ["quest", "discipline", "task", "manual", "system"];

function normalizeEcho(echo = {}) {
  const importance = Number(echo.importance);
  return {
    id: echo.id || createId("echo"),
    createdAt: echo.createdAt || new Date().toISOString(),
    sourceType: ECHO_SOURCE_TYPES.includes(echo.sourceType) ? echo.sourceType : "manual",
    sourceId: echo.sourceId != null ? String(echo.sourceId) : null,
    title: String(echo.title || "Untitled Echo"),
    reflection: String(echo.reflection || ""),
    patternTag: String(echo.patternTag || "general"),
    suggestedNextAction: String(echo.suggestedNextAction || ""),
    emotionalTone: String(echo.emotionalTone || "neutral"),
    importance: Number.isFinite(importance) ? Math.min(5, Math.max(1, Math.round(importance))) : 3
  };
}

function addEcho(entry) {
  if (!Array.isArray(state.echoes)) state.echoes = [];
  const echo = normalizeEcho(entry);
  state.echoes.unshift(echo);
  // Keep the reflective log bounded so localStorage stays small.
  if (state.echoes.length > 200) state.echoes.length = 200;
  return echo;
}

function echoExists(sourceType, sourceId) {
  return Array.isArray(state.echoes)
    && state.echoes.some(e => e.sourceType === sourceType && e.sourceId === String(sourceId));
}

// Trigger: a completed quest. Summarize, name the affected skill, suggest next.
function generateQuestEcho(quest) {
  if (!quest) return;
  const skillLabel = quest.primarySkill
    || (Array.isArray(quest.supportSkills) && quest.supportSkills[0])
    || "general capability";
  const archetype = (state.identity && state.identity.archetype) || "The Operator";
  const rarity = String(quest.rarity || quest.difficulty || "common").toLowerCase();
  addEcho({
    sourceType: "quest",
    sourceId: quest.id,
    title: `Completed: ${quest.title}`,
    reflection: `A ${rarity} quest closed out, advancing "${skillLabel}" for ${archetype}.`,
    patternTag: "momentum",
    suggestedNextAction: `Stack one smaller follow-up on ${skillLabel} while the thread is warm.`,
    emotionalTone: "driven",
    importance: rarity === "legendary" ? 5 : rarity === "epic" ? 4 : 3
  });
}

// Trigger: a discipline streak hits a milestone (3 / 7 / 14 / 30 days).
function generateDisciplineEcho(disc, streak) {
  if (!disc) return;
  const sourceId = `${disc.id}#${streak}`;
  if (echoExists("discipline", sourceId)) return; // one Echo per milestone
  addEcho({
    sourceType: "discipline",
    sourceId,
    title: `${disc.name} // ${streak}-day streak`,
    reflection: `Consistency is compounding — ${disc.name} has held for ${streak} straight days.`,
    patternTag: "consistency",
    suggestedNextAction: streak >= 30
      ? `Protect the streak: pre-commit tomorrow's ${disc.name} time block now.`
      : `Lock the next rep — schedule ${disc.name} at the same time tomorrow.`,
    emotionalTone: "grounded",
    importance: streak >= 30 ? 5 : streak >= 14 ? 4 : 3
  });
}

// Trigger: the active-quest backlog (open loops) gets high. Once per day.
function maybeBacklogEcho() {
  const open = Array.isArray(state.activeQuests) ? state.activeQuests.length : 0;
  if (open < ECHO_BACKLOG_THRESHOLD) return;
  const sourceId = `backlog#${localToday()}`;
  if (echoExists("system", sourceId)) return;
  addEcho({
    sourceType: "system",
    sourceId,
    title: `Open loops piling up (${open} active)`,
    reflection: `You have ${open} active quests competing for attention. Open loops drain focus even when untouched.`,
    patternTag: "overload",
    suggestedNextAction: "Clear two low-energy quests first to reopen mental bandwidth.",
    emotionalTone: "alert",
    importance: 4
  });
}

function echoTimeAgo(iso) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function openEcho() {
  if (els.echoTitle) els.echoTitle.value = "";
  if (els.echoReflection) els.echoReflection.value = "";
  if (els.echoPattern) els.echoPattern.value = "";
  if (els.echoTone) els.echoTone.value = "neutral";
  if (els.echoImportance) els.echoImportance.value = "3";
  showModal(els.echoModal);
  window.setTimeout(() => els.echoTitle && els.echoTitle.focus(), 50);
}

function closeEcho() {
  hideModal(els.echoModal);
}

function saveEcho() {
  const title = (els.echoTitle.value || "").trim();
  if (!title) {
    showToast("Echo title required");
    els.echoTitle.focus();
    return;
  }
  addEcho({
    sourceType: "manual",
    sourceId: null,
    title,
    reflection: (els.echoReflection.value || "").trim(),
    patternTag: (els.echoPattern.value || "").trim() || "reflection",
    suggestedNextAction: "",
    emotionalTone: els.echoTone.value || "neutral",
    importance: Number(els.echoImportance.value) || 3
  });
  saveState();
  closeEcho();
  renderEchoes();
  showToast("Echo logged");
}

// Whether the collapsed older-echo stack is currently expanded. Older echoes are
// hidden by default so the reflective log doesn't create an endless scroll on
// mobile; the user can expand to see history on demand.
let echoesExpanded = false;

function echoCardHTML(e) {
  const next = e.suggestedNextAction
    ? `<div class="echo-card__next">&rarr; ${escapeHTML(e.suggestedNextAction)}</div>`
    : "";
  const reflection = e.reflection
    ? `<p class="echo-card__reflection">${escapeHTML(e.reflection)}</p>`
    : "";
  return `
    <article class="echo-card">
      <div class="echo-card__head">
        <h4 class="echo-card__title">${escapeHTML(e.title)}</h4>
        <span class="echo-card__time">${escapeHTML(echoTimeAgo(e.createdAt))}</span>
      </div>
      ${reflection}
      <div class="echo-card__foot">
        <span class="pill discipline">${escapeHTML(e.patternTag)}</span>
        ${next}
      </div>
    </article>`;
}

function renderEchoes() {
  const container = document.getElementById("echoList");
  if (!container) return;
  const echoes = Array.isArray(state.echoes) ? state.echoes : [];
  if (!echoes.length) {
    container.innerHTML = '<div class="empty">No echoes yet. Reflections appear here as you complete quests and hold streaks.</div>';
    return;
  }

  const MAX_RENDERED = 10; // keep the rendered log bounded for a light page
  const visible = echoes.slice(0, MAX_RENDERED);
  const latest = visible[0];
  const older = visible.slice(1);

  let html = echoCardHTML(latest);
  if (older.length) {
    const label = echoesExpanded
      ? "Hide previous echoes"
      : `Show ${older.length} previous echo${older.length === 1 ? "" : "es"}`;
    html += `<button class="echo-toggle" type="button" data-action="toggle-echoes" aria-expanded="${echoesExpanded}">${label}</button>`;
    html += `<div class="echo-stack echo-stack--older"${echoesExpanded ? "" : " hidden"}>${older.map(echoCardHTML).join("")}</div>`;
  }
  container.innerHTML = html;
}

/* ===================== TASKS SYSTEM =====================
   Tasks are the maintenance layer. They are NOT quests and NEVER award XP.
   No function in this block calls any XP routine (recordXPEvent /
   recordDailyXP / calculatePostableXP / state.totalXP mutation). */
const TASK_CATEGORIES = ["admin", "chore", "finance", "health", "errand", "reminder", "other"];
const TASK_URGENCY = ["low", "medium", "high"];
const TASK_CONSEQUENCE = ["low", "medium", "high"];
const TASK_RECURRING = ["none", "daily", "weekly", "monthly"];
const TASK_BACKLOG_THRESHOLD = 6; // open loops at/above this trigger an Echo

function normalizeTask(task = {}) {
  const energy = Number(task.energyCost);
  return {
    id: task.id || createId("task"),
    title: String(task.title || "Untitled Task"),
    category: TASK_CATEGORIES.includes(task.category) ? task.category : "other",
    dueDate: task.dueDate || null,
    urgency: TASK_URGENCY.includes(task.urgency) ? task.urgency : "medium",
    energyCost: Number.isFinite(energy) ? Math.min(5, Math.max(1, Math.round(energy))) : 3,
    consequence: TASK_CONSEQUENCE.includes(task.consequence) ? task.consequence : "medium",
    recurring: TASK_RECURRING.includes(task.recurring) ? task.recurring : "none",
    completed: Boolean(task.completed),
    completedAt: task.completedAt || null,
    notes: String(task.notes || "")
  };
}

function isTaskOverdue(task) {
  if (task.completed || !task.dueDate) return false;
  return task.dueDate < localToday();
}

function openTask() {
  if (els.taskTitle) els.taskTitle.value = "";
  if (els.taskCategory) els.taskCategory.value = "other";
  if (els.taskDue) els.taskDue.value = "";
  if (els.taskUrgency) els.taskUrgency.value = "medium";
  if (els.taskEnergy) els.taskEnergy.value = "3";
  if (els.taskConsequence) els.taskConsequence.value = "medium";
  if (els.taskRecurring) els.taskRecurring.value = "none";
  if (els.taskNotes) els.taskNotes.value = "";
  showModal(els.taskModal);
  window.setTimeout(() => els.taskTitle && els.taskTitle.focus(), 50);
}

function closeTask() {
  hideModal(els.taskModal);
}

function saveTask() {
  const title = (els.taskTitle.value || "").trim();
  if (!title) {
    showToast("Task title required");
    els.taskTitle.focus();
    return;
  }
  if (!Array.isArray(state.tasks)) state.tasks = [];
  state.tasks.unshift(normalizeTask({
    title,
    category: els.taskCategory.value,
    dueDate: els.taskDue.value || null,
    urgency: els.taskUrgency.value,
    energyCost: Number(els.taskEnergy.value) || 3,
    consequence: els.taskConsequence.value,
    recurring: els.taskRecurring.value,
    completed: false,
    notes: (els.taskNotes.value || "").trim()
  }));
  maybeTaskBacklogEcho(); // Echo only on backlog pressure (no XP)
  saveState();
  closeTask();
  renderTasks();
  renderReadiness();
  renderEchoes();
  showToast("Task added // no XP");
}

function completeTask(taskId) {
  const task = (state.tasks || []).find(t => t.id === taskId);
  if (!task || task.completed) return;
  // NOTE: deliberately no XP call here. Tasks never bank XP.
  task.completed = true;
  task.completedAt = new Date().toISOString();
  saveState();
  renderTasks();
  renderReadiness();
  showToast("Task cleared // open loop closed");
}

function deleteTask(taskId) {
  if (!Array.isArray(state.tasks)) return;
  const idx = state.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return;
  state.tasks.splice(idx, 1);
  saveState();
  renderTasks();
  renderReadiness();
  showToast("Task deleted");
}

// Echo trigger: ONLY when maintenance backlog pressure is high. Never per task.
function maybeTaskBacklogEcho() {
  const active = (state.tasks || []).filter(t => !t.completed);
  const pressure = active.filter(t => isTaskOverdue(t) || t.consequence === "high").length;
  if (active.length < TASK_BACKLOG_THRESHOLD && pressure <= 3) return;
  const sourceId = `taskbacklog#${localToday()}`;
  if (echoExists("system", sourceId)) return;
  addEcho({
    sourceType: "system",
    sourceId,
    title: "Open Loop Pressure Rising",
    reflection: "Maintenance tasks are stacking. Clear low-energy items before taking on new quests.",
    patternTag: "stability",
    suggestedNextAction: "Clear the lowest-energy tasks first to relieve backlog pressure.",
    emotionalTone: "alert",
    importance: 3
  });
}

function taskTemplate(task) {
  const overdue = isTaskOverdue(task);
  const due = task.dueDate
    ? `${overdue ? "OVERDUE " : "DUE "}${task.dueDate}`
    : "No due date";
  const notes = task.notes ? `<p class="task-row__notes">${escapeHTML(task.notes)}</p>` : "";
  const recurring = task.recurring && task.recurring !== "none"
    ? `<span class="pill">${escapeHTML(task.recurring)}</span>` : "";
  const actions = task.completed
    ? `<button class="btn ghost danger" type="button" data-action="delete-task" data-id="${escapeHTML(task.id)}">Delete</button>`
    : `<button class="btn cyan" type="button" data-action="complete-task" data-id="${escapeHTML(task.id)}">Complete</button>
       <button class="btn ghost danger" type="button" data-action="delete-task" data-id="${escapeHTML(task.id)}">Delete</button>`;
  return `
    <div class="task-row ${task.completed ? "is-done" : ""} ${overdue ? "is-overdue" : ""}">
      <div>
        <h4 class="task-row__title">${escapeHTML(task.title)}</h4>
        <div class="task-row__meta">
          <span class="pill">${escapeHTML(task.category)}</span>
          <span class="pill urg-${escapeHTML(task.urgency)}">${escapeHTML(task.urgency)}</span>
          <span class="pill">energy ${task.energyCost}</span>
          <span class="pill">${escapeHTML(task.consequence)} stakes</span>
          ${recurring}
          <span class="task-row__notes" style="margin:0;font-family:var(--mono);font-size:10px;letter-spacing:.05em;${overdue ? "color:var(--red);" : ""}">${escapeHTML(due)}</span>
        </div>
        ${notes}
      </div>
      <div class="task-row__actions">${actions}</div>
    </div>`;
}

function renderTasks() {
  const activeEl = document.getElementById("taskActiveList");
  const doneEl = document.getElementById("taskDoneList");
  if (!activeEl || !doneEl) return;
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const active = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);
  activeEl.innerHTML = active.length
    ? active.map(taskTemplate).join("")
    : '<div class="empty">No active tasks. Open loops are clear.</div>';
  doneEl.innerHTML = done.length
    ? done.map(taskTemplate).join("")
    : '<div class="empty">No completed tasks yet.</div>';
}

/* ===================== DAILY READINESS ===================== */
function computeReadiness() {
  const disciplines = Array.isArray(state.disciplines) ? state.disciplines : [];
  const disciplineTotal = disciplines.length;
  const disciplineDone = disciplines.filter(d => hasLoggedToday(d.id)).length;
  const disciplineRate = disciplineTotal ? disciplineDone / disciplineTotal : 0;

  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const taskTotal = tasks.length;
  const taskDone = tasks.filter(t => t.completed).length;
  const taskRate = taskTotal ? taskDone / taskTotal : 0;

  const trackingBonus = isTrackedToday() ? 1 : 0;

  const activeTasks = tasks.filter(t => !t.completed);
  const openLoops = activeTasks.length;
  const pressure = activeTasks.filter(t => isTaskOverdue(t) || t.consequence === "high").length;
  // Penalty grows with overdue / high-consequence stacking, capped at 1.
  const openLoopPenalty = Math.min(1, pressure / 5);

  let score = disciplineRate * 0.45
    + taskRate * 0.35
    + trackingBonus * 0.10
    - openLoopPenalty * 0.10;
  score = Math.max(0, Math.min(1, score));

  return {
    percent: Math.round(score * 100),
    openLoops,
    pressure,
    warn: pressure > 3
  };
}

function renderReadiness() {
  const r = computeReadiness();
  const pctEl = document.getElementById("metricReadiness");
  const loopsEl = document.getElementById("metricOpenLoops");
  const warnEl = document.getElementById("metricReadinessWarn");
  if (pctEl) pctEl.textContent = `${r.percent}%`;
  if (loopsEl) loopsEl.textContent = `${r.openLoops} open loop${r.openLoops === 1 ? "" : "s"}`;
  if (warnEl) {
    if (r.warn) {
      warnEl.style.display = "block";
      warnEl.textContent = `⚠ ${r.pressure} overdue/high-consequence tasks`;
    } else {
      warnEl.style.display = "none";
    }
  }
}

/* ===================== RESUME IMPORT =====================
   Extracts DRAFT skills via keyword matching. Approving a draft creates a
   starting skill record (evidenceSource: "resume"). No XP is ever awarded. */
const RESUME_KEYWORDS = {
  "Sales": ["sales", "selling", "quota", "closing", "account executive", "revenue", "upsell"],
  "Business Development": ["business development", "bizdev", "partnership", "go-to-market", "pipeline", "lead generation"],
  "Negotiation": ["negotiation", "negotiat", "contract", "deal structure", "procurement"],
  "Real Estate": ["real estate", "realtor", "property", "leasing", "broker", "mortgage"],
  "Finance": ["finance", "financial", "accounting", "budget", "forecast", "p&l", "investment", "underwriting"],
  "Operations": ["operations", "logistics", "supply chain", "process improvement", "scheduling", "inventory"],
  "Technical": ["software", "javascript", "python", "sql", "engineer", "developer", "html", "css", "data", "automation", "api", "cloud"],
  "Leadership": ["leadership", "led", "managed", "team lead", "supervisor", "director", "mentored", "oversaw"],
  "Entrepreneurship": ["founder", "co-founder", "entrepreneur", "startup", "bootstrapped", "owner", "launched"],
  "Languages": ["bilingual", "fluent", "spanish", "french", "mandarin", "german", "portuguese", "arabic"]
};

function extractResumeSkills() {
  const text = (els.resumeText.value || "").trim();
  if (!text) {
    showToast("Paste resume text first");
    els.resumeText.focus();
    return;
  }
  const lower = text.toLowerCase();
  const extracted = [];
  Object.keys(RESUME_KEYWORDS).forEach(category => {
    const matched = RESUME_KEYWORDS[category].filter(kw => lower.includes(kw));
    if (matched.length) {
      extracted.push({
        id: "resume-" + category.toLowerCase().replace(/[^a-z]+/g, "-"),
        name: category,
        category,
        status: "draft",
        evidenceSource: "resume",
        matches: matched.slice(0, 4)
      });
    }
  });

  const suggestedQuests = buildResumeSuggestedQuests();

  state.resumeProfile = {
    rawText: text,
    extractedSkills: extracted,
    approvedSkillIds: (state.resumeProfile && state.resumeProfile.approvedSkillIds) || [],
    suggestedQuests
  };
  saveState();
  renderResume();
  showToast(extracted.length
    ? `${extracted.length} draft skill${extracted.length === 1 ? "" : "s"} extracted`
    : "No skills matched");
}

// Three suggested quests covering the resume-gap archetypes. Ideas only — no XP.
function buildResumeSuggestedQuests() {
  return [
    { category: "Sales / Business", title: "Close one new high-value deal or partnership this month" },
    { category: "Technical", title: "Ship one technical artifact — a dashboard, automation, or small app" },
    { category: "Leadership / Founder", title: "Draft a 90-day operating plan in your founder/leader role" }
  ];
}

function clearResume() {
  state.resumeProfile = { rawText: "", extractedSkills: [], approvedSkillIds: [], suggestedQuests: [] };
  if (els.resumeText) els.resumeText.value = "";
  saveState();
  renderResume();
  showToast("Resume import cleared");
}

function approveResumeSkills() {
  const profile = state.resumeProfile || {};
  const drafts = Array.isArray(profile.extractedSkills) ? profile.extractedSkills : [];
  const checked = [...document.querySelectorAll('.draft-skill input[type="checkbox"]:checked')].map(c => c.value);
  if (!checked.length) {
    showToast("Select at least one draft skill");
    return;
  }
  if (!Array.isArray(state.skills)) state.skills = [];
  const approvedIds = new Set(profile.approvedSkillIds || []);
  let added = 0;
  checked.forEach(draftId => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;
    // Skip if a resume skill with this id already lives in the registry.
    if (state.skills.some(s => s.id === draft.id)) { approvedIds.add(draftId); return; }
    state.skills.push({
      id: draft.id,
      name: draft.name,
      category: draft.category,
      tier: "acquiring",
      xp: 0,            // starting record — no XP awarded from resume
      xpMax: 2500,
      tags: Array.isArray(draft.matches) ? draft.matches : [],
      evidenceSource: "resume"
    });
    approvedIds.add(draftId);
    added++;
  });
  profile.approvedSkillIds = [...approvedIds];
  state.resumeProfile = profile;
  saveState();
  renderResume();
  renderSkills();
  showToast(added ? `${added} skill${added === 1 ? "" : "s"} added to registry // no XP` : "Already in registry");
}

function renderResume() {
  const draftsEl = document.getElementById("resumeDrafts");
  const questsEl = document.getElementById("resumeSuggestedQuests");
  const textEl = els.resumeText;
  const profile = state.resumeProfile || {};
  if (textEl && !textEl.value && profile.rawText) textEl.value = profile.rawText;

  if (draftsEl) {
    const drafts = Array.isArray(profile.extractedSkills) ? profile.extractedSkills : [];
    const approved = new Set(profile.approvedSkillIds || []);
    if (!drafts.length) {
      draftsEl.innerHTML = "";
    } else {
      const rows = drafts.map(d => {
        const isApproved = approved.has(d.id) || (state.skills || []).some(s => s.id === d.id);
        const evidence = d.matches && d.matches.length ? ` · matched: ${escapeHTML(d.matches.join(", "))}` : "";
        return `
          <label class="draft-skill">
            <input type="checkbox" value="${escapeHTML(d.id)}" ${isApproved ? "checked disabled" : ""}>
            <span>
              <span class="draft-skill__name">${escapeHTML(d.name)}</span>
              <span class="draft-skill__cat">${isApproved ? "approved" : "draft"} · source: resume${evidence}</span>
            </span>
          </label>`;
      }).join("");
      draftsEl.innerHTML = `
        <div style="color:var(--text-muted);font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px;">Draft Skills</div>
        ${rows}
        <div class="modal-foot" style="justify-content:flex-start;">
          <button class="btn primary" type="button" data-action="approve-resume">Approve Selected</button>
        </div>`;
    }
  }

  if (questsEl) {
    const quests = Array.isArray(profile.suggestedQuests) ? profile.suggestedQuests : [];
    if (!quests.length) {
      questsEl.innerHTML = "";
    } else {
      questsEl.innerHTML = `
        <div style="color:var(--text-muted);font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:10px;">Suggested Quests (from resume gaps)</div>
        <div class="task-stack">
          ${quests.map(q => `
            <div class="task-row">
              <div>
                <h4 class="task-row__title">${escapeHTML(q.title)}</h4>
                <div class="task-row__meta"><span class="pill rare">${escapeHTML(q.category)}</span><span class="draft-skill__cat">idea only · no XP until deployed as a quest</span></div>
              </div>
            </div>`).join("")}
        </div>`;
    }
  }
}

/* ===================== AI COACH EXPORT =====================
   Builds a copyable plain-text brief from current local state. Read-only:
   no external API, no XP mutation, no state changes. */
const COACH_PROMPT = "You are my KAIRU strategic coach. Review this current state and give me the highest leverage next move. Separate maintenance tasks from XP-bearing quests. Do not reward busywork. Identify one bottleneck, one risk, and one action to ship today.";

function coachSuggestedActions() {
  const out = [];
  const seen = new Set();
  // Prefer fresh, concrete next-actions already surfaced by Echo.
  (Array.isArray(state.echoes) ? state.echoes : []).forEach(e => {
    const a = (e && e.suggestedNextAction || "").trim();
    if (a && !seen.has(a.toLowerCase())) { seen.add(a.toLowerCase()); out.push(a); }
  });
  // Fall back to generic prompts so the section is never empty.
  const fallbacks = [
    "Pick the single highest-leverage active quest and ship one step today.",
    "Clear the two lowest-energy open tasks to relieve backlog pressure.",
    "Protect one discipline streak by locking tomorrow's time block now."
  ];
  for (const f of fallbacks) { if (out.length >= 3) break; if (!seen.has(f.toLowerCase())) { seen.add(f.toLowerCase()); out.push(f); } }
  return out.slice(0, 3);
}

function buildCoachBrief() {
  const s = state;
  const id = s.identity || {};
  const totals = (typeof getDevelopmentTotals === "function") ? getDevelopmentTotals() : { cxp: 0, kxp: 0, sxp: 0, tds: 0 };
  const readiness = (typeof computeReadiness === "function") ? computeReadiness() : { percent: 0, openLoops: 0, pressure: 0 };
  const tasks = Array.isArray(s.tasks) ? s.tasks : [];
  const activeTasks = tasks.filter(t => !t.completed);
  const overdueTasks = activeTasks.filter(t => isTaskOverdue(t));
  const activeQuests = Array.isArray(s.activeQuests) ? s.activeQuests : [];
  const archived = Array.isArray(s.archivedQuests) ? s.archivedQuests : [];
  const disciplines = Array.isArray(s.disciplines) ? s.disciplines : [];
  const skills = Array.isArray(s.skills) ? s.skills.slice() : [];
  const pipeline = Array.isArray(s.jobPipeline) ? s.jobPipeline : [];
  const echoes = Array.isArray(s.echoes) ? s.echoes : [];

  const L = [];
  L.push(COACH_PROMPT);
  L.push("");
  L.push("====================================");
  L.push("KAIRU OPERATOR STATE BRIEF");
  L.push(`Generated: ${new Date().toISOString()}`);
  L.push("====================================");
  L.push("");

  L.push("## OPERATOR IDENTITY");
  L.push(`- Name: ${id.name || "Unset"}`);
  L.push(`- Archetype: ${id.archetype || "Unset"}`);
  L.push(`- Faith / Belief: ${cleanFaithValue ? (cleanFaithValue(id.faith) || "Unset") : (id.faith || "Unset")}`);
  L.push(`- Days Tracked: ${Number(s.daysTracked) || 0}`);
  L.push("");

  L.push("## CURRENT RANK");
  L.push(`- Tier: ${id.tier || "E"}`);
  L.push("");

  L.push("## DEVELOPMENT TOTALS");
  L.push(`- Competence XP (CXP): ${(totals.cxp || 0).toLocaleString()}`);
  L.push(`- Skill XP (KXP): ${(totals.kxp || 0).toLocaleString()}`);
  L.push(`- Spiritual XP (SXP): ${(totals.sxp || 0).toLocaleString()}`);
  L.push(`- Total Development Score: ${(totals.tds || 0).toLocaleString()}`);
  L.push("");

  L.push("## DAILY READINESS");
  L.push(`- Readiness Score: ${readiness.percent}%`);
  L.push(`- Open Loops: ${readiness.openLoops}`);
  L.push(`- Overdue / high-consequence pressure: ${readiness.pressure}`);
  L.push("");

  L.push(`## TASKS (maintenance layer — NOT XP-bearing) — ${activeTasks.length} open, ${overdueTasks.length} overdue`);
  if (activeTasks.length) {
    activeTasks.forEach(t => {
      const flags = [t.urgency, `energy ${t.energyCost}`, `${t.consequence} stakes`];
      if (isTaskOverdue(t)) flags.push("OVERDUE");
      L.push(`- ${t.title} [${t.category}] (${flags.join(", ")})${t.dueDate ? ` due ${t.dueDate}` : ""}`);
    });
  } else {
    L.push("- None. Open loops are clear.");
  }
  L.push("");

  L.push(`## ACTIVE QUESTS (XP-bearing) — ${activeQuests.length}`);
  if (activeQuests.length) {
    activeQuests.forEach(q => {
      L.push(`- ${q.title} [${q.rarity || q.difficulty || "Common"}]${q.due_date ? ` due ${q.due_date}` : ""}${q.primarySkill ? ` // skill: ${q.primarySkill}` : ""}`);
    });
  } else {
    L.push("- None active.");
  }
  L.push("");

  L.push("## RECENT COMPLETED QUESTS (latest 5)");
  if (archived.length) {
    archived.slice(0, 5).forEach(q => {
      L.push(`- ${q.title} [${q.rarity || q.difficulty || "Common"}]${q.date_completed ? ` on ${q.date_completed}` : ""}${q.cxp_earned ? ` // +${Number(q.cxp_earned).toLocaleString()} CXP` : ""}`);
    });
  } else {
    L.push("- None chronicled yet.");
  }
  L.push("");

  // Quest-to-skill progression: gives a future AI the explicit mapping between
  // completed quests and the skills they advanced, plus spiritual consistency.
  L.push("## RECENT PROGRESSION EVENTS (latest 5 completions)");
  const progressionQuests = archived.slice(0, 5);
  if (progressionQuests.length) {
    progressionQuests.forEach(q => {
      const cxp = Number(q.cxp_earned ?? q.xp_earned) || 0;
      L.push(`- Completed Quest: ${q.title}${q.date_completed ? ` (${q.date_completed})` : ""}`);
      L.push(`  CXP Earned: ${cxp.toLocaleString()}`);
      const skillEntries = (q.skillXpEarned && typeof q.skillXpEarned === "object")
        ? Object.entries(q.skillXpEarned).filter(([, v]) => (Number(v) || 0) > 0).sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
        : [];
      if (skillEntries.length) {
        L.push("  Skills Advanced:");
        skillEntries.forEach(([name, v]) => L.push(`    * ${name} +${(Number(v) || 0).toLocaleString()} XP`));
      } else {
        L.push("  Skills Advanced: none linked");
      }
    });
  } else {
    L.push("- No completions chronicled yet.");
  }
  const sxpToday = (typeof getDisciplineSpiritualXPOn === "function") ? getDisciplineSpiritualXPOn() : 0;
  L.push(`- Spiritual XP logged today: ${sxpToday.toLocaleString()}`);
  L.push("");

  L.push("## CURRENT SKILL SIGNALS");
  if (skills.length) {
    const recentlyAdvanced = new Set();
    progressionQuests.forEach(q => {
      if (q.skillXpEarned && typeof q.skillXpEarned === "object") {
        Object.entries(q.skillXpEarned).forEach(([name, v]) => { if ((Number(v) || 0) > 0) recentlyAdvanced.add(String(name).toLowerCase()); });
      }
    });
    skills.slice()
      .sort((a, b) => (Number(b.xp) || 0) - (Number(a.xp) || 0))
      .slice(0, 6)
      .forEach(sk => {
        const tier = (typeof getTierLabel === "function") ? getTierLabel(sk.tier) : (sk.tier || "Acquiring");
        const active = recentlyAdvanced.has(String(sk.name || "").toLowerCase()) ? " — recent activity" : "";
        L.push(`- ${sk.name} is progressing through the ${tier} tier (${Number(sk.xp) || 0}/${Number(sk.xpMax) || 0} XP)${active}.`);
      });
  } else {
    L.push("- No skills registered — extraction or manual entry needed before quests can advance capability.");
  }
  L.push(sxpToday > 0
    ? `- Spiritual growth logged today (${sxpToday.toLocaleString()} SXP).`
    : "- No spiritual growth logged today.");
  L.push("");

  L.push("## DISCIPLINES & STREAKS");
  if (disciplines.length) {
    disciplines.forEach(d => {
      const streak = (typeof getDisciplineStreak === "function") ? getDisciplineStreak(d.id) : 0;
      const today = (typeof hasLoggedToday === "function") ? (hasLoggedToday(d.id) ? "logged today" : "not yet today") : "";
      L.push(`- ${d.name} [${d.frequency || d.category || ""}] — ${streak}-day streak${today ? ` (${today})` : ""}`);
    });
  } else {
    L.push("- None configured.");
  }
  L.push("");

  L.push("## TOP SKILLS (by XP)");
  if (skills.length) {
    skills.sort((a, b) => (Number(b.xp) || 0) - (Number(a.xp) || 0)).slice(0, 5).forEach(sk => {
      L.push(`- ${sk.name} [${sk.tier || "acquiring"}] ${Number(sk.xp) || 0}/${Number(sk.xpMax) || 0} XP${sk.evidenceSource ? ` (source: ${sk.evidenceSource})` : ""}`);
    });
  } else {
    L.push("- None registered.");
  }
  L.push("");

  L.push("## JOB PIPELINE");
  if (pipeline.length) {
    pipeline.forEach(p => {
      L.push(`- ${p.company || "Unknown"} — ${p.role || ""} [${p.stage || "Identified"}]${p.notes ? ` // ${p.notes}` : ""}`);
    });
  } else {
    L.push("- No pipeline entries.");
  }
  L.push("");

  L.push("## LATEST ECHO ENTRIES (reflective log, latest 5)");
  if (echoes.length) {
    echoes.slice(0, 5).forEach(e => {
      L.push(`- [${e.patternTag || "general"}] ${e.title}${e.reflection ? ` — ${e.reflection}` : ""}${e.suggestedNextAction ? ` (next: ${e.suggestedNextAction})` : ""}`);
    });
  } else {
    L.push("- No echoes yet.");
  }
  L.push("");

  L.push("## SUGGESTED NEXT 3 ACTIONS");
  coachSuggestedActions().forEach((a, i) => L.push(`${i + 1}. ${a}`));
  L.push("");
  L.push("====================================");
  L.push("END OF BRIEF");

  return L.join("\n");
}

function openCoachExport() {
  const brief = buildCoachBrief();
  if (els.coachExportText) els.coachExportText.value = brief;
  showModal(els.coachExportModal);
  window.setTimeout(() => {
    if (els.coachExportText) { els.coachExportText.focus(); els.coachExportText.select(); }
  }, 50);
}

function closeCoachExport() {
  hideModal(els.coachExportModal);
}

function copyCoachExport() {
  const text = els.coachExportText ? els.coachExportText.value : "";
  const done = () => showToast("Coach brief copied");
  const fallback = () => {
    if (els.coachExportText) {
      els.coachExportText.focus();
      els.coachExportText.select();
      try { document.execCommand("copy"); done(); }
      catch (e) { showToast("Select the text and copy manually"); }
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallback);
  } else {
    fallback();
  }
}

function openArchive() {
  renderFullArchive();
  setView("archive");
}

function closeArchive() {
  setView("quests");
}

function renderFullArchive() {
  els.fullArchiveList.innerHTML = state.archivedQuests.length
    ? state.archivedQuests.map((quest) => archiveTemplate(quest)).join("")
    : '<div class="empty">Chronicle empty. Completed quests will land here.</div>';
}

function openFinance() {
  const financials = state.financials;
  els.editAssets.value = financials.assets;
  els.editLiabilities.value = financials.liabilities;
  els.editIncome.value = financials.income;
  els.editExpenses.value = financials.expenses;
  showModal(els.financeModal);
  window.setTimeout(() => els.editAssets.focus(), 50);
}

function closeFinance() {
  hideModal(els.financeModal);
}

function saveFinance() {
  state.financials = {
    assets: Number(els.editAssets.value) || 0,
    liabilities: Number(els.editLiabilities.value) || 0,
    income: Number(els.editIncome.value) || 0,
    expenses: Number(els.editExpenses.value) || 0
  };

  saveState();
  closeFinance();
  renderAll();
  showToast("Financials committed");
}

function resetState() {
  if (!window.confirm("Wipe all KAIRU Phase 1 state? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('serendipityBuffExpiry');
  localStorage.removeItem('serendipityMultiplier');
  state = structuredClone(defaultState);
  renderAll();
  setView("command");
  showToast("State reset");
}

// ===================== BACKUP: EXPORT / IMPORT =====================
// Lets the full state travel across browsers, machines, or a file rename
// (Firefox isolates localStorage per file path, so renaming a local file
// looks like a reset -- export here, rename, then import to carry data over).

function exportBackup() {
  try {
    const payload = {
      kairuBackup: true,
      version: STORAGE_KEY,            // "kairu_alpha_v1"
      exportedAt: new Date().toISOString(),
      state: state
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = localToday();
    const a = document.createElement("a");
    a.href = url;
    a.download = `kairu-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Backup exported // keep this file safe");
  } catch (err) {
    console.warn("Export failed:", err);
    showToast("Export failed");
  }
}

function importBackup() {
  const input = document.getElementById("importFileInput");
  if (input) input.click();
}

function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      // Accept either a wrapped backup { state: {...} } or a raw state object.
      const rawState = (parsed && parsed.kairuBackup && parsed.state) ? parsed.state : parsed;
      if (!rawState || typeof rawState !== "object") {
        showToast("Not a valid KAIRU backup");
        return;
      }
      if (!window.confirm("Import this backup? It will REPLACE your current KAIRU data in this browser.")) {
        return;
      }
      state = normalizeState(rawState);   // reconcile + apply same defaults/migrations as load
      saveState();                        // persist under the current STORAGE_KEY
      renderAll();
      setView("command");
      showToast("Backup imported successfully");
    } catch (err) {
      console.warn("Import failed:", err);
      showToast("Import failed // file unreadable");
    }
  };
  reader.onerror = () => showToast("Import failed // could not read file");
  reader.readAsText(file);
}

function showModal(modal) {
  modal.classList.add("show");
}

function hideModal(modal) {
  modal.classList.remove("show");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(els.toast._timer);
  els.toast._timer = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function showXPFlash(message) {
  const flash = document.createElement("div");
  flash.className = "xp-flash";
  flash.textContent = message;
  document.body.appendChild(flash);
  flash.addEventListener("animationend", () => flash.remove());
}

function renderMetrics() {
  const financials = state.financials;
  const net = financials.assets - financials.liabilities;
  const flow = financials.income - financials.expenses;
  const dueSoon = dueSoonCount();
  const totals = getDevelopmentTotals();

  els.metricCXP.textContent = totals.cxp.toLocaleString();
  els.metricKXP.textContent = totals.kxp.toLocaleString();
  els.metricSXP.textContent = totals.sxp.toLocaleString();
  els.metricTDS.textContent = totals.tds.toLocaleString();
  els.metricDays.textContent = state.daysTracked.toLocaleString();
  els.metricCompound.textContent = `${compound().toFixed(2)}x`;
  els.metricQuests.textContent = state.activeQuests.length.toLocaleString();
  els.metricDue.textContent = `${dueSoon} due soon`;
  els.metricNet.textContent = formatMoney(net);
  els.metricFlow.textContent = formatMoney(flow);
  els.metricFlow.closest(".finance-line").classList.toggle("warn", flow < 0);
  els.metricFlow.closest(".finance-line").classList.toggle("info", flow >= 0);

  renderRank();
  renderDailyXPStatus();
}

function renderDailyXPStatus() {
  const el = document.getElementById('dailyXPStatus');
  if (!el) return;

  const entry = (state.dailyXPLedger || {})[localToday()];

  if (!entry) {
    el.textContent = 'XP TODAY: 0 / 300 prime band open';
    el.style.color = 'var(--cyan)';
    return;
  }

  const raw = Number(entry.rawXP) || 0;
  const posted = Number(entry.postedXP) || 0;

  let band, color;
  if (raw >= 500) {
    band = 'CAP REACHED';
    color = 'var(--red)';
  } else if (raw > 300) {
    band = 'OVERFLOW';
    color = 'var(--gold)';
  } else {
    band = 'PRIME';
    color = 'var(--cyan)';
  }

  el.textContent = `XP TODAY: ${posted.toLocaleString()} posted / ${raw.toLocaleString()} raw · ${band}`;
  el.style.color = color;
}

function renderSerendipity() {
  const buffExpiry = Number(state.serendipity && state.serendipity.buffExpiry) || 0;
  const now = Date.now();

  if (now < buffExpiry) {
    const diff = buffExpiry - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    els.serendipityCountdown.textContent = `${hours}h ${minutes}m ${seconds}s`;
    els.serendipityIndicator.hidden = false;
  } else {
    els.serendipityIndicator.hidden = true;
  }
}

function renderTrack() {
  const tracked = isTrackedToday();
  els.trackPanel.classList.toggle("locked", tracked);
  els.trackKicker.textContent = tracked ? "Tracking Live" : "Daily Tracking";
  els.trackTitle.textContent = tracked ? "Today is locked in" : "Intentional tracking inactive";
  els.trackCopy.textContent = tracked
    ? "+3% XP is active for every quest completion logged today."
    : "Lock in today to activate the +3% XP boost on all completions before midnight.";

  // When tracked, the action button is fully replaced by a non-interactive locked
  // badge so today cannot be re-fired (accidental reactivation is impossible).
  const button = $('[data-action="track"]');
  const badge = document.getElementById("trackLocked");
  if (button) button.hidden = tracked;
  if (badge) badge.hidden = !tracked;
}

function renderQuests() {
  els.intelDue.textContent = dueSoonCount().toLocaleString();
  els.intelPotential.textContent = potentialXP().toLocaleString();
  els.intelArchived.textContent = state.archivedQuests.length.toLocaleString();

  els.activeList.innerHTML = state.activeQuests.length
    ? state.activeQuests.map((quest) => questTemplate(quest)).join("")
    : '<div class="empty">No active quests. Deploy one to prove the loop.</div>';

  els.archiveList.innerHTML = state.archivedQuests.length
    ? state.archivedQuests.slice(0, 8).map((quest) => archiveTemplate(quest)).join("")
    : '<div class="empty">Chronicle empty. Completed quests will land here.</div>';
}

function questTemplate(quest) {
  const rarity = quest.rarity || quest.difficulty;
  const due = quest.due_date ? `Due ${escapeHTML(quest.due_date)}` : "No due date";
  const created = quest.date_created ? `Created ${escapeHTML(quest.date_created)}` : "";
  const hasDesc = !!(quest.description && String(quest.description).trim());
  // Description + metadata live in a collapsible block so long text never drives
  // card height on mobile. Collapsed = clamped teaser; expanded = full + metadata.
  const extra = (hasDesc || created) ? `
      <details class="quest-extra">
        <summary>
          ${hasDesc ? `<p class="quest-desc">${escapeHTML(quest.description)}</p>` : ""}
          <span class="quest-readmore" aria-hidden="true"></span>
        </summary>
        <div class="quest-extra__body">
          ${created ? `<div class="quest-extra__row">${created}</div>` : ""}
        </div>
      </details>` : "";
  const flagBtn = (!quest.serendipity_flagged && !quest.is_locked)
    ? `<button class="btn ghost" type="button" data-action="flag-serendipity" data-id="${escapeHTML(quest.id)}">Flag Serendipity</button>`
    : "";
  return `
    <article class="quest-card quest-card--v">
      <div class="quest-card__top">
        <span class="pill ${difficultyClass(rarity)}">${escapeHTML(rarity)}</span>
        <span class="xp">${questBaseXP(quest).toLocaleString()} CXP</span>
      </div>
      <h4 class="quest-title">${escapeHTML(quest.title)}</h4>
      <div class="quest-due">${due}</div>
      ${extra}
      <div class="quest-actions">
        <button class="btn cyan" type="button" data-action="complete-quest" data-id="${escapeHTML(quest.id)}">Complete</button>
        ${flagBtn}
      </div>
    </article>
  `;
}

function archiveTemplate(quest) {
  const note = quest.completion_note ? ` // ${escapeHTML(quest.completion_note)}` : "";
  const skillXP = quest.skillXpEarned && typeof quest.skillXpEarned === "object"
    ? Object.values(quest.skillXpEarned).reduce((sum, value) => sum + (Number(value) || 0), 0)
    : 0;
  return `
    <article class="quest-card archived">
      <div>
        <h4 class="quest-title">${escapeHTML(quest.title)}</h4>
        <div class="quest-meta">
          <span class="pill ${difficultyClass(quest.rarity || quest.difficulty)}">${escapeHTML(quest.rarity || quest.difficulty)}</span>
          <span>Completed ${escapeHTML(quest.date_completed || "unknown")}</span>
          <span>${escapeHTML(quest.completion_note || "")}</span>
        </div>
      </div>
      <span class="xp earned">+${(Number(quest.cxp_earned ?? quest.xp_earned) || 0).toLocaleString()} CXP${skillXP ? ` // +${skillXP.toLocaleString()} KXP` : ""}</span>
    </article>
  `;
}

function renderFinance() {
  const financials = state.financials;
  const net = financials.assets - financials.liabilities;
  const flow = financials.income - financials.expenses;

  els.financeAssets.textContent = formatMoney(financials.assets);
  els.financeLiabilities.textContent = formatMoney(financials.liabilities);
  els.financeNet.textContent = formatMoney(net);
  els.financeIncome.textContent = formatMoney(financials.income);
  els.financeExpenses.textContent = formatMoney(financials.expenses);
  els.financeFlow.textContent = formatMoney(flow);
  els.financeFlowLine.classList.toggle("warn", flow < 0);
  els.financeFlowLine.classList.toggle("info", flow >= 0);
}

function calcMonthly(weeklyHours, rate) {
  return Math.round(weeklyHours * rate * 52 / 12);
}

function renderIncomeModule() {
  const cfg = state.incomeConfig || defaultState.incomeConfig;
  const rate = cfg.hourlyRate;
  const container = document.getElementById('incomeModule');
  if (!container) return;

  const rows = [
    { label: 'Position', value: cfg.position, cls: '' },
    { label: 'Hourly Rate', value: `$${rate}/hr`, cls: 'info' },
    { label: `Base Week (${cfg.baseHours}hrs)`, value: `$${(cfg.baseHours * rate).toLocaleString()}`, cls: 'good' },
    { label: `Extended Week (${cfg.extendedHours}hrs)`, value: `$${(cfg.extendedHours * rate).toLocaleString()}`, cls: 'good' },
    { label: `Max Week (${cfg.maxHours}hrs)`, value: `$${(cfg.maxHours * rate).toLocaleString()}`, cls: 'good' },
    { label: 'Base Monthly Est.', value: `$${calcMonthly(cfg.baseHours, rate).toLocaleString()}`, cls: 'info' },
    { label: 'Extended Monthly Est.', value: `$${calcMonthly(cfg.extendedHours, rate).toLocaleString()}`, cls: 'info' }
  ];

  container.innerHTML = rows.map(r =>
    `<div class="finance-line ${r.cls}"><span>${r.label}</span><b>${r.value}</b></div>`
  ).join('');
}

function openIncome() {
  const cfg = state.incomeConfig || defaultState.incomeConfig;
  els.incomePosition.value = cfg.position || '';
  els.incomeEmployer.value = cfg.employer || '';
  els.incomeRate.value = cfg.hourlyRate;
  els.incomeBaseHours.value = cfg.baseHours;
  els.incomeExtendedHours.value = cfg.extendedHours;
  els.incomeMaxHours.value = cfg.maxHours;
  showModal(els.incomeModal);
  window.setTimeout(() => els.incomeRate.focus(), 50);
}

function closeIncome() {
  hideModal(els.incomeModal);
}

function saveIncome() {
  const base = state.incomeConfig || defaultState.incomeConfig;
  state.incomeConfig = {
    ...base,
    position: els.incomePosition.value.trim() || base.position,
    employer: els.incomeEmployer.value.trim() || base.employer,
    hourlyRate: Math.max(0, Number(els.incomeRate.value) || 0),
    baseHours: Math.max(0, Number(els.incomeBaseHours.value) || 0),
    extendedHours: Math.max(0, Number(els.incomeExtendedHours.value) || 0),
    maxHours: Math.max(0, Number(els.incomeMaxHours.value) || 0)
  };
  saveState();
  closeIncome();
  renderAll();
  showToast("Income config committed");
}

function openPipeline() {
  els.pipelineCompany.value = '';
  els.pipelineRole.value = '';
  els.pipelineStage.value = 'Applied';
  els.pipelineNotes.value = '';
  showModal(els.pipelineModal);
  window.setTimeout(() => els.pipelineCompany.focus(), 50);
}

function closePipeline() {
  hideModal(els.pipelineModal);
}

function savePipeline() {
  const company = els.pipelineCompany.value.trim();
  if (!company) { showToast('Company required'); return; }
  const role = els.pipelineRole.value.trim() || 'Unspecified Role';
  const stage = PIPELINE_STAGES.includes(els.pipelineStage.value) ? els.pipelineStage.value : 'Applied';

  if (!Array.isArray(state.jobPipeline)) state.jobPipeline = [];
  state.jobPipeline.push({
    id: 'pipe-' + Date.now(),
    company,
    role,
    stage,
    notes: els.pipelineNotes.value.trim(),
    dateAdded: localToday()
  });

  saveState();
  closePipeline();
  renderPipeline();
  showToast(company + ' added to pipeline');
}

function renderPipeline() {
  const container = document.getElementById('pipelineList');
  if (!container) return;
  const pipeline = Array.isArray(state.jobPipeline) ? state.jobPipeline : [];

  container.innerHTML = pipeline.length
    ? pipeline.map(entry => {
        const stageIndex = PIPELINE_STAGES.indexOf(entry.stage);
        const stagePills = PIPELINE_STAGES.map((s, i) => {
          const active = i === stageIndex ? 'primary' : 'ghost';
          return `<button class="btn ${active}" style="font-size:10px;min-height:28px;padding:4px 8px"
            data-action="pipeline-stage" data-id="${entry.id}" data-stage="${s}">${s}</button>`;
        }).join('');

        return `<article class="quest-card" style="flex-direction:column;align-items:flex-start;gap:10px">
          <div style="width:100%">
            <h4 class="quest-title">${escapeHTML(entry.company)}</h4>
            <div class="quest-meta">
              <span class="pill rare">${escapeHTML(entry.role)}</span>
              <span>Added ${escapeHTML(entry.dateAdded)}</span>
              ${entry.notes ? `<span>${escapeHTML(entry.notes)}</span>` : ''}
            </div>
          </div>
          <div class="toolbar">${stagePills}</div>
        </article>`;
      }).join('')
    : '<div class="empty">No pipeline entries. Add a role to start tracking.</div>';

  const counts = document.getElementById('pipelineCounts');
  if (counts) {
    counts.innerHTML = PIPELINE_STAGES.map(s => {
      const n = pipeline.filter(e => e.stage === s).length;
      return `<div class="finance-line"><span>${s}</span><b>${n}</b></div>`;
    }).join('');
  }
}

function advancePipelineStage(id, stage) {
  const entry = state.jobPipeline.find(e => e.id === id);
  if (!entry) return;
  entry.stage = stage;
  saveState();
  renderPipeline();
  showToast(`${entry.company} moved to ${stage}`);
}

function hasLoggedToday(disciplineId) {
  return state.disciplineLog.some(e => e.disciplineId === disciplineId && e.date === localToday());
}

function getDisciplineStreak(disciplineId) {
  // Build a set of logged dates for this discipline
  const loggedDates = new Set(
    state.disciplineLog
      .filter(e => e.disciplineId === disciplineId)
      .map(e => e.date)
  );

  // Walk backwards from today counting consecutive days
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const dateStr = cursor.getFullYear() + '-'
      + String(cursor.getMonth() + 1).padStart(2, '0') + '-'
      + String(cursor.getDate()).padStart(2, '0');
    if (!loggedDates.has(dateStr)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getCalendarCells(disciplineId, days) {
  const cells = [];
  const today = localToday();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
    const completed = state.disciplineLog.some(e => e.disciplineId === disciplineId && e.date === dateStr);
    cells.push({ date: dateStr, completed, isToday: dateStr === today });
  }
  return cells;
}

function openDiscipline() {
  els.disciplineName.value = "";
  els.disciplineCategory.value = "Spiritual";
  els.disciplineTime.value = "06:30";
  els.disciplineDuration.value = "15";
  els.disciplineFrequency.value = "daily";
  els.disciplineXP.value = "50";
  els.disciplineProtocol.value = "";
  showModal(els.disciplineModal);
  window.setTimeout(() => els.disciplineName.focus(), 50);
}

function closeDiscipline() {
  hideModal(els.disciplineModal);
}

function saveDiscipline() {
  const name = els.disciplineName.value.trim();
  const category = els.disciplineCategory.value;
  const timeBlock = els.disciplineTime.value;
  const durationMinutes = Number.parseInt(els.disciplineDuration.value, 10);
  const frequency = els.disciplineFrequency.value;
  const xpPerCompletion = Number.parseInt(els.disciplineXP.value, 10);
  const protocol = els.disciplineProtocol.value.trim();

  if (!name) {
    showToast("Discipline name required");
    els.disciplineName.focus();
    return;
  }
  if (!timeBlock) {
    showToast("Time block required");
    els.disciplineTime.focus();
    return;
  }
  if (!durationMinutes || durationMinutes < 1) {
    showToast("Duration minutes required");
    els.disciplineDuration.focus();
    return;
  }
  if (Number.isNaN(xpPerCompletion) || xpPerCompletion < 0) {
    showToast("XP per completion required");
    els.disciplineXP.focus();
    return;
  }

  if (!Array.isArray(state.disciplines)) state.disciplines = [];
  const duplicate = state.disciplines.some(disc => String(disc.name || "").toLowerCase() === name.toLowerCase());
  if (duplicate) {
    showToast("Discipline already exists");
    els.disciplineName.focus();
    return;
  }

  state.disciplines.push(normalizeDiscipline({
    id: createId("disc"),
    name,
    category,
    frequency,
    xpPerCompletion,
    timeBlock,
    durationMinutes,
    anchorDate: localToday(),
    source: category === "Faith / Belief" ? "faith-custom" : "custom",
    protocol
  }, state.disciplines.length));

  saveState();
  closeDiscipline();
  renderAll();
  showToast("Discipline added to day protocol");
}

function logDiscipline(disciplineId) {
  if (hasLoggedToday(disciplineId)) { showToast('Already logged today'); return; }
  const disc = state.disciplines.find(d => d.id === disciplineId);
  if (!disc) return;
  const today = localToday();
  const discCapResult = calculatePostableXP(disc.xpPerCompletion, today);
  state.disciplineLog.push({
    disciplineId,
    date: today,
    rawXP: discCapResult.rawXP,
    postedXP: discCapResult.postedXP,
    xpBand: discCapResult.band
  });
  state.totalXP += discCapResult.postedXP;
  recordDailyXP(discCapResult.rawXP, discCapResult.postedXP, today);
  recordXPEvent(
    'discipline',
    discCapResult.rawXP,
    discCapResult.postedXP,
    discCapResult.band,
    { disciplineName: disc.name }
  );
  // Echo: streak milestone reflection (no XP awarded)
  const newStreak = getDisciplineStreak(disciplineId);
  if (ECHO_MILESTONES.includes(newStreak)) generateDisciplineEcho(disc, newStreak);
  saveState();
  renderDisciplines();
  renderEchoes();
  renderReadiness();
  renderMetrics();
  renderCommandBrief();
  renderXPLog();
  const spiritual = isSpiritualDiscipline(disc);
  const xpLabel = spiritual ? ' SXP' : ' XP';
  showXPFlash('+' + discCapResult.postedXP.toLocaleString() + xpLabel);
  showToast(disc.name + ' logged // +' + discCapResult.postedXP.toLocaleString() + xpLabel);
}

function renderLegacyDisciplineCards() {
  const container = document.getElementById('disciplineList');
  if (!container) return;
  const disciplines = Array.isArray(state.disciplines) ? state.disciplines : [];

  container.innerHTML = disciplines.map(disc => {
    const done = hasLoggedToday(disc.id);
    const streak = getDisciplineStreak(disc.id);
    const cells = getCalendarCells(disc.id, 28);

    const calendarHTML = cells.map(cell => {
      const bg = cell.completed
        ? 'var(--cyan)'
        : cell.isToday
          ? 'rgba(201,168,76,0.35)'
          : 'var(--surface-3)';
      const border = cell.isToday ? '1px solid var(--gold)' : '1px solid transparent';
      return `<span title="${cell.date}" style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${bg};border:${border};margin:1px;"></span>`;
    }).join('');

    return `<article class="card" style="min-height:auto;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;margin-bottom:10px;">
        <div>
          <div class="card__label">${escapeHTML(disc.category)}</div>
          <div style="font-size:18px;margin-top:4px;color:var(--text);">${escapeHTML(disc.name)}</div>
          <div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;margin-top:4px;letter-spacing:.08em;">
            ${escapeHTML(disc.frequency)} &nbsp;//&nbsp; +${disc.xpPerCompletion} XP per log
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="color:var(--gold);font-family:var(--mono);font-size:26px;line-height:1;">${streak}</div>
          <div style="color:var(--text-dim);font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;">day streak</div>
        </div>
      </div>
      <div style="margin-bottom:14px;line-height:2;">${calendarHTML}</div>
      <button class="btn ${done ? 'ghost' : 'cyan'}" ${done ? 'disabled' : ''}
        data-action="log-discipline" data-id="${escapeHTML(disc.id)}"
        style="width:100%;justify-content:center;">
        ${done ? '✓ Logged Today' : 'Log Completion'}
      </button>
    </article>`;
  }).join('');

  container.querySelectorAll('[data-action="log-discipline"][disabled]').forEach((button) => {
    button.textContent = "Logged Today";
  });
}

function isFaithDiscipline(disc) {
  return disc && (disc.source === "faith" || disc.source === "faith-custom" || disc.category === "Faith / Belief");
}

// Spiritual protocols can't be deleted, but their time block is adjustable —
// unless the practice is an absolute rule (fixedTime), e.g. sun-tied prayers.
function setDisciplineTime(id, value) {
  const disc = (state.disciplines || []).find(d => d.id === id);
  if (!disc) return;
  if (disc.fixedTime) {
    // Absolute rule (e.g. sun-tied prayer): snap any editor back to canonical.
    document.querySelectorAll('input[data-id="' + id + '"]').forEach(inp => { inp.value = disc.timeBlock; });
    showToast(`${disc.name} time is fixed by its rule`);
    return;
  }
  if (!/^\d{1,2}:\d{2}$/.test(value)) return;
  disc.timeBlock = value;
  saveState();
  // Update every place this time is shown WITHOUT rebuilding the lists that
  // contain the inputs (which would destroy the field mid-edit and re-sort
  // the cards). The week grid has no inputs, so it's safe to re-render.
  document.querySelectorAll('input[data-action="set-disc-time"][data-id="' + id + '"]').forEach(inp => {
    if (inp.value !== value) inp.value = value;
  });
  const cardInput = document.getElementById('ft-' + id);
  if (cardInput) {
    cardInput.value = value;
    const label = cardInput.closest('.card')?.querySelector('.js-card-time');
    if (label) label.textContent = formatTimeBlock(value);
  }
  renderDisciplineWeek();
  showToast(`${disc.name} moved to ${formatTimeBlock(value)}`);
}

function sortDisciplinesBySchedule(disciplines) {
  return [...disciplines].sort((a, b) => {
    const timeDelta = minutesFromTime(a.timeBlock) - minutesFromTime(b.timeBlock);
    if (timeDelta) return timeDelta;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function disciplineCardTemplate(disc) {
  const done = hasLoggedToday(disc.id);
  const streak = getDisciplineStreak(disc.id);
  const cells = getCalendarCells(disc.id, 28);
  const duration = Number(disc.durationMinutes) || 15;
  const protocol = disc.protocol ? `<div style="color:var(--text-muted);font-size:12px;line-height:1.45;margin:8px 0 10px;">${escapeHTML(disc.protocol)}</div>` : "";

  let timeControl = "";
  if (isFaithDiscipline(disc)) {
    if (disc.fixedTime) {
      const reason = disc.fixedReason ? escapeHTML(disc.fixedReason) : "Fixed by tradition.";
      timeControl = `<div class="faith-time locked" title="${reason}">
        <span class="faith-time__label">Time</span>
        <span class="faith-time__fixed">${escapeHTML(formatTimeBlock(disc.timeBlock))} <span class="faith-time__lock">&#128274;</span></span>
        <span class="faith-time__note">${reason}</span>
      </div>`;
    } else {
      timeControl = `<div class="faith-time">
        <label class="faith-time__label" for="ft-${escapeHTML(disc.id)}">Time</label>
        <input class="faith-time__input" id="ft-${escapeHTML(disc.id)}" type="time"
          value="${escapeHTML(disc.timeBlock)}" data-action="set-disc-time" data-id="${escapeHTML(disc.id)}">
        <span class="faith-time__note">Adjustable to your schedule</span>
      </div>`;
    }
  }

  const calendarHTML = cells.map(cell => {
    const bg = cell.completed
      ? 'var(--cyan)'
      : cell.isToday
        ? 'rgba(201,168,76,0.35)'
        : 'var(--surface-3)';
    const border = cell.isToday ? '1px solid var(--gold)' : '1px solid transparent';
    return `<span title="${cell.date}" style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${bg};border:${border};margin:1px;"></span>`;
  }).join('');

  return `<article class="card" style="min-height:auto;padding:16px;">
    <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;margin-bottom:10px;">
      <div>
        <div class="card__label">${escapeHTML(disc.category)}</div>
        <div style="font-size:18px;margin-top:4px;color:var(--text);">${escapeHTML(disc.name)}</div>
        <div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;margin-top:4px;letter-spacing:.08em;">
          <span class="js-card-time">${escapeHTML(formatTimeBlock(disc.timeBlock))}</span> &nbsp;//&nbsp; ${duration} min &nbsp;//&nbsp; ${escapeHTML(disc.frequency)} &nbsp;//&nbsp; +${disc.xpPerCompletion} XP
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="color:var(--gold);font-family:var(--mono);font-size:26px;line-height:1;">${streak}</div>
        <div style="color:var(--text-dim);font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;">day streak</div>
      </div>
    </div>
    ${protocol}
    ${timeControl}
    <div style="margin-bottom:14px;line-height:2;">${calendarHTML}</div>
    <button class="btn ${done ? 'ghost' : 'cyan'}" ${done ? 'disabled' : ''}
      data-action="log-discipline" data-id="${escapeHTML(disc.id)}"
      style="width:100%;justify-content:center;">
      ${done ? 'Logged Today' : 'Log Completion'}
    </button>
  </article>`;
}

function renderDisciplineSchedule() {
  const container = document.getElementById('disciplineSchedule');
  if (!container) return;
  // Day Protocol shows only the protocols that apply to today.
  const disciplines = sortDisciplinesBySchedule((Array.isArray(state.disciplines) ? state.disciplines : []).filter(disciplineAppliesToday));

  container.innerHTML = disciplines.length
    ? disciplines.map(disc => {
      const duration = Number(disc.durationMinutes) || 15;
      const faithMark = isFaithDiscipline(disc) ? '<span class="pill discipline">Faith</span>' : '';
      const done = hasLoggedToday(disc.id);
      const timeCell = disc.fixedTime
        ? `<div class="discipline-schedule__time locked" title="${disc.fixedReason ? escapeHTML(disc.fixedReason) : 'Fixed by tradition.'}">${escapeHTML(formatTimeBlock(disc.timeBlock))} <span class="faith-time__lock">&#128274;</span></div>`
        : `<input class="discipline-schedule__time-input" type="time" value="${escapeHTML(disc.timeBlock)}" data-action="set-disc-time" data-id="${escapeHTML(disc.id)}" title="Adjust time">`;
      const checkBtn = `<button class="discipline-schedule__check${done ? ' done' : ''}" type="button"
        data-action="log-discipline" data-id="${escapeHTML(disc.id)}" ${done ? 'disabled' : ''}
        title="${done ? 'Logged today' : 'Mark done (+' + disc.xpPerCompletion + ' XP)'}">${done ? '&#10003; Done' : 'Mark Done'}</button>`;
      return `<div class="discipline-schedule__row${done ? ' is-done' : ''}">
        ${timeCell}
        <div class="discipline-schedule__main">
          <span class="discipline-schedule__name">${escapeHTML(disc.name)}</span>
          <span class="discipline-schedule__meta">${escapeHTML(disc.category)} // ${duration} min // +${disc.xpPerCompletion} XP</span>
          ${faithMark}
        </div>
        ${checkBtn}
      </div>`;
    }).join('')
    : '<div class="empty">No scheduled disciplines yet.</div>';
}

const DISCIPLINE_CATEGORY_ORDER = ['Physical', 'Mental', 'Career', 'Skill', 'Spiritual', 'Other'];

function renderDisciplineWeek() {
  const grid = document.getElementById('disciplineWeek');
  if (!grid) return;
  const disciplines = sortDisciplinesBySchedule(Array.isArray(state.disciplines) ? state.disciplines : []);
  const today = localToday();

  // Monday-based current week
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.getFullYear() + '-'
      + String(d.getMonth() + 1).padStart(2, '0') + '-'
      + String(d.getDate()).padStart(2, '0');
    days.push({ dateStr, label: labels[i], num: d.getDate(), isToday: dateStr === today, isFuture: dateStr > today });
  }

  if (!disciplines.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1 / -1;">No disciplines yet.</div>';
    return;
  }

  const logged = new Set(state.disciplineLog.map(e => e.disciplineId + '|' + e.date));
  let html = '<div class="disc-week__corner"></div>';
  html += days.map(d => `<div class="disc-week__day${d.isToday ? ' is-today' : ''}">${d.label}<b>${d.num}</b></div>`).join('');

  disciplines.forEach(disc => {
    html += `<div class="disc-week__rowlabel">
      <span class="disc-week__rowname">${escapeHTML(disc.name)}</span>
      <span class="disc-week__rowmeta">${escapeHTML(formatTimeBlock(disc.timeBlock))} // ${escapeHTML(disc.frequency)}</span>
    </div>`;
    html += days.map(d => {
      const done = logged.has(disc.id + '|' + d.dateStr);
      let cls = 'disc-week__cell ';
      let mark = '';
      if (done) { cls += 'done'; mark = '✓'; }
      else if (d.isFuture) { cls += 'future'; }
      else if (d.isToday) { cls += 'scheduled today-ring'; mark = '○'; }
      else { cls += 'past'; mark = '·'; }
      return `<div class="${cls}" title="${escapeHTML(disc.name)} // ${d.dateStr}">${mark}</div>`;
    }).join('');
  });

  grid.innerHTML = html;
}

function renderDisciplines() {
  const groupsContainer = document.getElementById('disciplineGroups');
  const faithContainer = document.getElementById('faithDisciplineList');
  // Card groups mirror the Day Protocol: only what applies today is shown.
  const disciplines = sortDisciplinesBySchedule((Array.isArray(state.disciplines) ? state.disciplines : []).filter(disciplineAppliesToday));
  const faithDisciplines = disciplines.filter(isFaithDiscipline);
  const ordinaryDisciplines = disciplines.filter(disc => !isFaithDiscipline(disc));

  renderDisciplineSchedule();
  renderDisciplineWeek();

  if (faithContainer) {
    faithContainer.innerHTML = faithDisciplines.length
      ? faithDisciplines.map(disciplineCardTemplate).join('')
      : '<div class="empty">Set Faith in Identity to seed this protocol.</div>';
  }

  if (groupsContainer) {
    if (!ordinaryDisciplines.length) {
      groupsContainer.innerHTML = '<div class="empty">No custom protocols apply today. Weekly/monthly/seasonal practices surface on their scheduled days.</div>';
    } else {
      const byCategory = new Map();
      ordinaryDisciplines.forEach(disc => {
        const cat = disc.category || 'Other';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat).push(disc);
      });
      const cats = [...byCategory.keys()].sort((a, b) => {
        const ia = DISCIPLINE_CATEGORY_ORDER.indexOf(a);
        const ib = DISCIPLINE_CATEGORY_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
      });
      groupsContainer.innerHTML = cats.map(cat => {
        const list = byCategory.get(cat);
        const doneCount = list.filter(d => hasLoggedToday(d.id)).length;
        const cards = list.map(disciplineCardTemplate).join('');
        return `<details class="disc-group" open>
          <summary>
            <span class="disc-group__name">${escapeHTML(cat)}</span>
            <span class="disc-group__count">${list.length} ${list.length === 1 ? 'practice' : 'practices'}</span>
            <span class="disc-group__done">${doneCount}/${list.length} today</span>
          </summary>
          <div class="disc-group__body">${cards}</div>
        </details>`;
      }).join('');
    }
  }

  [groupsContainer, faithContainer].filter(Boolean).forEach(section => {
    section.querySelectorAll('[data-action="log-discipline"][disabled]').forEach((button) => {
      button.textContent = "Logged Today";
    });
  });
}

function getXPToday() {
  const entry = (state.dailyXPLedger || {})[localToday()];
  return entry ? Number(entry.postedXP) || 0 : 0;
}

function renderCommandBrief() {
  const today = localToday();
  const xpToday = getXPToday();

  // XP today label
  const xpEl = document.getElementById('briefXPToday');
  if (xpEl) {
    xpEl.textContent = xpToday > 0 ? `+${xpToday.toLocaleString()} XP today` : '+0 XP today';
    xpEl.style.color = xpToday > 0 ? 'var(--cyan)' : 'var(--text-dim)';
  }

  // Discipline status
  const discContainer = document.getElementById('briefDisciplines');
  if (discContainer) {
    const disciplines = (Array.isArray(state.disciplines) ? state.disciplines : []).filter(disciplineAppliesToday);
    discContainer.innerHTML = disciplines.length ? disciplines.map(disc => {
      const todayLog = state.disciplineLog.find(e => e.disciplineId === disc.id && e.date === today);
      const done = !!todayLog;
      const postedXP = todayLog && todayLog.postedXP !== undefined
        ? Number(todayLog.postedXP) || 0
        : Number(disc.xpPerCompletion) || 0;
      const dot = done
        ? `<span style="width:8px;height:8px;border-radius:50%;background:var(--cyan);flex-shrink:0;box-shadow:0 0 6px rgba(0,229,160,.5);"></span>`
        : `<span style="width:8px;height:8px;border-radius:50%;background:var(--surface-3);border:1px solid var(--line);flex-shrink:0;"></span>`;
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;
        border:1px solid ${done ? 'rgba(0,229,160,.25)' : 'var(--line)'};
        border-radius:6px;background:${done ? 'rgba(0,229,160,.06)' : 'transparent'};">
        ${dot}
        <span style="font-family:var(--mono);font-size:12px;color:${done ? 'var(--text)' : 'var(--text-muted)'};">
          ${escapeHTML(disc.name)}
        </span>
        ${done ? `<span style="margin-left:auto;font-family:var(--mono);font-size:10px;color:var(--cyan);">+${postedXP.toLocaleString()}</span>` : ''}
      </div>`;
    }).join('') : '<div class="empty" style="padding:10px;">No protocols scheduled for today.</div>';
  }

  // Pipeline snapshot
  const pipeContainer = document.getElementById('briefPipeline');
  if (pipeContainer) {
    const pipeline = Array.isArray(state.jobPipeline) ? state.jobPipeline : [];
    pipeContainer.innerHTML = PIPELINE_STAGES.map(stage => {
      const count = pipeline.filter(e => e.stage === stage).length;
      const isOffer = stage === 'Offer';
      const color = isOffer && count > 0 ? 'var(--gold)' : count > 0 ? 'var(--cyan)' : 'var(--text-dim)';
      return `<div style="display:flex;align-items:center;justify-content:space-between;
        padding:8px 10px;border:1px solid ${count > 0 ? 'rgba(0,229,160,.25)' : 'var(--line)'};
        border-radius:6px;background:${count > 0 ? 'rgba(0,229,160,.06)' : 'transparent'};">
        <span style="font-family:var(--mono);font-size:12px;color:var(--text-muted);">${stage}</span>
        <span style="font-family:var(--mono);font-size:14px;color:${color};font-weight:600;">${count}</span>
      </div>`;
    }).join('');
  }
}

function getTodaysCallItems() {
  const items = [];
  const activeQuests = Array.isArray(state.activeQuests) ? state.activeQuests : [];
  const disciplines = Array.isArray(state.disciplines) ? state.disciplines : [];
  const pipeline = Array.isArray(state.jobPipeline) ? state.jobPipeline : [];

  const highestQuest = activeQuests.reduce((best, quest) => {
    if (!best) return quest;
    return questBaseXP(quest) > questBaseXP(best) ? quest : best;
  }, null);

  if (highestQuest) {
    items.push({
      label: "Highest XP Quest",
      title: highestQuest.title || "Untitled quest",
      detail: `+${questBaseXP(highestQuest).toLocaleString()} XP available`
    });
  }

  ["Workout"].forEach((name) => {
    const discipline = disciplines.find((disc) => disc.name === name);
    if (discipline && !hasLoggedToday(discipline.id)) {
      items.push({
        label: "Discipline",
        title: discipline.name,
        detail: `+${Number(discipline.xpPerCompletion || 0).toLocaleString()} XP // ${discipline.frequency}`
      });
    }
  });

  const hasOffer = pipeline.some((entry) => entry.stage === "Offer");
  if (!hasOffer && pipeline.length) {
    const topPipeline = [...pipeline].sort((a, b) => {
      const stageDelta = PIPELINE_STAGES.indexOf(b.stage) - PIPELINE_STAGES.indexOf(a.stage);
      if (stageDelta) return stageDelta;
      return String(b.dateAdded || "").localeCompare(String(a.dateAdded || ""));
    })[0];

    if (topPipeline) {
      items.push({
        label: "Pipeline Action",
        title: `Follow up with ${topPipeline.company}`,
        detail: `${topPipeline.role || "Opportunity"} // ${topPipeline.stage || "Identified"}`
      });
    }
  }

  return items.slice(0, 4);
}

function getRecommendedAction() {
  const disciplines = Array.isArray(state.disciplines) ? state.disciplines : [];
  const morningPrayer = disciplines.find((disc) => disc.name === "Morning Prayer");
  if (morningPrayer && !hasLoggedToday(morningPrayer.id)) return "Morning Prayer";

  const activeQuests = Array.isArray(state.activeQuests) ? state.activeQuests : [];
  if (activeQuests.length) {
    const highestQuest = activeQuests.reduce((best, quest) => (
      questBaseXP(quest) > questBaseXP(best) ? quest : best
    ), activeQuests[0]);
    return highestQuest.title || "Highest XP Quest";
  }

  const pipeline = Array.isArray(state.jobPipeline) ? state.jobPipeline : [];
  const hasOffer = pipeline.some((entry) => entry.stage === "Offer");
  if (!hasOffer && pipeline.length) {
    const topPipeline = [...pipeline].sort((a, b) => {
      const stageDelta = PIPELINE_STAGES.indexOf(b.stage) - PIPELINE_STAGES.indexOf(a.stage);
      if (stageDelta) return stageDelta;
      return String(b.dateAdded || "").localeCompare(String(a.dateAdded || ""));
    })[0];
    return topPipeline ? `Follow up on ${topPipeline.company}` : "Pipeline Follow-Up";
  }

  return "Review the Chronicle";
}

function renderSanctuary() {
  const sanctuary = document.getElementById("sanctuary");
  if (!sanctuary) return;

  const identity = state.identity || {};
  const cycleDay = identity.cycleDay || state.daysTracked + 1 || 1;
  const activeQuestCount = Array.isArray(state.activeQuests) ? state.activeQuests.length : 0;
  const disciplines = Array.isArray(state.disciplines) ? state.disciplines : [];
  const unloggedDisciplineXP = disciplines.reduce((sum, disc) => {
    return hasLoggedToday(disc.id) ? sum : sum + (Number(disc.xpPerCompletion) || 0);
  }, 0);
  const availableXP = potentialXP() + unloggedDisciplineXP;
  const callItems = getTodaysCallItems();

  const identityLine = document.getElementById("sanctuaryIdentityLine");
  if (identityLine) {
    identityLine.textContent = `Archetype: ${identity.archetype || "Operator"} // Faith: ${identity.faith || "#FAITH#"} // Cycle Day ${cycleDay}`;
  }

  const activeEl = document.getElementById("sanctuaryActiveQuests");
  const daysEl = document.getElementById("sanctuaryTrackedDays");
  const compoundEl = document.getElementById("sanctuaryCompound");
  const availableEl = document.getElementById("sanctuaryAvailableXP");
  const recommendedEl = document.getElementById("sanctuaryRecommended");
  const callList = document.getElementById("sanctuaryCallList");

  if (activeEl) activeEl.textContent = activeQuestCount.toLocaleString();
  if (daysEl) daysEl.textContent = state.daysTracked.toLocaleString();
  if (compoundEl) compoundEl.textContent = `${compound().toFixed(2)}x`;
  if (availableEl) availableEl.textContent = `+${availableXP.toLocaleString()}`;
  if (recommendedEl) recommendedEl.textContent = getRecommendedAction();

  if (callList) {
    callList.innerHTML = callItems.length
      ? callItems.map((item) => `<li>
          <strong>${escapeHTML(item.title)}</strong>
          <small>${escapeHTML(item.label)} // ${escapeHTML(item.detail)}</small>
        </li>`).join("")
      : `<li>
          <strong>Review the Chronicle</strong>
          <small>No urgent signals. Study the pattern and choose the next move.</small>
        </li>`;
  }
}

function showSanctuary() {
  if (sessionStorage.getItem("kairu_sanctuary_dismissed") === "true") return;
  renderSanctuary();
  const sanctuary = document.getElementById("sanctuary");
  if (!sanctuary) return;
  sanctuary.hidden = false;
  document.body.classList.add("sanctuary-active");
}

function dismissSanctuary() {
  sessionStorage.setItem("kairu_sanctuary_dismissed", "true");
  const sanctuary = document.getElementById("sanctuary");
  if (sanctuary) sanctuary.hidden = true;
  document.body.classList.remove("sanctuary-active");
}

function renderXPLog() {
  const container = document.getElementById('xpLogFeed');
  if (!container) return;
  const log = Array.isArray(state.xpLog) ? state.xpLog : [];

  if (!log.length) {
    container.classList.remove('xp-feed-fade');
    container.innerHTML = '<div class="empty">No XP events yet. Complete a quest or log a discipline.</div>';
    return;
  }

  // Keep the command view light: paint only the most recent handful and let
  // the older ones fade out toward the Titles Collection. Full history is
  // preserved in state.xpLog.
  const VISIBLE = 5;
  container.classList.toggle('xp-feed-fade', log.length > VISIBLE);

  const bandColor = {
    prime: 'var(--cyan)',
    overflow: 'var(--gold)',
    hardstop: 'var(--red)'
  };

  const bandLabel = {
    prime: 'PRIME',
    overflow: 'OVERFLOW',
    hardstop: 'CAP REACHED'
  };

  container.innerHTML = log.slice(0, VISIBLE).map(entry => {
    const date = new Date(entry.timestamp);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = date.toTimeString().slice(0, 5);
    const color = bandColor[entry.band] || 'var(--cyan)';
    const label = bandLabel[entry.band] || entry.band;
    const name = entry.source === 'quest'
      ? entry.questTitle
      : entry.disciplineName;
    const rarityOrType = entry.source === 'quest'
      ? `<span class="pill ${String(entry.rarity || 'common').toLowerCase()}">${escapeHTML(entry.rarity || 'Common')}</span>`
      : `<span class="pill discipline">Discipline</span>`;
    const economy = entry.economy || (entry.source === "quest" ? "CXP" : "XP");
    const kxpSuffix = entry.kxpEarned ? ` // +${Number(entry.kxpEarned).toLocaleString()} KXP` : "";
    const xpDisplay = entry.band === 'hardstop'
      ? `<span style="color:var(--red);">+0 ${escapeHTML(economy)} <span style="font-size:10px;">(${entry.rawXP} raw blocked)</span></span>`
      : entry.rawXP !== entry.postedXP
      ? `<span style="color:${color};">+${entry.postedXP} ${escapeHTML(economy)}${kxpSuffix} <span style="font-size:10px;">(${entry.rawXP} raw)</span></span>`
      : `<span style="color:${color};">+${entry.postedXP} ${escapeHTML(economy)}${kxpSuffix}</span>`;

    return `<article class="quest-card" style="grid-template-columns:minmax(0,1fr) auto;gap:12px;">
      <div>
        <div style="font-size:14px;color:var(--text);line-height:1.3;">${escapeHTML(name || 'Unknown')}</div>
        <div class="quest-meta" style="margin-top:6px;">
          ${rarityOrType}
          <span>${dateStr} · ${timeStr}</span>
          <span style="color:${color};font-family:var(--mono);font-size:10px;letter-spacing:.1em;">${label}</span>
        </div>
      </div>
      <div style="text-align:right;font-family:var(--mono);font-size:14px;white-space:nowrap;">
        ${xpDisplay}
      </div>
    </article>`;
  }).join('');
}

function renderTitles() {
  const container = document.getElementById('titlesPanel');
  if (!container) return;

  const earned = Array.isArray(state.titlesEarned) ? state.titlesEarned : [];
  const activeTitle = state.activeTitle || null;
  const tiers = RANK_CONFIG.tiers;

  const tierColor = {
    E: 'var(--text-muted)',
    D: 'var(--cyan)',
    C: 'var(--green)',
    B: 'var(--violet)',
    A: 'var(--gold)',
    S: 'var(--red)',
    SS: '#ff9fff',
    SSS: 'var(--gold)'
  };

  const tierTint = {
    E: 'rgba(138,151,167,.1)',
    D: 'rgba(0,229,160,.07)',
    C: 'rgba(72,189,122,.07)',
    B: 'rgba(157,124,255,.07)',
    A: 'rgba(201,168,76,.07)',
    S: 'rgba(239,68,68,.07)',
    SS: 'rgba(255,159,255,.07)',
    SSS: 'rgba(201,168,76,.12)'
  };

  const currentRankIndex = tiers.indexOf(state.identity.tier);

  // Pinned starter title: "Awakened" is auto-awarded to every operator and rendered
  // with an illuminated treatment, outside the tier ladder.
  const awakenedActive = activeTitle === "Awakened";
  const awakenedCard = `<div class="title-card title-card--awakened${awakenedActive ? ' is-active' : ''}"
      data-action="set-title" data-title="Awakened">
      <div class="title-card__name">${awakenedActive ? '▶ ' : ''}Awakened</div>
      <div class="title-card__status">${awakenedActive ? 'ACTIVE' : 'EARNED // The first light'}</div>
    </div>`;
  const starterGroup = `<details class="title-tier" open>
      <summary><span class="title-tier__label" style="color:var(--gold);">STARTER</span><span class="title-tier__rule"></span></summary>
      <div class="title-tier__grid">${awakenedCard}</div>
    </details>`;

  const tierGroups = tiers.map(tier => {
    const titles = RANK_CONFIG.titles[tier] || [];
    const color = tierColor[tier] || 'var(--text-muted)';
    const tierIndex = tiers.indexOf(tier);

    const titleCards = titles.map(title => {
      const isEarned = earned.includes(title);
      const isActive = title === activeTitle;
      const isTierFuture = tierIndex > currentRankIndex;

      // Opacity: earned = full, unearned in reach = subtle, future tier = very dim
      const opacity = isEarned ? '1' : isTierFuture ? '0.25' : '0.45';

      // Border and background only apply to earned titles
      const borderColor = isEarned ? color : 'var(--line)';
      const background = isEarned ? tierTint[tier] : 'transparent';
      const cursor = isEarned ? 'pointer' : 'default';

      // Label logic
      const statusLabel = isActive
        ? `<div style="font-size:10px;color:var(--text-dim);margin-top:3px;font-family:var(--mono);">ACTIVE</div>`
        : !isEarned
        ? `<div style="font-size:10px;color:var(--text-dim);margin-top:3px;font-family:var(--mono);">${isTierFuture ? 'LOCKED' : 'NOT YET EARNED'}</div>`
        : '';

      return `<div style="
          position:relative;
          padding:10px 12px;
          border:1px solid ${borderColor};
          border-radius:6px;
          background:${background};
          opacity:${opacity};
          cursor:${cursor};
        "
        ${isEarned ? `data-action="set-title" data-title="${escapeHTML(title)}"` : ''}
      >
        <div style="font-family:var(--mono);font-size:12px;color:${isEarned ? color : 'var(--text-dim)'};">
          ${isActive ? '▶ ' : ''}${escapeHTML(title)}
        </div>
        ${statusLabel}
      </div>`;
    }).join('');

    const earnedInTier = titles.filter(t => earned.includes(t)).length;
    // Open the current rank's tier by default; collapse the rest.
    const openAttr = tierIndex === currentRankIndex ? ' open' : '';
    return `<details class="title-tier"${openAttr}>
      <summary>
        <span class="title-tier__label" style="color:${color};">${tier}-TIER</span>
        <span class="title-tier__rule"></span>
        <span class="title-tier__count">${earnedInTier}/${titles.length}</span>
      </summary>
      <div class="title-tier__grid">
        ${titleCards}
      </div>
    </details>`;
  }).join('');

  container.innerHTML = starterGroup + tierGroups;
}

function setActiveTitle(title) {
  if (!state.titlesEarned.includes(title)) return;
  state.activeTitle = title;
  saveState();
  renderTitles();
  renderRank();
  showToast(`Title set: ${title}`);
}

function renderAll() {
  renderTrack();
  renderCommandBrief();
  renderIdentity();
  renderMetrics();
  renderQuests();
  renderFullArchive();
  renderFinance();
  renderIncomeModule();
  renderPipeline();
  renderDisciplines();
  renderSkills();
  renderSanctuary();
  renderSerendipity();
  renderXPLog();
  renderTitles();
  renderEchoes();
  renderTasks();
  renderReadiness();
  renderResume();
  updateViewStatus(); // keep the header status line's live numbers in sync
  els.bootCompound.textContent = `Compound Multiplier: ${compound().toFixed(2)}x`;
}

const TIER_CONFIG = {
  expert:     { label: 'Expert',     pillClass: 'legendary', color: 'var(--gold)' },
  proficient: { label: 'Proficient', pillClass: 'rare',      color: 'var(--cyan)' },
  moderate:   { label: 'Moderate',   pillClass: 'uncommon',  color: 'var(--green)' },
  beginner:   { label: 'Beginner',   pillClass: 'common',    color: 'var(--text-muted)' },
  acquiring:  { label: 'Acquiring',  pillClass: 'epic',      color: 'var(--violet)' }
};

function getTierLabel(tier) {
  return (TIER_CONFIG[String(tier).toLowerCase()] || TIER_CONFIG.acquiring).label;
}

function getTierClass(tier) {
  return (TIER_CONFIG[String(tier).toLowerCase()] || TIER_CONFIG.acquiring).pillClass;
}

function renderIdentity() {
  const id = state.identity || {};
  els.identityName.textContent = String(id.name || '#NAME#');
  els.identityArchetype.textContent = 'Archetype: ' + (id.archetype || 'Unset');
  els.identityTier.textContent = String(id.tier || 'E');
  els.identityFaith.textContent = 'Faith: ' + (id.faith || '#FAITH#');

  const days = Number(state.daysTracked) || 0;
  const cycleDay = id.cycleDay || days + 1;
  const mult = compound();
  const tracked = isTrackedToday();

  // Cycle card: the operating cadence, plain-language.
  const cycleEl = document.getElementById('identityCycle');
  const trackingEl = document.getElementById('identityTracking');
  if (cycleEl) cycleEl.textContent = 'Day ' + cycleDay;
  if (trackingEl) trackingEl.textContent = tracked ? 'Today: Tracked ✓' : 'Today: Not yet tracked';

  // Days Tracked card.
  const daysEl = document.getElementById('identityDays');
  const daysMetaEl = document.getElementById('identityDaysMeta');
  if (daysEl) daysEl.textContent = days.toLocaleString();
  if (daysMetaEl) daysMetaEl.textContent = days === 1 ? '1 intentional day banked' : `${days.toLocaleString()} intentional days banked`;

  // Compound Growth card.
  const compEl = document.getElementById('identityCompound');
  const compMetaEl = document.getElementById('identityCompoundMeta');
  if (compEl) compEl.textContent = mult.toFixed(2) + 'x';
  if (compMetaEl) compMetaEl.textContent = '+1% per tracked day, compounding';

  // Compact peek shown on the collapsed "Operator Stats" summary.
  const peekEl = document.getElementById('operatorStatsPeek');
  if (peekEl) peekEl.textContent = `Cycle ${cycleDay} · ${days}d · ${mult.toFixed(2)}x`;
}

// --- Local skill-suggestion heuristic -------------------------------------
// Browser-only "AI": keyword rules map a skill name to a starting archetype
// (category), tier, XP and tags. Mirrors the resume-extraction keyword approach.
// No network, no keys. Suggestions are always user-editable.
const SKILL_CATEGORIES = ['Business / Leadership', 'Technical / Digital', 'Creative / Arts', 'Physical / Athletic'];

const SKILL_SUGGEST_RULES = [
  { category: 'Technical / Digital', tier: 'acquiring', kw: ['code', 'coding', 'program', 'developer', 'software', 'javascript', 'python', 'java', 'typescript', 'react', 'web', 'app', 'data', 'analytics', 'sql', 'ai', 'prompt', 'automation', 'cloud', 'aws', 'devops', 'engineer', 'cyber', 'security', 'it ', 'network', 'database'] },
  { category: 'Business / Leadership', tier: 'beginner', kw: ['sales', 'negotiat', 'marketing', 'strategy', 'leadership', 'management', 'manager', 'finance', 'account', 'operations', 'product', 'founder', 'business', 'consult', 'recruit', 'hr', 'project', 'analyst', 'real estate'] },
  { category: 'Creative / Arts', tier: 'beginner', kw: ['design', 'art', 'visual', 'video', 'film', 'photo', 'write', 'writing', 'content', 'music', 'illustrat', 'brand', 'ux', 'ui', 'animation', 'creative', 'editor', 'edit'] },
  { category: 'Physical / Athletic', tier: 'beginner', kw: ['strength', 'fitness', 'condition', 'cardio', 'endurance', 'wrestl', 'jiu', 'bjj', 'box', 'martial', 'swim', 'run', 'lift', 'sport', 'athlet', 'yoga', 'mobility', 'climb'] }
];

function suggestSkillMeta(name) {
  const lower = String(name || '').toLowerCase();
  let match = null;
  if (lower.trim()) {
    match = SKILL_SUGGEST_RULES.find(rule => rule.kw.some(k => lower.includes(k)));
  }
  const category = match ? match.category : 'Business / Leadership';
  const tier = match ? match.tier : 'acquiring';
  const defaults = TIER_XP_DEFAULTS[tier] || TIER_XP_DEFAULTS.acquiring;
  return { category, tier, xp: defaults.xp, xpMax: defaults.xpMax };
}

// Career presets: choosing one seeds a starter registry. Tiers/XP are suggestions
// the operator can adjust afterward via "Adjust XP".
const CAREER_PRESETS = {
  'Software Engineer': [
    { name: 'Web / App Building', category: 'Technical / Digital', tier: 'proficient', tags: ['HTML/CSS', 'JavaScript', 'APIs'] },
    { name: 'Data & Analytics', category: 'Technical / Digital', tier: 'acquiring', tags: ['SQL', 'Dashboards'] },
    { name: 'AI Tools & Prompting', category: 'Technical / Digital', tier: 'acquiring', tags: ['Prompting', 'Workflow AI'] },
    { name: 'Strategy & Vision', category: 'Business / Leadership', tier: 'acquiring', tags: ['Systems Thinking'] }
  ],
  'Sales / Business': [
    { name: 'Sales & Negotiation', category: 'Business / Leadership', tier: 'proficient', tags: ['Closing', 'Persuasion'] },
    { name: 'Strategy & Vision', category: 'Business / Leadership', tier: 'acquiring', tags: ['Macro Planning'] },
    { name: 'Marketing', category: 'Business / Leadership', tier: 'acquiring', tags: ['Funnels', 'Positioning'] },
    { name: 'Data & Analytics', category: 'Technical / Digital', tier: 'acquiring', tags: ['Metrics'] }
  ],
  'Creative / Designer': [
    { name: 'Design & Visual', category: 'Creative / Arts', tier: 'proficient', tags: ['Visual Identity', 'Composition'] },
    { name: 'Video & Film', category: 'Creative / Arts', tier: 'acquiring', tags: ['Editing', 'Storytelling'] },
    { name: 'Content & Writing', category: 'Creative / Arts', tier: 'acquiring', tags: ['Copy', 'Narrative'] },
    { name: 'AI Tools & Prompting', category: 'Technical / Digital', tier: 'acquiring', tags: ['Generative AI'] }
  ],
  'Athlete / Physical': [
    { name: 'Strength & Conditioning', category: 'Physical / Athletic', tier: 'proficient', tags: ['Programming', 'Recovery'] },
    { name: 'Endurance / Cardio', category: 'Physical / Athletic', tier: 'acquiring', tags: ['Zone 2', 'Pacing'] },
    { name: 'Mobility / Flexibility', category: 'Physical / Athletic', tier: 'acquiring', tags: ['Range', 'Prehab'] }
  ],
  'Healthcare': [
    { name: 'Clinical Practice', category: 'Technical / Digital', tier: 'beginner', tags: ['Patient Care'] },
    { name: 'Pharmacology', category: 'Technical / Digital', tier: 'acquiring', tags: ['Medication'] },
    { name: 'Operations', category: 'Business / Leadership', tier: 'acquiring', tags: ['Workflow', 'Compliance'] }
  ],
  'Trades / Skilled Labor': [
    { name: 'Core Trade Craft', category: 'Physical / Athletic', tier: 'beginner', tags: ['Hands-on'] },
    { name: 'Safety & Compliance', category: 'Business / Leadership', tier: 'acquiring', tags: ['Standards'] },
    { name: 'Estimating / Bidding', category: 'Business / Leadership', tier: 'acquiring', tags: ['Quotes'] }
  ]
};

function applyCareerPreset(careerKey) {
  const preset = CAREER_PRESETS[careerKey];
  if (!preset) return;
  if (!Array.isArray(state.skills)) state.skills = [];
  let added = 0;
  preset.forEach(item => {
    const exists = state.skills.some(s => String(s.name || '').toLowerCase() === item.name.toLowerCase());
    if (exists) return;
    const defaults = TIER_XP_DEFAULTS[item.tier] || TIER_XP_DEFAULTS.acquiring;
    state.skills.push({
      id: 'sk-' + Date.now() + '-' + added,
      name: item.name,
      category: item.category,
      tier: item.tier,
      xp: defaults.xp,
      xpMax: defaults.xpMax,
      tags: item.tags || []
    });
    added++;
  });
  saveState();
  renderAll();
  showToast(added ? `${careerKey} preset added // ${added} skills` : 'Those skills already exist');
}

function skillsOnboardingHTML() {
  const careerOptions = Object.keys(CAREER_PRESETS)
    .map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  return `
  <div class="skill-onboard" style="grid-column:1/-1;">
    <div class="skill-onboard__head">
      <div class="skill-onboard__title">Build your Skill Registry</div>
      <div class="skill-onboard__copy">KAIRU starts empty. Seed your capabilities one of three ways — KAIRU suggests a starting archetype, tier and XP, and you can fine-tune anything after.</div>
    </div>
    <div class="skill-onboard__grid">
      <div class="skill-onboard__card">
        <div class="skill-onboard__num">01</div>
        <div class="skill-onboard__name">Extract from Resume</div>
        <div class="skill-onboard__desc">Paste your resume below and KAIRU pulls draft skills to approve.</div>
        <button class="btn cyan" type="button" data-action="onboard-resume" style="width:100%;justify-content:center;">Go to Resume Import</button>
      </div>
      <div class="skill-onboard__card">
        <div class="skill-onboard__num">02</div>
        <div class="skill-onboard__name">Pick a Career</div>
        <div class="skill-onboard__desc">Choose a path and KAIRU seeds a suggested starter set.</div>
        <select id="careerPresetSelect" class="skill-onboard__select">${careerOptions}</select>
        <button class="btn cyan" type="button" data-action="apply-career" style="width:100%;justify-content:center;margin-top:8px;">Seed These Skills</button>
      </div>
      <div class="skill-onboard__card">
        <div class="skill-onboard__num">03</div>
        <div class="skill-onboard__name">Create Manually</div>
        <div class="skill-onboard__desc">Add a single skill — type a name and KAIRU pre-fills the rest.</div>
        <button class="btn primary" type="button" data-action="open-skill" style="width:100%;justify-content:center;">Add a Skill</button>
      </div>
    </div>
  </div>`;
}

function renderSkills() {
  const container = document.getElementById('skillsList');
  if (!container) return;
  const skills = Array.isArray(state.skills) ? state.skills : [];
  if (!skills.length) {
    container.innerHTML = skillsOnboardingHTML();
    return;
  }

  const categories = [...new Set(skills.map(s => s.category))];
  const totalXP = getSkillXP();

  const tierCounts = {};
  skills.forEach(s => {
    const t = String(s.tier || 'acquiring').toLowerCase();
    tierCounts[t] = (tierCounts[t] || 0) + 1;
  });

  const summaryHTML = `
    <div style="grid-column:1/-1;display:flex;gap:12px;flex-wrap:wrap;padding:14px 16px;
      border:1px solid rgba(201,168,76,.2);border-radius:8px;
      background:linear-gradient(90deg,rgba(201,168,76,.07),transparent);margin-bottom:4px;">
      <div style="flex:1;min-width:120px;">
        <div style="color:var(--text-muted);font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;">Skill Registry XP</div>
        <div style="color:var(--gold);font-family:var(--mono);font-size:28px;line-height:1.2;margin-top:4px;">${totalXP.toLocaleString()}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${Object.entries(tierCounts).map(([tier, count]) => {
          const cfg = TIER_CONFIG[tier] || TIER_CONFIG.acquiring;
          return `<span class="pill ${cfg.pillClass}" style="gap:5px;">${count} ${cfg.label}</span>`;
        }).join('')}
      </div>
    </div>`;

  const categoriesHTML = categories.map(cat => {
    const catSkills = skills.filter(s => s.category === cat);
    const catXP = catSkills.reduce((sum, s) => sum + (Number(s.xp) || 0), 0);

    const skillCards = catSkills.map(s => {
      const xp = Number(s.xp) || 0;
      const xpMax = Number(s.xpMax) || 3000;
      const pct = Math.min(100, Math.round((xp / xpMax) * 100));
      const tierKey = String(s.tier || 'acquiring').toLowerCase();
      const cfg = TIER_CONFIG[tierKey] || TIER_CONFIG.acquiring;
      const tagsHTML = Array.isArray(s.tags) && s.tags.length
        ? s.tags.map(t => `<span style="color:var(--text-dim);font-family:var(--mono);font-size:10px;letter-spacing:.06em;">${escapeHTML(t)}</span>`).join(' &nbsp;&middot;&nbsp; ')
        : '';

      return `<article class="card" style="min-height:auto;padding:14px;">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-size:15px;color:var(--text);line-height:1.3;">${escapeHTML(s.name)}</div>
            ${tagsHTML ? `<div style="margin-top:5px;">${tagsHTML}</div>` : ''}
          </div>
          <span class="pill ${cfg.pillClass}" style="flex-shrink:0;">${cfg.label}</span>
        </div>
        <div class="progress" style="height:6px;" aria-label="${xp} of ${xpMax} XP">
          <span style="width:${pct}%;background:${cfg.color};"></span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:6px;color:var(--text-dim);font-family:var(--mono);font-size:11px;">
          <span>${xp.toLocaleString()} XP</span>
          <span>${pct}% to max</span>
        </div>
        <button class="btn ghost" data-action="edit-skill" data-skill-id="${escapeHTML(s.id)}"
          style="width:100%;justify-content:center;margin-top:10px;font-size:11px;min-height:30px;">
          Edit
        </button>
      </article>`;
    }).join('');

    return `<div style="grid-column:1/-1;">
      <div style="display:flex;align-items:center;gap:10px;margin:18px 0 10px;">
        <span style="color:var(--gold);font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;">${escapeHTML(cat)}</span>
        <span style="flex:1;height:1px;background:var(--line-soft);"></span>
        <span style="color:var(--text-dim);font-family:var(--mono);font-size:11px;">${catXP.toLocaleString()} XP</span>
      </div>
      <div class="grid skills-grid">${skillCards}</div>
    </div>`;
  }).join('');

  container.innerHTML = summaryHTML + categoriesHTML;
}

function renderClock() {
  const now = new Date();
  const day = ["SUN","MON","TUE","WED","THU","FRI","SAT"][now.getDay()];
  const month = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][now.getMonth()];
  const date = String(now.getDate()).padStart(2, "0");
  const time = now.toTimeString().slice(0, 8);
  els.clock.innerHTML = `${day} ${date} ${month} ${now.getFullYear()}<br><b>${time}</b>`;
}

function saveNote(skip) {
  const note = skip ? null : els.noteText.value.trim() || null;
  const quest = state.activeQuests.find(q => q.id === pendingQuestId);
  if (!quest) { hideModal(els.noteModal); return; }
  quest.completion_note = note;
  completeQuest(pendingQuestId);
  pendingQuestId = null;
}

function openIdentity() {
  const id = state.identity || {};
  document.getElementById("identityNameInput").value = id.name || "";
  document.getElementById("identityArchetypeInput").value = normalizeArchetype(id.archetype);
  document.getElementById("identityTierInput").value = id.tier || "";
  document.getElementById("identityFaithInput").value = cleanFaithValue(id.faith);
  showModal(els.identityModal);
}

function saveIdentity() {
  if (!state.identity) state.identity = {};
  const tierValue = (document.getElementById("identityTierInput").value.trim() || "E").toUpperCase();
  if (!RANK_CONFIG.tiers.includes(tierValue)) {
    showToast("Rank tier must be E, D, C, B, A, S, SS, or SSS");
    document.getElementById("identityTierInput").focus();
    return;
  }

  const previousTier = state.identity.tier || "E";
  state.identity.name = document.getElementById("identityNameInput").value.trim() || null;
  state.identity.archetype = normalizeArchetype(document.getElementById("identityArchetypeInput").value);
  state.identity.tier = tierValue;
  state.identity.faith = cleanFaithValue(document.getElementById("identityFaithInput").value);
  state.identity.lastUpdated = new Date().toISOString();
  if (previousTier !== state.identity.tier) {
    syncActiveRankHistory(state);
  }
  syncFaithDiscipline(state);
  saveState();
  hideModal(els.identityModal);
  renderAll();
  showToast("Identity committed");
}

// Tracks whether the operator has hand-edited the skill meta fields; while false,
// the heuristic is allowed to keep refining suggestions as they type the name.
let skillMetaTouched = false;
// Id of the skill currently being edited via the skill modal, or null when the
// modal is in "register new" mode.
let editingSkillId = null;

function setSkillModalMode(editing) {
  const titleEl = document.getElementById('skillModalTitle');
  const saveBtn = document.querySelector('[data-action="save-skill"]');
  if (titleEl) titleEl.textContent = editing ? 'Edit Skill' : 'Register Skill';
  if (saveBtn) saveBtn.textContent = editing ? 'Save Changes' : 'Register';
}

function openSkill() {
  editingSkillId = null;
  skillMetaTouched = false;
  document.getElementById('skillNameInput').value = '';
  document.getElementById('skillCategoryInput').value = 'Business / Leadership';
  document.getElementById('skillTierInput').value = 'acquiring';
  document.getElementById('skillXPInput').value = '1000';
  document.getElementById('skillTagsInput').value = '';
  setSkillModalMode(false);
  showModal(els.skillModal);
  setTimeout(() => document.getElementById('skillNameInput').focus(), 50);
}

// Open the skill modal pre-filled to edit an existing skill. Lets the operator
// recalibrate an extracted/imported skill's tier (proficiency), category, and XP
// — important for resume-imported skills that land mis-classified as "Acquiring".
function editSkill(skillId) {
  const skill = (state.skills || []).find(s => s.id === skillId);
  if (!skill) return;
  editingSkillId = skillId;
  skillMetaTouched = true; // don't let the name heuristic overwrite real values
  document.getElementById('skillNameInput').value = skill.name || '';
  document.getElementById('skillCategoryInput').value = skill.category || 'Business / Leadership';
  document.getElementById('skillTierInput').value = String(skill.tier || 'acquiring').toLowerCase();
  document.getElementById('skillXPInput').value = String(Number(skill.xp) || 0);
  document.getElementById('skillTagsInput').value = Array.isArray(skill.tags) ? skill.tags.join(', ') : '';
  setSkillModalMode(true);
  showModal(els.skillModal);
  setTimeout(() => document.getElementById('skillNameInput').focus(), 50);
}

const TIER_XP_DEFAULTS = {
  expert: { xp: 2500, xpMax: 3000 },
  proficient: { xp: 1800, xpMax: 2500 },
  moderate: { xp: 1200, xpMax: 1800 },
  beginner: { xp: 1000, xpMax: 1200 },
  acquiring: { xp: 1000, xpMax: 2500 }
};

function adjustSkillXP(skillId) {
  const skill = (state.skills || []).find(s => s.id === skillId);
  if (!skill) return;
  const input = window.prompt(
    `Adjust XP for "${skill.name}"\nCurrent: ${skill.xp} / Max: ${skill.xpMax}\nEnter new XP value:`,
    String(skill.xp)
  );
  if (input === null) return; // cancelled
  const val = Math.round(Number(input));
  if (Number.isNaN(val) || val < 0) { showToast('Invalid XP value'); return; }
  if (val > skill.xpMax) { showToast(`Max XP for this tier is ${skill.xpMax}`); return; }
  skill.xp = val;
  saveState();
  renderSkills();
  showToast(`${skill.name} updated to ${val.toLocaleString()} XP`);
}

function saveSkill() {
  const name = document.getElementById('skillNameInput').value.trim();
  if (!name) { showToast('Skill name required'); return; }

  const category = document.getElementById('skillCategoryInput').value;
  const tier = document.getElementById('skillTierInput').value;
  const xpInput = Math.max(0, Number(document.getElementById('skillXPInput').value) || 0);
  const tagsRaw = document.getElementById('skillTagsInput').value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const tierDefaults = TIER_XP_DEFAULTS[tier] || TIER_XP_DEFAULTS.acquiring;
  // When editing, honor the literal XP entered (including 0, e.g. a freshly
  // imported resume skill). When registering new, an empty field defaults to the
  // tier's nominal starting XP.
  const xp = editingSkillId ? xpInput : (xpInput || tierDefaults.xp);
  // Allow a hand-set XP above the tier's nominal max so the value the operator
  // enters is never silently clamped; the progress bar still caps visually.
  const xpMax = Math.max(tierDefaults.xpMax, xp);

  if (!Array.isArray(state.skills)) state.skills = [];

  if (editingSkillId) {
    const skill = state.skills.find(s => s.id === editingSkillId);
    if (skill) {
      skill.name = name;
      skill.category = category;
      skill.tier = tier;
      skill.xp = xp;
      skill.xpMax = xpMax;
      skill.tags = tags;
    }
    editingSkillId = null;
    saveState();
    hideModal(els.skillModal);
    renderAll();
    showToast(name + ' updated');
    return;
  }

  state.skills.push({
    id: 'sk-' + Date.now(),
    name,
    category,
    tier,
    xp,
    xpMax,
    tags
  });

  saveState();
  hideModal(els.skillModal);
  renderAll();
  showToast(name + ' registered');
}

document.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  if (action === "track") trackToday();
  if (action === "open-quest") openQuest();
  if (action === "close-quest") closeQuest();
  if (action === "save-quest") saveQuest();
  if (action === "complete-quest") {
    const quest = state.activeQuests.find(q => q.id === actionTarget.dataset.id);
    if (!quest) return;
    pendingQuestId = actionTarget.dataset.id;
    const projectedCXP = XP_ENGINE.calculateCXP(questBaseXP(quest), getActiveMultiplier());
    els.noteXP.textContent = `+${projectedCXP.toLocaleString()} CXP x ${getActiveMultiplier().toFixed(2)} multiplier`;
    els.noteText.value = "";
    showModal(els.noteModal);
  }
  if (action === "flag-serendipity") flagSerendipity(actionTarget.dataset.id);
  if (action === "save-note") saveNote(false);
  if (action === "skip-note") saveNote(true);
  if (action === "open-fin") openFinance();
  if (action === "close-finance") closeFinance();
  if (action === "save-finance") saveFinance();
  if (action === "open-income") openIncome();
  if (action === "close-income") closeIncome();
  if (action === "save-income") saveIncome();
  if (action === "open-pipeline") openPipeline();
  if (action === "close-pipeline") closePipeline();
  if (action === "save-pipeline") savePipeline();
  if (action === "open-discipline") openDiscipline();
  if (action === "save-discipline") saveDiscipline();
  if (action === "close-discipline") closeDiscipline();
  if (action === "open-identity") openIdentity();
  if (action === "save-identity") saveIdentity();
  if (action === "close-identity") hideModal(els.identityModal);
  if (action === "open-skill") openSkill();
  if (action === "save-skill") saveSkill();
  if (action === "close-skill") hideModal(els.skillModal);
  if (action === "adjust-skill-xp") adjustSkillXP(actionTarget.dataset.skillId);
  if (action === "edit-skill") editSkill(actionTarget.dataset.skillId);
  if (action === "reset") resetState();
  if (action === "export-backup") exportBackup();
  if (action === "import-backup") importBackup();
  if (action === "open-archive") openArchive();
  if (action === "close-archive") closeArchive();
  if (action === 'pipeline-stage') advancePipelineStage(actionTarget.dataset.id, actionTarget.dataset.stage);
  if (action === 'log-discipline') logDiscipline(actionTarget.dataset.id);
  if (action === "dismiss-sanctuary") dismissSanctuary();
  if (action === "ascend") attemptAscend();
  if (action === 'set-title') setActiveTitle(actionTarget.dataset.title);
  if (action === "open-echo") openEcho();
  if (action === "close-echo") closeEcho();
  if (action === "save-echo") saveEcho();
  if (action === "toggle-echoes") { echoesExpanded = !echoesExpanded; renderEchoes(); }
  if (action === "open-task") openTask();
  if (action === "close-task") closeTask();
  if (action === "save-task") saveTask();
  if (action === "complete-task") completeTask(actionTarget.dataset.id);
  if (action === "delete-task") deleteTask(actionTarget.dataset.id);
  if (action === "extract-resume") extractResumeSkills();
  if (action === "clear-resume") clearResume();
  if (action === "approve-resume") approveResumeSkills();
  if (action === "open-coach-export") openCoachExport();
  if (action === "close-coach-export") closeCoachExport();
  if (action === "copy-coach-export") copyCoachExport();
  // Mobile navigation + skill onboarding
  if (action === "goview") setView(actionTarget.dataset.view);
  if (action === "open-more") openMore();
  if (action === "close-more") closeMore();
  if (action === "apply-career") {
    const sel = document.getElementById("careerPresetSelect");
    if (sel) applyCareerPreset(sel.value);
  }
  if (action === "onboard-resume") {
    setView("skills");
    const ta = document.getElementById("resumeTextInput");
    if (ta) { ta.scrollIntoView({ behavior: "smooth", block: "center" }); window.setTimeout(() => ta.focus(), 200); }
  }
});

document.addEventListener("change", (event) => {
  const timeTarget = event.target.closest('[data-action="set-disc-time"]');
  if (timeTarget) setDisciplineTime(timeTarget.dataset.id, timeTarget.value);

  if (event.target && event.target.id === "importFileInput") {
    const file = event.target.files && event.target.files[0];
    handleImportFile(file);
    event.target.value = "";  // allow re-importing the same file later
  }
});

document.addEventListener("keydown", (event) => {
  // Enter / Space activates non-button elements exposed as role="button"
  // (e.g. the tappable metric cards on the Command Center).
  if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
    const target = event.target;
    if (target && target.getAttribute && target.getAttribute("role") === "button" && target.dataset && target.dataset.action) {
      event.preventDefault();
      target.click();
    }
    return;
  }

  if (event.key !== "Escape") return;
  [els.questModal, els.noteModal, els.financeModal, els.disciplineModal, els.identityModal, els.skillModal, els.incomeModal, els.pipelineModal, els.echoModal, els.taskModal, els.coachExportModal].forEach(hideModal);
});

$$(".modal-bg").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) hideModal(modal);
  });
});

$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

['questMinutes','questQuality','questKnowHow','questProblemSolving','questAccountability'].forEach(id => {
  document.getElementById(id).addEventListener('change', syncXP);
  document.getElementById(id).addEventListener('input', syncXP);
});

// Skill modal: local heuristic suggests archetype (category), tier and starting XP
// from the skill name. Stops auto-suggesting once the operator edits a meta field.
(function wireSkillSuggest() {
  const nameEl = document.getElementById('skillNameInput');
  const catEl = document.getElementById('skillCategoryInput');
  const tierEl = document.getElementById('skillTierInput');
  const xpEl = document.getElementById('skillXPInput');
  if (!nameEl || !catEl || !tierEl || !xpEl) return;

  nameEl.addEventListener('input', () => {
    if (skillMetaTouched) return;
    const meta = suggestSkillMeta(nameEl.value);
    catEl.value = meta.category;
    tierEl.value = meta.tier;
    xpEl.value = meta.xp;
  });
  [catEl, tierEl, xpEl].forEach(el => el.addEventListener('change', () => { skillMetaTouched = true; }));
})();

// One-time migration from old storage key
(function migrateStorage() {
  const old = localStorage.getItem('lifeos_phase1_v1');
  if (old && !localStorage.getItem('kairu_v1')) {
    localStorage.setItem('kairu_v1', old);
    localStorage.removeItem('lifeos_phase1_v1');
  }
})();

// One-time migration: faith is now handled by the Faith / Belief Protocol,
// so retire the legacy seeded Morning Prayer + Sunday Service disciplines.
(function retireLegacyFaithDefaults() {
  if (localStorage.getItem('kairu_faithdefaults_retired') === 'true') return;
  const RETIRE_IDS = ['disc-001', 'disc-003'];
  try {
    const raw = localStorage.getItem('kairu_v1');
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.disciplines)) {
        saved.disciplines = saved.disciplines.filter(d => !RETIRE_IDS.includes(d.id));
        if (Array.isArray(saved.disciplineLog)) {
          saved.disciplineLog = saved.disciplineLog.filter(e => !RETIRE_IDS.includes(e.disciplineId));
        }
        localStorage.setItem('kairu_v1', JSON.stringify(saved));
      }
    }
  } catch (err) {
    console.warn('Faith-defaults retirement skipped:', err);
  }
  localStorage.setItem('kairu_faithdefaults_retired', 'true');
})();

// One-time migration: fold the legacy serendipity buff (previously stored under
// standalone localStorage keys) into the main kairu_v1 state object so it
// serializes with everything else and survives a Supabase migration.
(function migrateSerendipityIntoState() {
  if (localStorage.getItem('kairu_serendipity_migrated') === 'true') return;
  try {
    const expiry = parseInt(localStorage.getItem('serendipityBuffExpiry') || '0', 10);
    const mult = parseFloat(localStorage.getItem('serendipityMultiplier') || '0');
    const raw = localStorage.getItem('kairu_v1');
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && !saved.serendipity) {
        const validExpiry = Number.isFinite(expiry) ? expiry : 0;
        saved.serendipity = {
          buffExpiry: validExpiry,
          multiplier: mult > 0 ? mult : 1.0,
          source: (validExpiry && Date.now() < validExpiry) ? 'legacy_migration' : null,
          flaggedQuestId: null
        };
        localStorage.setItem('kairu_v1', JSON.stringify(saved));
      }
    }
  } catch (err) {
    console.warn('Serendipity migration skipped:', err);
  }
  localStorage.removeItem('serendipityBuffExpiry');
  localStorage.removeItem('serendipityMultiplier');
  localStorage.setItem('kairu_serendipity_migrated', 'true');
})();

// One-time migration to the Alpha (canonical) storage key.
// If the new key (kairu_alpha_v1) has no data yet but legacy Phase 1 data
// (kairu_v1) exists, import the legacy blob once and persist it under the new
// key. From then on the app reads/writes ONLY kairu_alpha_v1 (STORAGE_KEY) --
// the legacy key is never read again and is left intact as an untouched backup.
(function migrateToAlphaStorage() {
  try {
    const alpha = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const alreadyMigrated = localStorage.getItem('kairu_alpha_migrated') === 'true';
    if (!alpha && legacy && !alreadyMigrated) {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.setItem('kairu_alpha_migrated', 'true');
      // Defer the one-time toast until after the boot overlay clears so it shows.
      window.setTimeout(() => {
        if (typeof showToast === 'function') showToast('Legacy data migrated successfully.');
      }, 1500);
    }
  } catch (err) {
    console.warn('Alpha storage migration skipped:', err);
  }
})();

// One-time migration: KAIRU now ships with an empty Skill Registry and onboards
// each operator. This clears the previously seeded personal skills from the saved
// vault exactly once (skills only — quests, XP, finance, disciplines untouched).
(function clearSeededSkills() {
  if (localStorage.getItem('kairu_skills_cleared_v1') === 'true') return;
  [STORAGE_KEY, LEGACY_STORAGE_KEY].forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') {
        saved.skills = [];
        localStorage.setItem(key, JSON.stringify(saved));
      }
    } catch (err) {
      console.warn('Skill clear skipped for', key, err);
    }
  });
  localStorage.setItem('kairu_skills_cleared_v1', 'true');
})();

if (!localStorage.getItem('questContributors')) {
  localStorage.setItem('questContributors', JSON.stringify([]));
}

loadState();
maybeBacklogEcho(); // Echo: flag a high quest backlog on load (no XP awarded)
maybeTaskBacklogEcho(); // Echo: flag high task backlog on load (no XP awarded)
saveState();
renderAll();
setView('command'); // Command Center is the default landing view (syncs bottom nav)
console.log('KAIRU CONTEXT', assembleContext());
renderClock();
window.setInterval(renderClock, 1000);
window.setInterval(renderSerendipity, 1000);
window.setTimeout(() => {
  els.boot.classList.add("gone");
  if (sessionStorage.getItem("kairu_sanctuary_dismissed") !== "true") showSanctuary();
}, 1200);
