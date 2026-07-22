# game_manager.gd — 메인 게임 루프 (main.js 대체)
# 용도: 모든 서브시스템 오케스트레이션, 입력 처리, 충돌 검사
# GlobalConfig 에서 모든 파라미터 참조
class_name GameManager extends Node

# 자식 노드 참조 (씬 트리 기준)
@onready var player = $Player
@onready var camera_2d: Camera2D = $Camera2D
@onready var obstacles_node: MapGenerator = $Obstacles
@onready var bullet_pool = $Bullets
@onready var enemy_pool = $Enemies
@onready var weapon_system: WeaponSystem = $WeaponSystem
@onready var hud: GameHUD = $HUD

# 게임 상태
var state: String = "playing"  # "playing" | "gameover"
var elapsed_time: float = 0.0

# 탱크 충돌 반경 (TANK.tank_collision_radius 와 동일)
var _tank_radius: float = GlobalConfig.TANK.tank_collision_radius

# 현재 시간 (ms) — 충돌 검사용
var _now: int = 0

# ============================================================
# 초기화
# ============================================================
func _ready() -> void:
	# 1. 맵 생성
	obstacles_node.generate()

	# 2. 적 풀에 장애물 참조 전달
	if enemy_pool.has_method("set_obstacles"):
		enemy_pool.set_obstacles(obstacles_node.get_obstacles())

	# 3. 플레이어 리스폰
	respawn_player()

	# 4. 플레이어 input_driver 초기화
	if player.input_driver == null:
		player.input_driver = _create_default_input()

	# 5. 게임오버 시그널 연결 (PlayerTank 에 game_over 신호가 있으면)
	if player.has_signal("game_over"):
		player.game_over.connect(_on_player_game_over)

# ============================================================
# 기본 입력 Dictionary 생성
# ============================================================
func _create_default_input() -> Dictionary:
	return {
		"forward": false,
		"reverse": false,
		"left": false,
		"right": false,
		"dash": false,
	}

# ============================================================
# 메인 프레임 업데이트
# ============================================================
func _process(delta: float) -> void:
	# delta 상한 클램프
	delta = minf(delta, GlobalConfig.GAME.max_delta_time)

	if state == "playing":
		_update_playing(delta)
	elif state == "gameover":
		_update_gameover()

# ============================================================
# playing 상태 업데이트
# ============================================================
func _update_playing(delta: float) -> void:
	_now = Time.get_ticks_msec()

	# 1. 입력 읽기
	_read_input()

	# 2. 포탑 조준 (world_aim) — PlayerTank 가 자체 _process 에서 turret_angle 계산
	player.world_aim = _get_world_mouse_position()

	# 3. 발사 처리 (JS: tryFire + updateCooldown)
	if Input.is_action_pressed("gunner_fire") and player.fire_cooldown <= 0.0:
		if not weapon_system.selected_weapons.is_empty() and weapon_system.can_fire():
			var cooldown: float = weapon_system.fire(
				player.position, player.turret_angle, bullet_pool
			)
			player.fire_cooldown = cooldown

	# 4. 발사 쿨다운 감소
	if player.fire_cooldown > 0.0:
		player.fire_cooldown -= delta
		if player.fire_cooldown < 0.0:
			player.fire_cooldown = 0.0

	# 5. 적 스폰 (JS: enemyPool.updateSpawn(dt, player))
	enemy_pool.update_spawn(delta, player)

	# 6. 적 AI 이동 (JS: enemyPool.updateEnemies(dt, player))
	enemy_pool.update_enemies(delta, player)

	# 7. 총알 업데이트
	bullet_pool.update_bullets(delta)

	# 8. 탄창 재장전
	weapon_system.update_reload(delta)

	# 9. 충돌 검사
	check_bullet_enemy_collisions()
	check_tank_enemy_collisions()

	# 10. 경과 시간 갱신
	elapsed_time += delta

	# 11. HUD 갱신
	_update_hud()

	# 12. 게임오버 체크
	if player.hp <= 0:
		state = "gameover"
		var total_sec: int = int(elapsed_time)
		var min: int = total_sec / 60
		var sec: int = total_sec % 60
		var time_text: String = "생존 시간: %02d:%02d" % [min, sec]
		hud.show_game_over(time_text)

# ============================================================
# gameover 상태 업데이트 — R 키 재시작 대기
# ============================================================
func _update_gameover() -> void:
	if Input.is_action_just_pressed("system_restart"):
		restart_game()

# ============================================================
# 입력 처리 (통합 — 별도 input 모듈 없음)
# ============================================================
func _read_input() -> void:
	# 드라이버 입력
	var inp = player.input_driver
	inp["forward"] = Input.is_action_pressed("driver_forward")
	inp["reverse"] = Input.is_action_pressed("driver_reverse")
	inp["left"] = Input.is_action_pressed("driver_left")
	inp["right"] = Input.is_action_pressed("driver_right")
	inp["dash"] = Input.is_action_just_pressed("driver_dash")

	# 마우스 조준 (화면 → 월드 좌표)
	player.world_aim = _get_world_mouse_position()

	# 무기 키 (융합 판정용 타임스탬프)
	for id in range(1, 5):
		var action: String = "weapon_" + str(id)
		if Input.is_action_just_pressed(action):
			weapon_system.set_weapon_key(id, true, Time.get_ticks_msec())
		if Input.is_action_just_released(action):
			weapon_system.set_weapon_key(id, false, Time.get_ticks_msec())
	weapon_system.update_selection()

