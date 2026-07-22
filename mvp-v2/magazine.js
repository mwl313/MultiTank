// 탄창 시스템 — 무기별 독립 탄창 + 자동 재장전
// 용도: 4종 무기의 탄창 관리, 발사 가능 여부 확인, 미선택 무기 자동 충전
import { WEAPON_CONFIG } from './config/weapons.js';

export class MagazineSystem {
  constructor() {
    /** @type {Object<number, {current:number, max:number, reloadTimer:number, reloadInterval:number}>} */
    this.mags = {};

    // 각 무기별 탄창 초기화 (1단계 기준)
    for (const w of Object.values(WEAPON_CONFIG)) {
      this.mags[w.id] = {
        current: w.baseMagazine,
        max: w.baseMagazine,
        reloadTimer: 0,
        reloadInterval: w.baseReloadTime,
      };
    }
  }

  /**
   * 발사 가능 여부 확인 — 모든 선택 무기의 탄창이 1발 이상인지
   * @param {number[]} weaponIds - 선택된 무기 ID 배열
   * @returns {boolean}
   */
  canFire(weaponIds) {
    for (const id of weaponIds) {
      const mag = this.mags[id];
      if (!mag || mag.current <= 0) return false;
    }
    return true;
  }

  /**
   * 탄창 소모 — 모든 선택 무기의 탄창을 1발씩 차감
   * @param {number[]} weaponIds
   */
  consume(weaponIds) {
    for (const id of weaponIds) {
      const mag = this.mags[id];
      if (mag && mag.current > 0) {
        mag.current--;
      }
    }
  }

  /**
   * 자동 재장전 — 선택되지 않은 무기만 dt 누적 후 1발씩 충전
   * @param {number} dt - delta time (ms)
   * @param {Set<number>} selectedIds - 현재 선택된 무기 ID 집합
   */
  updateReload(dt, selectedIds) {
    const dtSec = dt / 1000;

    for (const w of Object.values(WEAPON_CONFIG)) {
      const mag = this.mags[w.id];
      if (!mag) continue;

      // 선택된 무기는 재장전하지 않음 (사용 중)
      if (selectedIds.has(w.id)) continue;

      // 이미 최대 탄창이면 건너뜀
      if (mag.current >= mag.max) continue;

      mag.reloadTimer += dtSec;
      if (mag.reloadTimer >= mag.reloadInterval) {
        mag.reloadTimer -= mag.reloadInterval;
        mag.current = Math.min(mag.current + 1, mag.max);
      }
    }
  }

  /**
   * HUD 표시용 탄창 정보
   * @param {number} weaponId
   * @returns {{current:number, max:number, reloadPercent:number}}
   */
  getDisplay(weaponId) {
    const mag = this.mags[weaponId];
    if (!mag) return { current: 0, max: 0, reloadPercent: 0 };
    return {
      current: mag.current,
      max: mag.max,
      reloadPercent: mag.reloadInterval > 0
        ? Math.min(1, mag.reloadTimer / mag.reloadInterval)
        : 0,
    };
  }
}
