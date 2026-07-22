# GlobalConfig — Autoload 싱글톤
# 용도: 모든 게임 파라미터의 단일 진실 공급원 (config/*.js 통합)
# 사용: GlobalConfig.GAME.canvas_width, GlobalConfig.weapon_by_id(1) 등
extends Node

# ============================================================
# 게임 기본 설정 (config/game.js)
# ============================================================
const GAME := {
	canvas_width = 1920,
	canvas_height = 1080,
	target_fps = 60,
	max_delta_time = 0.1,     # 초 — 프레임 간 최대 dt 상한
	camera_lerp_speed = 8.0,  # 카메라 추적 속도
}

# ============================================================
# 물리 파라미터 (config/physics.js)
# ============================================================
const PHYSICS := {
	max_speed = 250.0,           # px/s
	acceleration = 600.0,        # px/s²
	friction = 0.92,             # 무입력 시 감속 계수 (60fps 기준)
	turn_rate = 3.0,             # rad/s
	reverse_multiplier = 0.5,    # 후진 가속 배율
	braking_force = 1.5,         # S키 제동 추가 배율
	drift_threshold = 0.3,       # rad — 드리프트 판정 각도
	drift_damage_multiplier = 2.0,  # 드리프트 중 피격 배율
	min_speed_for_drift = 0.5,   # px/s — 드리프트 최소 속도
	epsilon = 0.001,             # 거리 0 방지
}

# ============================================================
# 탱크 스탯 (config/tank.js)
# ============================================================
const TANK := {
	hp = 100,
	width = 48.0,
	height = 32.0,
	body_color = Color("#4a9e4a"),
	body_front_color = Color("#6abf6a"),
	body_rear_color = Color("#2a6e2a"),
	turret_color = Color("#3a7e3a"),
	turret_length = 28.0,
	turret_width = 6.0,
	invincible_duration = 0.5,   # 초 — 피격 후 무적
	direction_triangle_color = Color("#f1c40f"),
	tank_collision_radius = 16.0, # min(width,height)/2
}

# ============================================================
# 대시 (config/physics.js + tank.js)
# ============================================================
const DASH := {
	duration = 0.25,        # 초
	speed_multiplier = 2.5, # maxSpeed 기준
	invincible_duration = 0.15, # 초
	cooldown = 4.0,         # 초
	knockback_multiplier = 4.0,
	stun_duration = 0.3,    # 초 — 적 장애물 충돌 시
}

# ============================================================
# 적 타입 + 스폰 (config/enemies.js)
# ============================================================
const ENEMY_TYPES := {
	scout = {
		name = "Scout", hp = 20, speed = 120.0,
		damage = 5, radius = 10.0, color = Color("#e74c3c"),
	},
	bruiser = {
		name = "Bruiser", hp = 60, speed = 80.0,
		damage = 10, radius = 15.0, color = Color("#e67e22"),
	},
	runner = {
		name = "Runner", hp = 10, speed = 200.0,
		damage = 3, radius = 8.0, color = Color("#f1c40f"),
	},
}

const SPAWN := {
	mode = "radial",
	spawn_distance = 800.0,       # 최대 거리
	min_spawn_distance = 500.0,   # 최소 거리
	forward_avoidance = 0.5,      # 전방 회피율
	interval = 2.0,               # 초
	initial_delay = 2.0,          # 초
	max_enemies = 40,
	despawn_distance = 2500.0,
	pool_size = 50,
	weights = { scout = 0.55, runner = 0.30, bruiser = 0.15 },
	min_spawn_clearance = 48.0,
	retries = 5,
	default_type = "scout",
	min_speed_for_direction = 10.0,
	forward_avoidance_angle = 1.047, # rad ≈ 60°
	enemy_separation_factor = 1.2,
}

