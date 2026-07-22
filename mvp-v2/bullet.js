// 총알 시스템 — 통합 오브젝트 풀 (4종 무기 공유)
// 용도: 총알 사전 할당, 무기별 속성 주입, 이동, 수명 관리, 맵 경계 체크, 렌더링
import { MAP_CONFIG } from './config/map.js';
import { WEAPON_CONFIG } from './config/weapons.js';

/** 전체 풀 크기 (4종 무기 poolSize 합계) */
const TOTAL_POOL_SIZE = Object.values(WEAPON_CONFIG)
  .reduce((sum, w) => sum + w.poolSize, 0);

export class BulletPool {
  constructor() {
    // --- 통합 오브젝트 풀 사전 할당 ---
    /** @type {{x:number,y:number,vx:number,vy:number,active:boolean,lifetime:number,maxLifetime:number,radius:number,color:string,damage:number,weaponId:number,pierceReduction:number}[]} */
    this.bullets = [];
    for (let i = 0; i < TOTAL_POOL_SIZE; i++) {
      this.bullets.push({
        x: 0, y: 0,
        vx: 0, vy: 0,
        active: false,
        lifetime: 0,
        maxLifetime: 1.5,     // 기본값 (발사 시 무기별로 덮어씀)
        radius: 4,
        color: '#fff',
        damage: 0,
        weaponId: 0,           // 1=폭발, 2=속사, 3=저격, 4=관통
        pierceReduction: 0,    // 관통 시 데미지 감소율 (0 = 관통 불가)
      });
    }
  }

  /**
   * 비활성 총알 하나를 찾아 반환. 풀 고갈 시 null.
   * 호출자가 무기별 속성(x, y, vx, vy, radius, color, damage,
   *   weaponId, maxLifetime, pierceReduction)을 설정해야 함.
   * @returns {object|null}
   */
  getBullet() {
    for (const bullet of this.bullets) {
      if (!bullet.active) {
        bullet.active = true;
        bullet.lifetime = 0;
        return bullet;
      }
    }
    return null; // 풀 고갈
  }

  /**
   * 총알을 비활성화해서 풀에 반환
   * @param {object} bullet
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

      // --- 수명 체크 (무기별 maxLifetime 사용) ---
      bullet.lifetime += dtSec;
      if (bullet.lifetime >= bullet.maxLifetime) {
        this.releaseBullet(bullet);
        continue;
      }

      // --- 맵 경계 체크 ---
      if (
        bullet.x < 0 || bullet.x > width ||
        bullet.y < 0 || bullet.y > height
      ) {
        this.releaseBullet(bullet);
      }
    }
  }

  /**
   * 모든 활성 총알을 렌더링 — 각 총알의 자체 color 사용
   * @param {CanvasRenderingContext2D} ctx
   */
  drawBullets(ctx) {
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
