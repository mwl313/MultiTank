# bullet_pool.gd — BulletPool
# 용도: 4종 무기 통합 탄환 오브젝트 풀 (총 340발)
# GlobalConfig autoload의 WEAPONS, MAP 상수 사용
#
# Node2D를 상속하여 _draw()에서 탄환 원형을 렌더링합니다.
# 각 탄환은 Dictionary(키-값 쌍)로 관리됩니다.
class_name BulletPool extends Node2D

# ============================================================
# 프로퍼티
# ============================================================
var pool: Array[Dictionary] = []             # 전체 탄환 풀 (고정 크기)
var active_count: int = 0                    # 현재 활성 탄환 수

# 내부 — _draw 최적화용 활성 리스트
var _active_list: Array[Dictionary] = []

# ============================================================
# 기본 탄환 구조체 템플릿 (Dictionary 키 목록)
# ============================================================
# {
#     active: bool,           # 활성 여부
#     x: float,               # 위치 X
#     y: float,               # 위치 Y
#     vx: float,              # 속도 X (px/s)
#     vy: float,              # 속도 Y (px/s)
#     lifetime: float,        # 남은 수명 (초)
#     max_lifetime: float,    # 최대 수명 (초) — UI 표시용
#     radius: float,          # 반지름 (px)
#     color: Color,           # 그리기 색상
#     damage: float,          # 피해량
#     weapon_id: int,         # 무기 ID (1~4)
#     pierce_reduction: float,# 관통 시 피해 감소 계수 (관통 무기 전용)
# }

# ============================================================
# _ready — 풀 사전 할당
# ============================================================
func _ready():
	var total = GlobalConfig.total_bullet_pool_size()
	for i in range(total):
		pool.append({
			active = false,
			x = 0.0,
			y = 0.0,
			vx = 0.0,
			vy = 0.0,
			lifetime = 0.0,
			max_lifetime = 0.0,
			radius = 0.0,
			color = Color.WHITE,
			damage = 0.0,
			weapon_id = 0,
			pierce_reduction = 0.0,
		})

# ============================================================
# get_bullet — 풀에서 비활성 탄환을 찾아 초기화 후 반환
# ============================================================
func get_bullet(
	x: float,
	y: float,
	vx: float,
	vy: float,
	radius: float,
	color: Color,
	damage: float,
	weapon_id: int,
	max_lifetime: float,
	pierce_reduction: float
) -> Dictionary:
	# 풀에서 첫 비활성 항목 탐색
	for bullet in pool:
		if not bullet.active:
			bullet.active = true
			bullet.x = x
			bullet.y = y
			bullet.vx = vx
			bullet.vy = vy
			bullet.radius = radius
			bullet.color = color
			bullet.damage = damage
			bullet.weapon_id = weapon_id
			bullet.max_lifetime = max_lifetime
			bullet.lifetime = max_lifetime
			bullet.pierce_reduction = pierce_reduction
			active_count += 1
			return bullet

	# 풀 소진
	push_warning("BulletPool: 풀 소진 — 모든 탄환이 활성 상태입니다")
	return {}

# ============================================================
# release_bullet — 탄환을 비활성화
# ============================================================
func release_bullet(bullet: Dictionary):
	if bullet.active:
		bullet.active = false
		active_count -= 1

# ============================================================
# update_bullets — 모든 활성 탄환 이동 + 수명/경계 체크
# ============================================================
func update_bullets(delta: float):
	var map_w = GlobalConfig.MAP.width
	var map_h = GlobalConfig.MAP.height

	# 활성 리스트 갱신
	_active_list.clear()
	for b in pool:
		if b.active:
			_active_list.append(b)

	for bullet in _active_list:
		# 1. 이동: position += velocity * delta
		bullet.x += bullet.vx * delta
		bullet.y += bullet.vy * delta

		# 2. 수명 감소
		bullet.lifetime -= delta

		# 3. 수명 만료 또는 맵 경계 이탈 → 비활성화
		var expired = bullet.lifetime <= 0.0
		var out_of_bounds = (
			bullet.x < -bullet.radius or
			bullet.x > map_w + bullet.radius or
			bullet.y < -bullet.radius or
			bullet.y > map_h + bullet.radius
		)

		if expired or out_of_bounds:
			release_bullet(bullet)

	# _active_list는 다음 프레임까지 참조되지 않음 (GC-friendly)

# ============================================================
# _draw — 모든 활성 탄환을 원형으로 그리기
# ============================================================
func _draw():
	for bullet in pool:
		if not bullet.active:
			continue
		var center = Vector2(bullet.x, bullet.y)
		draw_circle(center, bullet.radius, bullet.color)

		# 관통 무기(weapon_id == 4)는 외곽선 표시
		if bullet.weapon_id == 4:
			draw_arc(center, bullet.radius + 1.5, 0.0, TAU, 16, Color.WHITE, 1.0)

# ============================================================
# draw_bullets — _draw 트리거 (게임 매니저가 호출)
# ============================================================
func draw_bullets():
	queue_redraw()

# ============================================================
# get_active_bullets — 충돌 검사용 활성 탄환 리스트 반환
# ============================================================
func get_active_bullets() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for b in pool:
		if b.active:
			result.append(b)
	return result