# ============================================================
# 무기 4종 (config/weapons.js)
# ============================================================
const WEAPONS := {
	1: {  # 폭발
		id = 1, name = "폭발", key = "explosion",
		fire_interval = 0.8, bullet_speed = 600, bullet_radius = 6,
		bullet_color = Color("#ff6b35"), bullet_lifetime = 1.5,
		pool_size = 50, base_damage = 2, base_magazine = 3,
		base_reload_time = 5.0, blast_radius = 60.0,
	},
	2: {  # 속사
		id = 2, name = "속사", key = "rapid",
		fire_interval = 0.5, bullet_speed = 700, bullet_radius = 3,
		bullet_color = Color("#ffdd57"), bullet_lifetime = 1.2,
		pool_size = 200, base_damage = 2, base_magazine = 3,
		base_reload_time = 3.0, fire_count = 5,
	},
	3: {  # 저격
		id = 3, name = "저격", key = "sniper",
		fire_interval = 1.5, bullet_speed = 1200, bullet_radius = 4,
		bullet_color = Color("#00d4ff"), bullet_lifetime = 4.5,
		pool_size = 30, base_damage = 5, base_magazine = 1,
		base_reload_time = 10.0, range_multiplier = 2.5,
	},
	4: {  # 관통
		id = 4, name = "관통", key = "pierce",
		fire_interval = 0.6, bullet_speed = 800, bullet_radius = 5,
		bullet_color = Color("#ff69b4"), bullet_lifetime = 1.5,
		pool_size = 60, base_damage = 20, base_magazine = 30,
		base_reload_time = 2.0, pierce_reduction = 0.03,
	},
}