# ============================================================
# 화면 마우스 좌표 → 월드 좌표 변환
# Camera2D 의 transform 기준으로 스크린 좌표를 월드 좌표로 변환
# ============================================================
func _get_world_mouse_position() -> Vector2:
	var viewport: Viewport = get_viewport()
	var mouse_pos: Vector2 = viewport.get_mouse_position()
	var cam: Camera2D = viewport.get_camera_2d()
	if cam == null:
		cam = camera_2d
	# camera_center + (mouse - screen_center) = world position
	return cam.get_screen_center_position() + mouse_pos - viewport.size * 0.5

# ============================================================
# HUD 갱신
# ============================================================
func _update_hud() -> void:
	# HP
	hud.update_hp(player.hp, player.max_hp)

	# 타이머
	hud.update_timer(elapsed_time)

	# 드리프트
	hud.set_drift_indicator(player.is_drifting)

	# 적 카운트 + 무기 정보
	var weapon_text: String = _get_weapon_hud_text()
	hud.update_enemy_count(enemy_pool.active_count, weapon_text)

# ============================================================
# 무기 HUD 텍스트 생성
# ============================================================
func _get_weapon_hud_text() -> String:
	var selected: Array[int] = weapon_system.selected_weapons
	if selected.is_empty():
		return "무기: 없음"

	var names: PackedStringArray = []
	var ammo_parts: PackedStringArray = []
	var weapon_names: Dictionary = {
		1: "폭발", 2: "속사", 3: "저격", 4: "관통",
	}
	for wid in selected:
		names.append(weapon_names.get(wid, str(wid)))
		var d: Dictionary = weapon_system.get_display(wid)
		ammo_parts.append("%d/%d" % [d.current, d.max])
	return "%s [%s]" % [ " + ".join(names), " | ".join(ammo_parts) ]

# ============================================================
# 총알-적 충돌 검사 (O(n*m))
# ============================================================
func check_bullet_enemy_collisions() -> void:
	for bullet in bullet_pool.bullets:
		if not bullet.active:
			continue

		for enemy in enemy_pool.pool:
			if not enemy.active:
				continue

			var dx: float = bullet.x - enemy.x
			var dy: float = bullet.y - enemy.y
			var dist: float = sqrt(dx * dx + dy * dy)
			var contact_dist: float = bullet.radius + enemy.radius

			if dist >= contact_dist:
				continue

			# === 히트! ===

			# 데미지 계산
			var damage: float = bullet.damage

			# 저격 무기: 원거리 계수 적용
			if bullet.weapon_id == 3:
				var w: Dictionary = GlobalConfig.weapon_by_id(3)
				var hit_dist: float = bullet.lifetime * w.bullet_speed
				var mul: float = weapon_system.get_sniper_damage_multiplier(hit_dist)
				damage *= mul

			enemy.hp -= damage

			# 무기별 특수 효과
			match bullet.weapon_id:
				1:  # 폭발 AoE
					var w: Dictionary = GlobalConfig.weapon_by_id(1)
					weapon_system.apply_explosion_blast(
						bullet.x, bullet.y,
						w.blast_radius,
						bullet.damage,
						enemy_pool,
					)
					bullet_pool.release_bullet(bullet)
				4:  # 관통 — bullet 유지, 데미지 감소
					var can_continue: bool = weapon_system.apply_pierce(bullet)
					if not can_continue:
						bullet_pool.release_bullet(bullet)
				_:  # 일반/속사/저격 — 명중 즉시 소멸
					bullet_pool.release_bullet(bullet)

			# 적 처치
			if enemy.hp <= 0:
				enemy_pool.deactivate(enemy)

			# 관통이 아니면 한 총알이 한 적만 타격
			if bullet.weapon_id != 4:
				break

