import {
  elderRoleCatalog,
  factionCatalog,
  governanceStyleCatalog,
  sectRuleCatalog,
  type ElderRoleDefinition,
  type GovernanceStyleDefinition,
  type SectModifierDefinition,
  type SectRuleDefinition
} from '@/game/data';
import type { GameStateManager } from '@/game/state/GameStateManager';
import type { GameState, SectGuestState } from '@/game/state/types';
import { SaveSystem } from '@/game/systems/LocalSaveStore';

export interface SectIdentityActionResult {
  ok: boolean;
  message: string;
  snapshot: Readonly<GameState>;
}

export interface DailySectIdentityUpdateResult {
  lines: string[];
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.trunc(value)));
}

function addModifiers(target: SectModifierDefinition, source?: SectModifierDefinition): void {
  if (!source) {
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== 'number') {
      continue;
    }

    const nextKey = key as keyof SectModifierDefinition;
    target[nextKey] = (target[nextKey] ?? 0) + Math.trunc(value);
  }
}

function getGuestTemplate(factionId: string): Omit<SectGuestState, 'id' | 'remainingDays'> | null {
  switch (factionId) {
    case 'xich_luyen_bao':
      return {
        name: 'Khách khanh Xích Luyện',
        sourceFactionId: factionId,
        specialty: 'alchemy_support',
        bonusSummary: 'Giúp ổn định luyện đan và khai thông vật tư.'
      };
    case 'van_tang_thu_vien':
      return {
        name: 'Khách khanh Vân Tàng',
        sourceFactionId: factionId,
        specialty: 'archive_support',
        bonusSummary: 'Giữ khí vận lắng lại và giảm độ mù mờ của các điềm báo.'
      };
    case 'huyen_minh_dien':
      return {
        name: 'Khách khanh Huyền Minh',
        sourceFactionId: factionId,
        specialty: 'discipline_support',
        bonusSummary: 'Giữ nội môn có khuôn phép, giảm nguy cơ xáo trộn.'
      };
    default:
      return null;
  }
}

function getGuestModifiers(guest: SectGuestState): SectModifierDefinition {
  switch (guest.specialty) {
    case 'alchemy_support':
      return { alchemyOutputBonus: 1, resourceProductionFlat: 1 };
    case 'archive_support':
      return { fortuneDaily: 1, diplomacyWeight: 1 };
    case 'discipline_support':
      return { stabilityDaily: 1, disciplineWeight: 1 };
    default:
      return {};
  }
}

export class SectIdentitySystem {
  constructor(
    private readonly stateManager: GameStateManager,
    private readonly saveSystem: SaveSystem
  ) {}

  getGovernanceStyleDefinition(styleId: string): GovernanceStyleDefinition | null {
    return governanceStyleCatalog.styles.find((style) => style.id === styleId) ?? null;
  }

  getRuleDefinition(ruleId: string): SectRuleDefinition | null {
    return sectRuleCatalog.rules.find((rule) => rule.id === ruleId) ?? null;
  }

  getElderRoleDefinition(roleId: string): ElderRoleDefinition | null {
    return elderRoleCatalog.roles.find((role) => role.id === roleId) ?? null;
  }

  getCombinedModifiers(snapshot: Readonly<GameState> = this.stateManager.snapshot): SectModifierDefinition {
    const total: SectModifierDefinition = {};
    addModifiers(total, this.getGovernanceStyleDefinition(snapshot.sect.governanceStyleId)?.effects);

    for (const ruleId of snapshot.sect.activeRuleIds) {
      addModifiers(total, this.getRuleDefinition(ruleId)?.effects);
    }

    for (const elder of snapshot.sect.elders) {
      addModifiers(total, this.getElderRoleDefinition(elder.roleId)?.effects);
    }

    for (const guest of snapshot.sect.guestCultivators) {
      addModifiers(total, getGuestModifiers(guest));
    }

    return total;
  }

