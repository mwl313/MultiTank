# PlayerTank — CharacterBody2D 기반 플레이어 탱크
# 2D 탑다운 탱크 서바이벌 게임 (Vanilla JS → Godot 4.x 포팅)
extends CharacterBody2D
class_name PlayerTank

# ============================================================
# 속성 — 상태 및 설정
# ============================================================
var hp: float
var max_hp: float
var chassis_angle: float = 0.0
var turret_angle: float = 0.0
var fire_cooldown: float = 0.0
var drift_angle: float = 0.0
var is_drifting: bool = false
var invincible_until: float = 0.0
var dash_timer: float = 0.0
var dash_cooldown: float = 0.0

# 입력 상태 — GameManager가 매 프레임 설정
var input_driver: Dictionary = {forward = false, reverse = false, left = false, right = false, dash = false}
var world_aim: Vector2 = Vector2.ZERO


# ============================================================
# _ready — 초기화
# ============================================================
func _ready() -> void:
	hp = GlobalConfig.TANK.hp
	max_hp = GlobalConfig.TANK.hp

	# 충돌 셰이프 — CircleShape2D (tank_collision_radius 사용)
	var shape := CircleShape2D.new()
	shape.radius = GlobalConfig.TANK.tank_collision_radius
	var collision_shape := CollisionShape2D.new()
	collision_shape.shape = shape
	add_child(collision_shape)


# ============================================================
# _physics_process — 매 프레임 물리 업데이트
# JS tank.js updateTank() 함수의 물리를 그대로 포팅
# move_and_slide()를 사용하지 않고 position을 직접 조작
# ============================================================
func _physics_process(delta: float) -> void:
	var current_time := Time.get_ticks_msec() / 1000.0

	# --- 대시 쿨다운 감소 ---
	if dash_cooldown > 0.0:
		dash_cooldown -= delta

	# --- 대시 트리거 (Space) ---
	if input_driver.dash and dash_cooldown <= 0.0 and dash_timer <= 0.0:
		dash_timer = GlobalConfig.DASH.duration
		dash_cooldown = GlobalConfig.DASH.cooldown
		invincible_until = current_time + GlobalConfig.DASH.invincible_duration

	# --- 대시 중 → 속도 오버라이드 (일반 이동 물리 무시) ---
	if dash_timer > 0.0:
		dash_timer -= delta
		var dash_dir := Vector2.RIGHT.rotated(chassis_angle)
		velocity = dash_dir * GlobalConfig.PHYSICS.max_speed * GlobalConfig.DASH.speed_multiplier
	else:
		# --- 일반 이동 물리 ---
		# 차체 회전 (A/D)
		if input_driver.left:
			chassis_angle -= GlobalConfig.PHYSICS.turn_rate * delta
		if input_driver.right:
			chassis_angle += GlobalConfig.PHYSICS.turn_rate * delta

		var dir := Vector2.RIGHT.rotated(chassis_angle)

		# 전진 가속 (W)
		if input_driver.forward:
			velocity += dir * GlobalConfig.PHYSICS.acceleration * delta

		# 후진 (S) + 제동 (전진 중일 때 추가 감속)
		if input_driver.reverse:
			velocity -= dir * GlobalConfig.PHYSICS.acceleration * GlobalConfig.PHYSICS.reverse_multiplier * delta
			var forward_speed := velocity.dot(dir)
			if forward_speed > 0.0:
				var brake := min(forward_speed, GlobalConfig.PHYSICS.acceleration * GlobalConfig.PHYSICS.braking_force * delta)
				velocity -= dir * brake

		# 마찰 (전후진 입력이 없을 때만)
		if not input_driver.forward and not input_driver.reverse:
			velocity *= pow(GlobalConfig.PHYSICS.friction, delta * 60.0)

		# 최대 속도 제한
		var speed := velocity.length()
		if speed > GlobalConfig.PHYSICS.max_speed:
			velocity = velocity.normalized() * GlobalConfig.PHYSICS.max_speed

	# --- 드리프트 감지 ---
	is_drifting = false
	var speed_sq := velocity.length_squared()
	var min_speed_sq := GlobalConfig.PHYSICS.min_speed_for_drift * GlobalConfig.PHYSICS.min_speed_for_drift
	if speed_sq > min_speed_sq:
		var vel_angle := velocity.angle()
		var diff := wrapf(chassis_angle - vel_angle, -PI, PI)
		if abs(diff) > GlobalConfig.PHYSICS.drift_threshold:
			is_drifting = true
			drift_angle = diff

	# --- 포탑 각도 (world_aim 방향) ---
	turret_angle = (world_aim - position).angle()

	# --- 위치 업데이트 (직접 조작) ---
	position += velocity * delta

	# --- 맵 경계 클램프 ---
	var half_size := GlobalConfig.TANK.tank_collision_radius
	position.x = clamp(position.x, half_size, GlobalConfig.MAP.width - half_size)
	position.y = clamp(position.y, half_size, GlobalConfig.MAP.height - half_size)

	queue_redraw()


# ============================================================
# _draw — 텍스처 없이 도형으로 탱크 렌더링
# ============================================================
func _draw() -> void:
	var w := GlobalConfig.TANK.width
	var h := GlobalConfig.TANK.height

	# --- 차체 (chassis_angle 기준 회전) ---
	draw_set_transform(Vector2.ZERO, chassis_angle)

	# 앞쪽 차체 — 밝은 녹색
	draw_rect(Rect2(-w * 0.1, -h * 0.5, w * 1.2, h * 2.5), GlobalConfig.TANK.body_front_color, true)

	# 뒤쪽 차체 — 어두운 녹색
	draw_rect(Rect2(-w * 0.5, -h * 0.5, w * 1.4, h * 2.5), GlobalConfig.TANK.body_rear_color, true)

	# 전방 방향 삼각형 — 노란색 (차체 앞쪽 중앙)
	var tri_size := 6.0
	var tri := PackedVector2Array([
		Vector2(w * 0.5 + tri_size, 0.0),       # 끝 (전방尖端)
		Vector2(w * 0.5 - tri_size, -tri_size),  # 좌측
		Vector2(w * 0.5 - tri_size, tri_size),   # 우측
	])
	draw_colored_polygon(tri, GlobalConfig.TANK.direction_triangle_color)

	# --- 포탑 (turret_angle 기준 회전 — chassis와 독립) ---
	draw_set_transform(Vector2.ZERO, turret_angle)
	draw_line(
		Vector2.ZERO,
		Vector2(GlobalConfig.TANK.turret_length, 0.0),
		GlobalConfig.TANK.turret_color,
		GlobalConfig.TANK.turret_width
	)


# ============================================================
# apply_damage — 피격 처리 (무적 시간 확인)
# ============================================================
func apply_damage(amount: float, current_time: float) -> void:
	if current_time < invincible_until:
		return
	hp -= amount
	invincible_until = current_time + GlobalConfig.TANK.invincible_duration


# ============================================================
# reset_state — 모든 상태 초기화 (리스폰/재시작)
# ============================================================
func reset_state() -> void:
	hp = max_hp
	velocity = Vector2.ZERO
	chassis_angle = 0.0
	turret_angle = 0.0
	fire_cooldown = 0.0
	drift_angle = 0.0
	is_drifting = false
	invincible_until = 0.0
	dash_timer = 0.0
	dash_cooldown = 0.0
	input_driver = {forward = false, reverse = false, left = false, right = false, dash = false}
	world_aim = Vector2.ZERO
