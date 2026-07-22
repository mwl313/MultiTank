# weapon_system.gd — 무기 선택 + 탄창 + 발사 + 특수 효과
# 용도: magazine.js + weapon-fire.js + weapon-effects.js 통합
# GlobalConfig.WEAPONS 에서 모든 파라미터 참조
class_name WeaponSystem extends Node

# 현재 선택된 무기 ID 배열 (1~4, 크기 1 또는 2)
var selected_weapons: Array[int] = []

# 무기 키 눌린 시간 (ms) — 융합 판정용
var weapon_key_timestamps: Dictionary = {}

# 탄창 데이터: { weapon_id: {current, max, reload_timer, reload_time} }
var magazines: Dictionary = {}

# 저격 기본 사거리 임계값 (px) — JS 원본 기준 (600 * 1.5 = 900)
const SNIPER_BASE_RANGE: float = 900.0

# ============================================================
# 초기화 — 각 무기별 탄창 생성
# ============================================================
func _ready() -> void:
	for w in GlobalConfig.WEAPONS.values():
		var mag_id: int = w.id
		var max_mag: int = w.base_magazine
		magazines[mag_id] = {
			"current": max_mag,
			"max": max_mag,
			"reload_timer": 0.0,
			"reload_time": w.base_reload_time,
		}

# ============================================================
# 무기 키 상태 갱신 (game_manager._read_input() 에서 호출)
# ============================================================
func set_weapon_key(id: int, pressed: bool, timestamp: float) -> void:
	if pressed:
		weapon_key_timestamps[id] = timestamp
	else:
		weapon_key_timestamps.erase(id)

# ============================================================
# 무기 선택 업데이트 — 융합 판정 포함
# ============================================================
func update_selection() -> void:
	# 현재 눌린 키 수집
	var pressed: Array[int] = []
	for id in range(1, 5):
		if weapon_key_timestamps.has(id):
			pressed.append(id)

	selected_weapons.clear()

	if pressed.size() == 1:
		# 단일 무기
		selected_weapons.append(pressed[0])
	elif pressed.size() == 2:
		# 융합 판정: 두 키가 100ms 이내에 눌렸는지
		var t1: float = weapon_key_timestamps.get(pressed[0], 0.0)
		var t2: float = weapon_key_timestamps.get(pressed[1], 0.0)
		if absf(t1 - t2) <= 100.0:
			selected_weapons.append(pressed[0])
			selected_weapons.append(pressed[1])
		else:
			# 시간차가 크면 나중에 누른 키만 선택
			var later: int = pressed[0] if t1 > t2 else pressed[1]
			selected_weapons.append(later)
	# pressed.size() == 0 or >= 3 → 선택 안 함

# ============================================================
# 발사 가능 여부 — 모든 선택 무기의 탄창이 1발 이상인지
# ============================================================
func can_fire() -> bool:
	for id in selected_weapons:
		var mag: Dictionary = magazines.get(id, {})
		if mag.get("current", 0) <= 0:
			return false
	return true

# ============================================================
# 탄창 소모 — 모든 선택 무기 1발씩 차감
# ============================================================
func consume() -> void:
	for id in selected_weapons:
		var mag: Dictionary = magazines.get(id, {})
		if mag.get("current", 0) > 0:
			mag["current"] -= 1

# ============================================================
# 자동 재장전 — 선택되지 않은 무기만 reload_timer 누적 후 1발 충전
# @param delta: float — 경과 시간 (초)
# ============================================================
func update_reload(delta: float) -> void:
	for w in GlobalConfig.WEAPONS.values():
		var id: int = w.id
		# 선택된 무기는 재장전하지 않음
		if id in selected_weapons:
			continue
		var mag: Dictionary = magazines.get(id, {})
		if mag.is_empty():
			continue
		# 이미 최대 탄창이면 건너뜀
		if mag["current"] >= mag["max"]:
			mag["reload_timer"] = 0.0
			continue
		mag["reload_timer"] += delta
		if mag["reload_timer"] >= mag["reload_time"]:
			mag["reload_timer"] -= mag["reload_time"]
			mag["current"] = mini(mag["current"] + 1, mag["max"])

# ============================================================
# 발사 — 선택된 무기에 따라 총알 생성 후 쿨다운 반환
# @return float — fire_cooldown (초)
# ============================================================
func fire(tank_pos: Vector2, tank_turret_angle: float, bullet_pool) -> float:
	if selected_weapons.is_empty():
		return 0.0
	if not can_fire():
		return 0.0
	consume()

	var cooldown: float = 0.0
	if selected_weapons.size() == 1:
		var wid: int = selected_weapons[0]
		fire_single(wid, tank_pos, tank_turret_angle, bullet_pool)
		var w: Dictionary = GlobalConfig.weapon_by_id(wid)
		cooldown = w.get("fire_interval", 0.8)
	elif selected_weapons.size() == 2:
		fire_fusion(selected_weapons, tank_pos, tank_turret_angle, bullet_pool)
		var w1: Dictionary = GlobalConfig.weapon_by_id(selected_weapons[0])
		var w2: Dictionary = GlobalConfig.weapon_by_id(selected_weapons[1])
		cooldown = maxf(
			w1.get("fire_interval", 0.8),
			w2.get("fire_interval", 0.8),
		)
	return cooldown

