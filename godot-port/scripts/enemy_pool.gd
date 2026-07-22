# enemy_pool.gd — EnemyPool
# 용도: 적 오브젝트 풀 관리, 스폰 시스템, AI 이동, 장애물 밀어내기, 그리기
# GlobalConfig autoload의 SPAWN, ENEMY_TYPES, MAP, PHYSICS, DASH 상수 사용
#
# Node2D를 상속하여 _draw()에서 적 원형을 렌더링합니다.
# 각 적은 Dictionary(키-값 쌍)로 관리되며, 풀은 spawn_timer에 따라
# 플레이어 주변에 방사형으로 스폰됩니다.
class_name EnemyPool extends Node2D

# ============================================================
# 프로퍼티
# ============================================================
var pool: Array[Dictionary] = []             # 전체 풀 (고정 크기)
var active_count: int = 0                    # 현재 활성 적 수
var spawn_timer: float = 0.0                 # 스폰 누적 시간 (음수 = 초기 대기)
var obstacles: Array = []                    # 맵 장애물 참조 (게임 매니저가 설정)

# 내부 — 색인 캐시 (매 프레임 active 스캔 방지)
var _active_list: Array[Dictionary] = []     # 활성 적 참조 리스트 (update 시 갱신)

# ============================================================
# 기본 적 구조체 템플릿 (Dictionary 키 목록)
# ============================================================
# {
#     active: bool,       # 활성 여부
#     x: float,           # 위치 X
#     y: float,           # 위치 Y
#     hp: float,          # 현재 체력
#     max_hp: float,      # 최대 체력
#     speed: float,       # 이동 속도 (px/s)
#     damage: float,      # 충돌 피해량
#     radius: float,      # 충돌 반경 / 그리기 반지름
#     color: Color,       # 그리기 색상
#     stun_timer: float,  # 스턴 남은 시간 (초)
#     target_angle: float,# 이동 방향 (rad)
#     type_key: String,   # ENEMY_TYPES 키 ("scout"/"bruiser"/"runner")
# }

# ============================================================
# _ready
# ============================================================
func _ready():
	# 스폰 타이머를 음수로 시작 → initial_delay 만큼 대기
	spawn_timer = -GlobalConfig.SPAWN.initial_delay

	# 풀 사전 할당
	var pool_size = GlobalConfig.SPAWN.pool_size
	for i in range(pool_size):
		pool.append({
			active = false,
			x = 0.0,
			y = 0.0,
			hp = 0.0,
			max_hp = 0.0,
			speed = 0.0,
			damage = 0.0,
			radius = 0.0,
			color = Color.WHITE,
			stun_timer = 0.0,
			target_angle = 0.0,
			type_key = "",
		})

# ============================================================
# activate — 비활성 적을 찾아 ENEMY_TYPES 데이터로 초기화 후 반환
# ============================================================
func activate(type_key: String, x: float, y: float) -> Dictionary:
	var type_data = GlobalConfig.get_enemy_type(type_key)
	if type_data.is_empty():
		push_warning("EnemyPool.activate: 알 수 없는 타입 '%s'" % type_key)
		return {}

	# 풀에서 첫 비활성 항목 탐색
	for enemy in pool:
		if not enemy.active:
			enemy.active = true
			enemy.type_key = type_key
			enemy.x = x
			enemy.y = y
			enemy.hp = type_data.hp
			enemy.max_hp = type_data.hp
			enemy.speed = type_data.speed
			enemy.damage = type_data.damage
			enemy.radius = type_data.radius
			enemy.color = type_data.color
			enemy.stun_timer = 0.0
			enemy.target_angle = 0.0
			active_count += 1
			return enemy

	push_warning("EnemyPool: 풀 소진 — 활성화 실패")
	return {}

# ============================================================
# deactivate — 적을 비활성화
# ============================================================
func deactivate(enemy: Dictionary):
	if enemy.active:
		enemy.active = false
		active_count -= 1

# ============================================================
# reset_spawn_timer — 초기 대기 시간으로 리셋
# ============================================================
func reset_spawn_timer():
	spawn_timer = -GlobalConfig.SPAWN.initial_delay

# ============================================================
# update_spawn — 타이머 기반 스폰 (게임 매니저가 호출)
# ============================================================
func update_spawn(delta: float, player_pos: Vector2, player_velocity: Vector2):
	# 초기 대기 중이면 타이머 누적 후 리턴
	if spawn_timer < 0.0:
		spawn_timer += delta
		if spawn_timer < 0.0:
			return
		spawn_timer = 0.0  # 대기 종료, 정확히 0으로 맞춤

	# 활성 수 제한 확인
	if active_count >= GlobalConfig.SPAWN.max_enemies:
		return

	# 타이머 누적
	spawn_timer += delta

	# interval 이상이면 스폰
	if spawn_timer < GlobalConfig.SPAWN.interval:
		return

	# interval 차감 후 스폰
	spawn_timer -= GlobalConfig.SPAWN.interval
	_spawn_one(player_pos, player_velocity)