  chooseGovernanceStyle(styleId: string): SectIdentityActionResult {
    const before = this.stateManager.snapshot;
    const style = this.getGovernanceStyleDefinition(styleId);

    if (!style) {
      return { ok: false, message: 'Không tìm thấy thiên hướng trị môn.', snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.sect.governanceStyleId = style.id;
      this.refreshSectIdentityInDraft(draft);
      draft.ui.statusMessage = `Đã chuyển thiên hướng trị môn sang ${style.name}.`;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.ui.statusMessage, snapshot };
  }

  toggleSectRule(ruleId: string): SectIdentityActionResult {
    const before = this.stateManager.snapshot;
    const rule = this.getRuleDefinition(ruleId);

    if (!rule) {
      return { ok: false, message: 'Không tìm thấy nội quy.', snapshot: before };
    }

    if (!before.sect.activeRuleIds.includes(ruleId) && before.sect.activeRuleIds.length >= 2) {
      return { ok: false, message: 'Hiện chỉ nên giữ tối đa 2 nội quy để người chơi dễ theo dõi.', snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      if (draft.sect.activeRuleIds.includes(ruleId)) {
        draft.sect.activeRuleIds = draft.sect.activeRuleIds.filter((entry) => entry !== ruleId);
        draft.ui.statusMessage = `Đã gỡ nội quy ${rule.name}.`;
      } else {
        draft.sect.activeRuleIds.push(ruleId);
        draft.ui.statusMessage = `Đã áp dụng nội quy ${rule.name}.`;
      }

      this.refreshSectIdentityInDraft(draft);
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.ui.statusMessage, snapshot };
  }

  appointElder(roleId: string, discipleId: string): SectIdentityActionResult {
    const before = this.stateManager.snapshot;
    const role = this.getElderRoleDefinition(roleId);
    const disciple = before.disciples.roster.find((entry) => entry.id === discipleId);

    if (!role) {
      return { ok: false, message: 'Không tìm thấy vị trí trưởng lão.', snapshot: before };
    }

    if (!disciple) {
      return { ok: false, message: 'Không tìm thấy đệ tử để bổ nhiệm.', snapshot: before };
    }

    const realmOrder = disciple.realmId === 'pham_the' ? 1 : disciple.realmId === 'luyen_khi' ? 2 : disciple.realmId === 'truc_co' ? 3 : disciple.realmId === 'kim_dan' ? 4 : 5;
    if (realmOrder < 2) {
      return { ok: false, message: 'Đệ tử cần ít nhất Luyện Khí để gánh trách nhiệm trưởng lão.', snapshot: before };
    }

    const existingRole = before.sect.elders.find((entry) => entry.roleId === roleId);
    const existingDisciple = before.sect.elders.find((entry) => entry.discipleId === discipleId);
    if (!existingRole && !existingDisciple && before.sect.elders.length >= before.sect.elderSlots) {
      return { ok: false, message: 'Số ghế trưởng lão hiện tại đã đủ.', snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.sect.elders = draft.sect.elders.filter((entry) => entry.roleId !== roleId && entry.discipleId !== discipleId);
      draft.sect.elders.push({
        roleId,
        discipleId,
        appointedOnDay: draft.time.day
      });
      this.refreshSectIdentityInDraft(draft);
      draft.ui.statusMessage = `${disciple.name} được bổ nhiệm làm ${role.name}.`;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.ui.statusMessage, snapshot };
  }

  inviteGuestCultivator(factionId: string): SectIdentityActionResult {
    const before = this.stateManager.snapshot;
    const template = getGuestTemplate(factionId);
    const faction = factionCatalog.factions.find((entry) => entry.id === factionId);
    const relationScore = before.story.factionRelations[factionId] ?? 0;

    if (!template || !faction) {
      return { ok: false, message: 'Phe này chưa có tuyến khách khanh trong vertical slice.', snapshot: before };
    }

    if (before.sect.guestCultivators.length >= before.sect.guestCultivatorSlots) {
      return { ok: false, message: 'Chỗ khách khanh hiện tại đã đủ.', snapshot: before };
    }

    if (relationScore < 12) {
      return { ok: false, message: `${faction.name} còn quá dè chừng để gửi khách khanh sang.`, snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.sect.guestCultivators.push({
        id: `guest-${factionId}-${draft.time.day}-${draft.time.month}`,
        remainingDays: 6,
        ...template
      });
      this.refreshSectIdentityInDraft(draft);
      draft.ui.statusMessage = `${template.name} đến Thanh Huyền Môn làm khách khanh trong vài ngày.`;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.ui.statusMessage, snapshot };
  }

  dismissGuestCultivator(guestId: string): SectIdentityActionResult {
    const before = this.stateManager.snapshot;
    const guest = before.sect.guestCultivators.find((entry) => entry.id === guestId);

    if (!guest) {
      return { ok: false, message: 'Không tìm thấy khách khanh.', snapshot: before };
    }

    const snapshot = this.stateManager.update((draft) => {
      draft.sect.guestCultivators = draft.sect.guestCultivators.filter((entry) => entry.id !== guestId);
      this.refreshSectIdentityInDraft(draft);
      draft.ui.statusMessage = `${guest.name} đã rời sơn môn.`;
    });

    this.saveSystem.saveGame(snapshot);
    return { ok: true, message: snapshot.ui.statusMessage, snapshot };
  }

  applyDailyUpdateInDraft(draft: GameState): DailySectIdentityUpdateResult {
    const modifiers = this.getCombinedModifiers(draft);
    const lines: string[] = [];
    const averageMood = draft.disciples.roster.length > 0
      ? draft.disciples.roster.reduce((sum, disciple) => sum + disciple.mood, 0) / draft.disciples.roster.length
      : 60;
    const averageLoyalty = draft.disciples.roster.length > 0
      ? draft.disciples.roster.reduce((sum, disciple) => sum + disciple.loyalty, 0) / draft.disciples.roster.length
      : 60;
    const hostilePressure = Object.values(draft.diplomacy.factions).filter((faction) => faction.hostilityLevel > 0 || faction.warningLevel > 0).length;
    const lowResourcePressure = Number(draft.resources.linhKhi < 10) + Number(draft.resources.linhThach < 20) + Number(draft.resources.duocThao < 8);

    let stabilityDelta = modifiers.stabilityDaily ?? 0;
    let fortuneDelta = modifiers.fortuneDaily ?? 0;

    if (averageMood >= 70) {
      stabilityDelta += 1;
    } else if (averageMood <= 42) {
      stabilityDelta -= 1;
    }

    if (averageLoyalty >= 72) {
      stabilityDelta += 1;
    } else if (averageLoyalty <= 45) {
      stabilityDelta -= 1;
    }

    if (hostilePressure > 0) {
      stabilityDelta -= 1;
    }

    if (lowResourcePressure >= 2) {
      stabilityDelta -= 1;
    }

    if (draft.sect.defense >= 4) {
      stabilityDelta += 1;
    }

    if (draft.sect.stability >= 70 && lowResourcePressure === 0) {
      fortuneDelta += 1;
    }

    if (draft.sect.stability <= 35) {
      fortuneDelta -= 1;
    }

    if (draft.time.day % 5 === 0 && draft.story.worldFlags.some((flag) => flag.includes('inheritance') || flag.includes('records'))) {
      fortuneDelta += 1;
    }

    draft.sect.stability = clampPercent(draft.sect.stability + stabilityDelta);
    draft.sect.fortune = clampPercent(draft.sect.fortune + fortuneDelta);

    if (stabilityDelta !== 0) {
      lines.push(`Ổn định tông môn ${stabilityDelta > 0 ? `+${stabilityDelta}` : stabilityDelta}.`);
    }

    if (fortuneDelta !== 0) {
      lines.push(`Khí vận ${fortuneDelta > 0 ? `+${fortuneDelta}` : fortuneDelta}.`);
    }

    const expiredGuests = draft.sect.guestCultivators.filter((guest) => guest.remainingDays <= 1);
    draft.sect.guestCultivators = draft.sect.guestCultivators
      .map((guest) => ({ ...guest, remainingDays: guest.remainingDays - 1 }))
      .filter((guest) => guest.remainingDays > 0);

    for (const guest of expiredGuests) {
      lines.push(`${guest.name} mãn hạn khách khanh và rời sơn môn.`);
    }

    this.refreshSectIdentityInDraft(draft);
    return { lines };
  }

  refreshSectIdentityInDraft(draft: GameState): void {
    const modifiers = this.getCombinedModifiers(draft);
    const baseCapacity = 3 + draft.sect.buildings.chinh_dien.level + draft.sect.buildings.tinh_tu_duong.level * 2;
    draft.sect.discipleCapacity = Math.max(1, baseCapacity + (modifiers.discipleCapacity ?? 0));

    const lowStabilityFlag = 'sect_stability_low';
    const highFortuneFlag = 'sect_fortune_high';
    draft.story.worldFlags = draft.story.worldFlags.filter((flag) => flag !== lowStabilityFlag && flag !== highFortuneFlag);

    if (draft.sect.stability <= 35) {
      draft.story.worldFlags.push(lowStabilityFlag);
    }

    if (draft.sect.fortune >= 70) {
      draft.story.worldFlags.push(highFortuneFlag);
    }
  }
}