# ============================================================
# 탱크-적 충돌 검사
# ============================================================
func check_tank_enemy_collisions() -> void:
	# 대시 중이 아니고 무적 상태면 충돌 스킵
	if player.dash_timer <= 0.0 and _now < player.invincible_until:
		return

	for enemy in enemy_pool.pool:
		if not enemy.active:
			continue

		var dx: float = player.position.x - enemy.x
		var dy: float = player.position.y - enemy.y
		var dist: float = sqrt(dx * dx + dy * dy)
		var contact_dist: float = _tank_radius + enemy.radius

		if dist >= contact_dist:
			continue

		# === 충돌! ===

		if player.dash_timer > 0.0:
			# 대시 중: 데미지 없음 + 적 넉백 4배 + 스턴
			var knockback_mul: float = GlobalConfig.DASH.knockback_multiplier
			var push_dist: float = (contact_dist - dist) * knockback_mul

			if dist > GlobalConfig.PHYSICS.epsilon:
				enemy.x -= (dx / dist) * push_dist
				enemy.y -= (dy / dist) * push_dist
			else:
				enemy.y -= contact_dist * knockback_mul

			# 적 맵 경계 클램프
			enemy.x = clampf(enemy.x, enemy.radius, GlobalConfig.MAP.width - enemy.radius)
			enemy.y = clampf(enemy.y, enemy.radius, GlobalConfig.MAP.height - enemy.radius)

			# 장애물 충돌 → 스턴
			for obs in obstacles_node.get_obstacles():
				if _push_circle_out_of_rect(enemy, obs):
					enemy.stun_timer = GlobalConfig.DASH.stun_duration
					break
		else:
			# 일반 충돌: 무적 체크
			if _now < player.invincible_until:
				continue

			# 데미지 계산 (드리프트 중 배율)
			var damage: float = enemy.damage
			if player.is_drifting:
				damage *= GlobalConfig.PHYSICS.drift_damage_multiplier
			player.hp -= int(damage)
			player.hp = maxi(player.hp, 0)

			# 적 넉백
			if dist > GlobalConfig.PHYSICS.epsilon:
				var overlap: float = contact_dist - dist
				enemy.x -= (dx / dist) * overlap
				enemy.y -= (dy / dist) * overlap
			else:
				enemy.y -= contact_dist

			# 적 맵 경계 클램프
			enemy.x = clampf(enemy.x, enemy.radius, GlobalConfig.MAP.width - enemy.radius)
			enemy.y = clampf(enemy.y, enemy.radius, GlobalConfig.MAP.height - enemy.radius)

			# 무적 시간 발동
			player.invincible_until = _now + int(GlobalConfig.TANK.invincible_duration * 1000.0)

		# 한 프레임에 한 적만 충돌
		break

# ============================================================
# Circle-AABB 밀어내기 (pushCircleOutOfRect)
# ============================================================
func _push_circle_out_of_rect(circle, rect: Rect2) -> bool:
	var closest_x: float = clampf(circle.x, rect.position.x, rect.position.x + rect.size.x)
	var closest_y: float = clampf(circle.y, rect.position.y, rect.position.y + rect.size.y)
	var dx: float = circle.x - closest_x
	var dy: float = circle.y - closest_y
	var dist_sq: float = dx * dx + dy * dy

	if dist_sq < circle.radius * circle.radius:
		var dist: float = sqrt(dist_sq)
		if dist < GlobalConfig.PHYSICS.epsilon:
			circle.y = rect.position.y - circle.radius
		else:
			var overlap: float = circle.radius - dist
			circle.x += (dx / dist) * overlap
			circle.y += (dy / dist) * overlap
		return true
	return false

# ============================================================
# 게임 재시작 — 전체 상태 초기화
# ============================================================
func restart_game() -> void:
	# 플레이어 리스폰
	respawn_player()

	# 모든 총알 비활성화
	for bullet in bullet_pool.bullets:
		bullet.active = false

	# 모든 적 비활성화
	for enemy in enemy_pool.pool:
		enemy.active = false
	enemy_pool.active_count = 0

	# 적 스폰 타이머 리셋
	if enemy_pool.has_method("reset_spawn_timer"):
		enemy_pool.reset_spawn_timer()

	# 무기 선택 초기화
	weapon_system.selected_weapons.clear()
	weapon_system.weapon_key_timestamps.clear()

	# 생존 타이머 리셋
	elapsed_time = 0.0

	# 게임오버 UI 숨김
	hud.hide_game_over()

	# 상태 복원
	state = "playing"

# ============================================================
# 플레이어 리스폰 — 맵 중앙 spawn_area_radius 내 랜덤 위치
# ============================================================
func respawn_player() -> void:
	var map_w: float = GlobalConfig.MAP.width
	var map_h: float = GlobalConfig.MAP.height
	var spawn_radius: float = GlobalConfig.MAP.spawn_area_radius
	var center: Vector2 = Vector2(map_w * 0.5, map_h * 0.5)

	var angle: float = randf() * TAU
	var dist: float = randf() * spawn_radius
	var pos: Vector2 = center + Vector2(cos(angle), sin(angle)) * dist

	player.position = pos
	player.vx = 0.0
	player.vy = 0.0
	player.chassis_angle = 0.0
	player.turret_angle = 0.0
	player.hp = player.max_hp
	player.fire_cooldown = 0.0
	player.invincible_until = 0
	player.dash_timer = 0.0
	player.dash_cooldown = 0.0

# ============================================================
# 시그널 핸들러 — PlayerTookDamage 등
# ============================================================
func _on_player_game_over() -> void:
	state = "gameover"
	var total_sec: int = int(elapsed_time)
	var min: int = total_sec / 60
	var sec: int = total_sec % 60
	var time_text: String = "생존 시간: %02d:%02d" % [min, sec]
	hud.show_game_over(time_text)
