// 총알 시스템 — 오브젝트 풀
// 용도: 총알 사전 할당, 활성화/비활성화, 이동, 수명 관리, 맵 경계 체크, 렌더링
import { MAP_CONFIG } from './config/map.js';

export class BulletPool {
  /**
   * @param {object} weaponConfig — WEAPON_CONFIG.default 등 무기 설정 객체
   * @param {number} weaponConfig.bulletSpeed - 총알 속도 (px/s)
   * @param {number} weaponConfig.bulletDamage - 데미지
   * @param {number} weaponConfig.bulletRadius - 충돌 반경 (px)
   * @param {number} weaponConfig.bulletLifetime - 최대 수명 (초)
   * @param {string} weaponConfig.bulletColor - 총알 색상
   * @param {number} weaponConfig.poolSize - 오브젝트 풀 크기
   */
  constructor(weaponConfig) {
    const {
      bulletSpeed, bulletDamage, bulletRadius,
      bulletLifetime, bulletColor, poolSize,
    } = weaponConfig;

    /** @type {number} 총알 속도 (px/s) */
    this.bulletSpeed = bulletSpeed;
    /** @type {number} 총알 데미지 */
    this.bulletDamage = bulletDamage;
    /** @type {number} 총알 최대 수명 (초) */
    this.bulletLifetime = bulletLifetime;
    /** @type {string} 총알 색상 */
    this.bulletColor = bulletColor;

    // --- 오브젝트 풀 사전 할당 ---
    // 모든 총알을 미리 생성해두고 active 플래그로 재사용 (GC 회피)
    /** @type {{x:number,y:number,vx:number,vy:number,active:boolean,lifetime:number,radius:number,color:string,damage:number}[]} */
    this.bullets = [];
    for (let i = 0; i < poolSize; i++) {
      this.bullets.push({
        x: 0, y: 0,
        vx: 0, vy: 0,
        active: false,
        lifetime: 0,
        radius: bulletRadius,
        color: bulletColor,
        damage: bulletDamage,
      });
    }
  }

  /**
   * 비활성 총알 하나를 찾아 활성화해서 반환. 풀 고갈 시 null.
   * @returns {object|null} 활성화된 총알 객체, 없으면 null
   */
  getBullet() {
    for (const bullet of this.bullets) {
      if (!bullet.active) {
        bullet.active = true;
        bullet.lifetime = 0;
        return bullet;
      }
    }
    return null; // 풀 고갈 — 모든 총알이 활성 상태
  }

  /**
   * 총알을 비활성화해서 풀에 반환
   * @param {object} bullet - 반환할 총알 객체
   */
  releaseBullet(bullet) {
    bullet.active = false;
  }

  /**
   * 모든 활성 총알 업데이트 — 이동, 수명 감소, 맵 경계 체크
   * @param {number} dt - delta time (ms)
   */
  updateBullets(dt) {
    const dtSec = dt / 1000;
    const { width, height } = MAP_CONFIG;

    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      // --- 이동 ---
      bullet.x += bullet.vx * dtSec;
      bullet.y += bullet.vy * dtSec;

      // --- 수명 체크 ---
      bullet.lifetime += dtSec;
      if (bullet.lifetime >= this.bulletLifetime) {
        this.releaseBullet(bullet);
        continue;
      }

      // --- 맵 경계 체크 (경계 밖으로 나가면 풀 반환) ---
      if (
        bullet.x < 0 || bullet.x > width ||
        bullet.y < 0 || bullet.y > height
      ) {
        this.releaseBullet(bullet);
      }
    }
  }

  /**
   * 모든 활성 총알을 작은 원으로 렌더링
   * ctx.translate로 이미 카메라 오프셋이 적용된 상태에서 호출
   * @param {CanvasRenderingContext2D} ctx - 캔버스 2D 컨텍스트
   */
  drawBullets(ctx) {
    ctx.fillStyle = this.bulletColor;

    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