# ============================================================
# _spawn_one — 적 하나를 스폰
# ============================================================
func _spawn_one(player_pos: Vector2, player_velocity: Vector2):
	var spawn_cfg = GlobalConfig.SPAWN
	var map_cfg = GlobalConfig.MAP

	# 1. 가중치 랜덤 타입 선택
	var type_key = _weighted_random_type()

	# 2. 랜덤 각도와 거리
	var angle = randf_range(0.0, TAU)
	var distance = randf_range(spawn_cfg.min_spawn_distance, spawn_cfg.spawn_distance)

	# 3. 전방 회피 (forward avoidance)
	var speed_sq = player_velocity.length_squared()
	if speed_sq > spawn_cfg.min_speed_for_direction * spawn_cfg.min_speed_for_direction:
		var travel_angle = atan2(player_velocity.y, player_velocity.x)
		var diff = wrapf(angle - travel_angle, -PI, PI)
		if absf(diff) <= spawn_cfg.forward_avoidance_angle:
			if randf() < spawn_cfg.forward_avoidance:
				angle = wrapf(angle + PI, 0.0, TAU)

	# 4. 스폰 위치 계산
	var spawn_x = player_pos.x + cos(angle) * distance
	var spawn_y = player_pos.y + sin(angle) * distance

	# 5. 장애물 회피 — retry 횟수만큼 재시도
	var type_data = GlobalConfig.get_enemy_type(type_key)
	var radius = type_data.radius

	for attempt in range(spawn_cfg.retries + 1):
		if _is_position_clear(spawn_x, spawn_y, radius):
			break
		# 재시도: 새 각도 + 거리
		angle = randf_range(0.0, TAU)
		distance = randf_range(spawn_cfg.min_spawn_distance, spawn_cfg.spawn_distance)
		spawn_x = player_pos.x + cos(angle) * distance
		spawn_y = player_pos.y + sin(angle) * distance

	# 6. 맵 경계 클램프
	var half_radius = radius * 0.5
	spawn_x = clamp(spawn_x, half_radius, map_cfg.width - half_radius)
	spawn_y = clamp(spawn_y, half_radius, map_cfg.height - half_radius)

	# 7. 활성화
	activate(type_key, spawn_x, spawn_y)

# ============================================================
# _weighted_random_type — 가중치 기반 적 타입 선택
# ============================================================
func _weighted_random_type() -> String:
	var weights = GlobalConfig.SPAWN.weights
	var roll = randf()
	var cumulative = 0.0

	# Dictionary 순서는 보장되지 않지만, weights 키를 문자열 순으로 읽어도
	# 비율만 맞으면 문제 없음. 명확성을 위해 순서를 지정.
	var order = ["scout", "runner", "bruiser"]
	for key in order:
		cumulative += weights.get(key, 0.0)
		if roll < cumulative:
			return key

	return GlobalConfig.SPAWN.default_type

# ============================================================
# _is_position_clear — 장애물과 겹치지 않는 위치인지 확인
# ============================================================
func _is_position_clear(x: float, y: float, radius: float) -> bool:
	for obs in obstacles:
		var ox = obs.x if obs.has("x") else 0.0
		var oy = obs.y if obs.has("y") else 0.0
		var ow = obs.width if obs.has("width") else 0.0
		var oh = obs.height if obs.has("height") else 0.0

		# 장애물 사각형에 가장 가까운 점 계산
		var closest_x = clamp(x, ox, ox + ow)
		var closest_y = clamp(y, oy, oy + oh)
		var dx = x - closest_x
		var dy = y - closest_y
		var dist_sq = dx * dx + dy * dy
		var min_dist = radius + GlobalConfig.SPAWN.min_spawn_clearance * 0.5
		if dist_sq < min_dist * min_dist:
			return false
	return true