# ============================================================
# 단일 무기 발사
# ============================================================
func fire_single(weapon_id: int, tank_pos: Vector2, angle: float, bullet_pool) -> void:
	var w: Dictionary = GlobalConfig.weapon_by_id(weapon_id)
	if w.is_empty():
		return
	var turret_len: float = GlobalConfig.TANK.turret_length

	match weapon_id:
		1:  # 폭발 — 단일 포탄
			var b = bullet_pool.get_bullet()
			if b != null:
				_setup_bullet(b, tank_pos, angle, w, turret_len)
		2:  # 속사 — 여러 발 산개
			var fire_count: int = w.get("fire_count", 5)
			for i in range(fire_count):
				var b = bullet_pool.get_bullet()
				if b == null:
					break
				var spread: float = (randf() - 0.5) * deg_to_rad(10.0)  # +-5도
				var a: float = angle + spread
				_setup_bullet(b, tank_pos, a, w, turret_len)
		3:  # 저격 — 단일 고속 포탄
			var b = bullet_pool.get_bullet()
			if b != null:
				_setup_bullet(b, tank_pos, angle, w, turret_len)
		4:  # 관통 — 단일 포탄 + pierce_reduction
			var b = bullet_pool.get_bullet()
			if b != null:
				_setup_bullet(b, tank_pos, angle, w, turret_len)
				b["pierce_reduction"] = w.get("pierce_reduction", 0.03)

# ============================================================
# 융합 무기 발사 — 두 무기 특성 결합
# ============================================================
func fire_fusion(ids: Array[int], tank_pos: Vector2, angle: float, bullet_pool) -> void:
	var w1: Dictionary = GlobalConfig.weapon_by_id(ids[0])
	var w2: Dictionary = GlobalConfig.weapon_by_id(ids[1])
	if w1.is_empty() or w2.is_empty():
		return

	var turret_len: float = GlobalConfig.TANK.turret_length
	var b = bullet_pool.get_bullet()
	if b == null:
		return

	# 위치: 포탑 끝
	b["x"] = tank_pos.x + cos(angle) * turret_len
	b["y"] = tank_pos.y + sin(angle) * turret_len

	# 속도: 더 빠른 쪽
	var speed: float = maxf(w1.bullet_speed, w2.bullet_speed)
	b["vx"] = cos(angle) * speed
	b["vy"] = sin(angle) * speed

	# 데미지: 더 높은 쪽
	b["damage"] = maxf(w1.base_damage, w2.base_damage)

	# 외형: 더 큰 반경, 첫 번째 무기 색상
	b["radius"] = maxf(w1.bullet_radius, w2.bullet_radius)
	b["color"] = w1.bullet_color
	b["max_lifetime"] = maxf(w1.bullet_lifetime, w2.bullet_lifetime)

	# weapon_id: 첫 번째 무기로 (충돌 처리 기준)
	b["weapon_id"] = w1.id

	# 관통: 관통 무기가 포함됐으면 pierce_reduction 적용
	if w1.id == 4:
		b["pierce_reduction"] = w1.get("pierce_reduction", 0.03)
	elif w2.id == 4:
		b["pierce_reduction"] = w2.get("pierce_reduction", 0.03)
	else:
		b["pierce_reduction"] = 0.0

# ============================================================
# 총알 기본 설정 헬퍼
# ============================================================
func _setup_bullet(bullet, tank_pos: Vector2, angle: float, w: Dictionary, turret_len: float) -> void:
	bullet["x"] = tank_pos.x + cos(angle) * turret_len
	bullet["y"] = tank_pos.y + sin(angle) * turret_len
	bullet["vx"] = cos(angle) * w.bullet_speed
	bullet["vy"] = sin(angle) * w.bullet_speed
	bullet["radius"] = w.bullet_radius
	bullet["color"] = w.bullet_color
	bullet["damage"] = w.base_damage
	bullet["max_lifetime"] = w.bullet_lifetime
	bullet["weapon_id"] = w.id
	bullet["pierce_reduction"] = 0.0

# ============================================================
# 폭발 AoE — 탄착 지점 기준 반경 내 모든 적 데미지
# ============================================================
func apply_explosion_blast(x: float, y: float, blast_radius: float, blast_damage: float, enemy_pool) -> void:
	var radius_sq: float = blast_radius * blast_radius
	for enemy in enemy_pool.pool:
		if not enemy.active:
			continue
		var dx: float = enemy.x - x
		var dy: float = enemy.y - y
		var dist_sq: float = dx * dx + dy * dy
		if dist_sq <= radius_sq:
			enemy.hp -= blast_damage
			if enemy.hp <= 0:
				enemy_pool.deactivate(enemy)

# ============================================================
# 관통 처리 — bullet 데미지 감소 후 지속 여부 반환
# @return bool: true면 계속 진행, false면 소멸
# ============================================================
func apply_pierce(bullet) -> bool:
	bullet.damage *= (1.0 - bullet.pierce_reduction)
	return bullet.damage >= 1.0

# ============================================================
# 저격 거리 비례 데미지 계수
# @param hit_dist: float — 총알 이동 거리 (px)
# @return float — 데미지 배율
# ============================================================
func get_sniper_damage_multiplier(hit_dist: float) -> float:
	if hit_dist > SNIPER_BASE_RANGE:
		var w: Dictionary = GlobalConfig.weapon_by_id(3)
		return w.get("range_multiplier", 2.5)
	return 1.0

# ============================================================
# HUD 표시용 탄창 정보
# @return {current, max, reload_percent}
# ============================================================
func get_display(weapon_id: int) -> Dictionary:
	var mag: Dictionary = magazines.get(weapon_id, {})
	if mag.is_empty():
		return { "current": 0, "max": 0, "reload_percent": 0.0 }
	var percent: float = 0.0
	if mag.get("reload_time", 0.0) > 0.0:
		percent = clampf(mag["reload_timer"] / mag["reload_time"], 0.0, 1.0)
	return {
		"current": mag.get("current", 0),
		"max": mag.get("max", 0),
		"reload_percent": percent,
	}