# ============================================================
# 무기 업그레이드 테이블 (config/weapon-upgrades.js)
# 각 무기별 [1]~[20] 인덱스 배열 (0 = 1단계)
# ============================================================
const UPGRADES := {
	explosion = [
		{ damage=2,  magazine=3.00, reload_time=5,  unique=1 },
		{ damage=4,  magazine=2.95, reload_time=6,  unique=1 },
		{ damage=6,  magazine=2.90, reload_time=8,  unique=1 },
		{ damage=8,  magazine=2.85, reload_time=9,  unique=1 },
		{ damage=10, magazine=2.80, reload_time=10, unique=2 },
		{ damage=12, magazine=2.75, reload_time=12, unique=2 },
		{ damage=14, magazine=2.70, reload_time=13, unique=2 },
		{ damage=16, magazine=2.65, reload_time=14, unique=2 },
		{ damage=18, magazine=2.60, reload_time=16, unique=2 },
		{ damage=20, magazine=2.55, reload_time=17, unique=3 },
		{ damage=22, magazine=2.50, reload_time=18, unique=3 },
		{ damage=24, magazine=2.45, reload_time=20, unique=3 },
		{ damage=26, magazine=2.40, reload_time=21, unique=3 },
		{ damage=28, magazine=2.35, reload_time=22, unique=3 },
		{ damage=30, magazine=2.30, reload_time=24, unique=4 },
		{ damage=32, magazine=2.25, reload_time=25, unique=4 },
		{ damage=34, magazine=2.20, reload_time=26, unique=4 },
		{ damage=36, magazine=2.15, reload_time=28, unique=4 },
		{ damage=38, magazine=2.10, reload_time=29, unique=4 },
		{ damage=40, magazine=2.05, reload_time=30, unique=5 },
	],
	rapid = [
		{ damage=2,  magazine=3, reload_time=3.00, unique=5 },
		{ damage=4,  magazine=3, reload_time=2.95, unique=6 },
		{ damage=6,  magazine=3, reload_time=2.90, unique=8 },
		{ damage=8,  magazine=3, reload_time=2.85, unique=9 },
		{ damage=10, magazine=4, reload_time=2.80, unique=10 },
		{ damage=12, magazine=4, reload_time=2.75, unique=12 },
		{ damage=14, magazine=4, reload_time=2.70, unique=13 },
		{ damage=16, magazine=4, reload_time=2.65, unique=14 },
		{ damage=18, magazine=4, reload_time=2.60, unique=16 },
		{ damage=20, magazine=5, reload_time=2.55, unique=17 },
		{ damage=22, magazine=5, reload_time=2.50, unique=18 },
		{ damage=24, magazine=5, reload_time=2.45, unique=20 },
		{ damage=26, magazine=5, reload_time=2.40, unique=21 },
		{ damage=28, magazine=5, reload_time=2.35, unique=22 },
		{ damage=30, magazine=6, reload_time=2.30, unique=24 },
		{ damage=32, magazine=6, reload_time=2.25, unique=25 },
		{ damage=34, magazine=6, reload_time=2.20, unique=26 },
		{ damage=36, magazine=6, reload_time=2.15, unique=28 },
		{ damage=38, magazine=6, reload_time=2.10, unique=29 },
		{ damage=40, magazine=7, reload_time=2.05, unique=30 },
	],
	sniper = [
		{ damage=5,   magazine=1.0, reload_time=10, unique=2.50 },
		{ damage=10,  magazine=1.0, reload_time=11, unique=2.45 },
		{ damage=100, magazine=1.0, reload_time=13, unique=2.40 },
		{ damage=95,  magazine=1.0, reload_time=14, unique=2.35 },
		{ damage=90,  magazine=1.5, reload_time=15, unique=2.30 },
		{ damage=85,  magazine=1.5, reload_time=17, unique=2.25 },
		{ damage=80,  magazine=1.5, reload_time=18, unique=2.20 },
		{ damage=75,  magazine=1.5, reload_time=19, unique=2.15 },
		{ damage=70,  magazine=1.5, reload_time=21, unique=2.10 },
		{ damage=65,  magazine=2.0, reload_time=22, unique=2.05 },
		{ damage=60,  magazine=2.0, reload_time=23, unique=2.00 },
		{ damage=55,  magazine=2.0, reload_time=25, unique=1.95 },
		{ damage=50,  magazine=2.0, reload_time=26, unique=1.90 },
		{ damage=45,  magazine=2.0, reload_time=27, unique=1.85 },
		{ damage=40,  magazine=2.5, reload_time=29, unique=1.80 },
		{ damage=35,  magazine=2.5, reload_time=30, unique=1.75 },
		{ damage=30,  magazine=2.5, reload_time=31, unique=1.70 },
		{ damage=25,  magazine=2.5, reload_time=33, unique=1.65 },
		{ damage=20,  magazine=2.5, reload_time=34, unique=1.60 },
		{ damage=15,  magazine=3.0, reload_time=35, unique=1.55 },
	],
	pierce = [
		{ damage=20, magazine=30, reload_time=2.00, unique=3  },
		{ damage=22, magazine=30, reload_time=1.95, unique=6  },
		{ damage=26, magazine=30, reload_time=1.90, unique=60 },
		{ damage=28, magazine=30, reload_time=1.85, unique=57 },
		{ damage=30, magazine=25, reload_time=1.80, unique=54 },
		{ damage=34, magazine=25, reload_time=1.75, unique=51 },
		{ damage=36, magazine=25, reload_time=1.70, unique=48 },
		{ damage=38, magazine=25, reload_time=1.65, unique=45 },
		{ damage=42, magazine=25, reload_time=1.60, unique=42 },
		{ damage=44, magazine=20, reload_time=1.55, unique=39 },
		{ damage=46, magazine=20, reload_time=1.50, unique=36 },
		{ damage=50, magazine=20, reload_time=1.45, unique=33 },
		{ damage=52, magazine=20, reload_time=1.40, unique=30 },
		{ damage=54, magazine=20, reload_time=1.35, unique=27 },
		{ damage=58, magazine=15, reload_time=1.30, unique=24 },
		{ damage=60, magazine=15, reload_time=1.25, unique=21 },
		{ damage=62, magazine=15, reload_time=1.20, unique=18 },
		{ damage=66, magazine=15, reload_time=1.15, unique=15 },
		{ damage=68, magazine=15, reload_time=1.10, unique=12 },
		{ damage=70, magazine=10, reload_time=1.05, unique=9  },
	],
}

# ============================================================
# 맵 파라미터 (config/map.js)
# ============================================================
const MAP := {
	width = 3000.0,
	height = 3000.0,
	seed = "default",
	tile_size = 64,
	obstacle_count = 40,
	obstacle_min_size = 32.0,
	obstacle_max_size = 128.0,
	obstacle_color = Color("#555555"),
	boundary_type = "wall",
	spawn_area_radius = 100.0,
	max_generation_attempts = 4000,
}

# ============================================================
# 헬퍼 함수 — id로 무기 설정 조회
# ============================================================
static func weapon_by_id(id: int) -> Dictionary:
	return WEAPONS.get(id, {})

static func weapon_key_by_id(id: int) -> String:
	var w = WEAPONS.get(id, {})
	return w.get("key", "")

static func get_upgrade_stats(weapon_key: String, level: int) -> Dictionary:
	var table = UPGRADES.get(weapon_key, [])
	if level < 1 or level > table.size():
		return {}
	return table[level - 1]

static func total_bullet_pool_size() -> int:
	var total = 0
	for w in WEAPONS.values():
		total += w.pool_size
	return total

static func get_enemy_type(key: String) -> Dictionary:
	return ENEMY_TYPES.get(key, {})