# ============================================================
# update_enemies — 3패스 업데이트 (게임 매니저가 호출)
#   1. AI 이동 + 거리 기반 디스폰
#   2. 적-적 분리 (push-apart)
#   3. 장애물 밀어내기 + 맵 경계 클램프
# ============================================================
func update_enemies(delta: float, player_pos: Vector2):
	# 활성 리스트 갱신
	_active_list.clear()
	for e in pool:
		if e.active:
			_active_list.append(e)

	if _active_list.is_empty():
		return

	# ---- 패스 1: AI 이동 ----
	for enemy in _active_list:
		if enemy.stun_timer > 0.0:
			enemy.stun_timer -= delta
			continue  # 스턴 중에는 이동 불가

		# 플레이어 방향 계산
		var dx = player_pos.x - enemy.x
		var dy = player_pos.y - enemy.y
		var dist_sq = dx * dx + dy * dy

		# 디스폰 거리 체크
		if dist_sq > GlobalConfig.SPAWN.despawn_distance * GlobalConfig.SPAWN.despawn_distance:
			deactivate(enemy)
			continue

		# 이동
		var dist = sqrt(dist_sq)
		if dist > GlobalConfig.PHYSICS.epsilon:
			enemy.x += (dx / dist) * enemy.speed * delta
			enemy.y += (dy / dist) * enemy.speed * delta

	# ---- 패스 1 후 다시 활성 목록 갱신 (디스폰 반영) ----
	_active_list.clear()
	for e in pool:
		if e.active:
			_active_list.append(e)

	# ---- 패스 2: 적-적 분리 (pairwise push-apart) ----
	var separation = GlobalConfig.SPAWN.enemy_separation_factor
	var count = _active_list.size()
	for i in range(count):
		var a = _active_list[i]
		for j in range(i + 1, count):
			var b = _active_list[j]
			var dx = b.x - a.x
			var dy = b.y - a.y
			var dist_sq = dx * dx + dy * dy
			var min_dist = a.radius + b.radius
			if dist_sq < min_dist * min_dist and dist_sq > 0.0001:
				var dist = sqrt(dist_sq)
				var overlap = (min_dist - dist) * 0.5 * separation
				var nx = dx / dist
				var ny = dy / dist
				a.x -= nx * overlap
				a.y -= ny * overlap
				b.x += nx * overlap
				b.y += ny * overlap

	# ---- 패스 3: 장애물 밀어내기 + 맵 경계 클램프 ----
	var map_w = GlobalConfig.MAP.width
	var map_h = GlobalConfig.MAP.height

	for enemy in _active_list:
		# 장애물 밀어내기
		for obs in obstacles:
			var ox = obs.x if obs.has("x") else 0.0
			var oy = obs.y if obs.has("y") else 0.0
			var ow = obs.width if obs.has("width") else 0.0
			var oh = obs.height if obs.has("height") else 0.0

			var closest_x = clamp(enemy.x, ox, ox + ow)
			var closest_y = clamp(enemy.y, oy, oy + oh)
			var dx = enemy.x - closest_x
			var dy = enemy.y - closest_y
			var dist_sq = dx * dx + dy * dy
			if dist_sq < enemy.radius * enemy.radius and dist_sq > 0.0001:
				var dist = sqrt(dist_sq)
				var push = enemy.radius - dist
				enemy.x += (dx / dist) * push
				enemy.y += (dy / dist) * push

		# 맵 경계 클램프
		var r = enemy.radius
		enemy.x = clamp(enemy.x, r, map_w - r)
		enemy.y = clamp(enemy.y, r, map_h - r)

# ============================================================
# _draw — 활성 적을 원형으로 그리기
# ============================================================
func _draw():
	for enemy in pool:
		if not enemy.active:
			continue
		# 채워진 원
		var center = Vector2(enemy.x, enemy.y)
		draw_circle(center, enemy.radius, enemy.color)

		# HP 바 (최대 체력보다 낮을 때만)
		if enemy.hp < enemy.max_hp:
			var bar_width = enemy.radius * 2.0
			var bar_height = 3.0
			var bar_y = enemy.y - enemy.radius - 6.0
			var bar_x = enemy.x - enemy.radius

			# 배경 (빨간색)
			var bg_rect = Rect2(bar_x, bar_y, bar_width, bar_height)
			draw_rect(bg_rect, Color.DARK_RED)

			# 현재 HP (초록색)
			var hp_ratio = max(0.0, enemy.hp / enemy.max_hp)
			var fg_rect = Rect2(bar_x, bar_y, bar_width * hp_ratio, bar_height)
			draw_rect(fg_rect, Color.LIME)

# ============================================================
# draw_enemies — _draw 트리거 (게임 매니저가 호출)
# ============================================================
func draw_enemies():
	queue_redraw()

# ============================================================
# get_active_enemies — 충돌 검사용 활성 적 리스트 반환
# ============================================================
func get_active_enemies() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for e in pool:
		if e.active:
			result.append(e)
	return result
