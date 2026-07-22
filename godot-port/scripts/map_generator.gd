# map_generator.gd — 랜덤 장애물 맵 생성기
# 용도: 시드 기반 PRNG로 AABB 장애물 배치, 재현 가능
# GlobalConfig.MAP 에서 모든 파라미터 참조
class_name MapGenerator extends Node2D

# 장애물 배열: [{x, y, w, h}] Rect2 리스트
var obstacles: Array[Rect2] = []

# 시드 기반 PRNG 함수 (mulberry32)
var _rng: Callable = func(): return 0.0

# ============================================================
# djb2 해시 — 문자열 → 32비트 정수
# ============================================================
static func _djb2_hash(seed: String) -> int:
	var hash: int = 5381
	for i in range(seed.length()):
		var c: int = seed.unicode_at(i)
		# hash * 33 + c (32비트 유지)
		hash = ((hash << 5) + hash) + c
		hash = hash & 0xFFFFFFFF  # 32비트 마스크
		# signed 32-bit 변환
		if hash > 0x7FFFFFFF:
			hash -= 0x100000000
	return hash

# ============================================================
# mulberry32 PRNG — 32비트 상태 기반, 0~1 난수 반환
# JS 원본: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
# ============================================================
static func _mulberry32(state: int) -> Callable:
	# state를 unsigned 32-bit 범위 [0, 2^32-1]로 정규화
	var s: int = state & 0xFFFFFFFF
	if s < 0:
		s += 0x100000000
	return func() -> float:
		# state = (state + 0x6D2B79F5) | 0  (32-bit signed wrap)
		s = (s + 0x6D2B79F5) & 0xFFFFFFFF
		if s < 0:
			s += 0x100000000

		# let t = Math.imul(state ^ (state >>> 15), 1 | state)
		# s는 unsigned이므로 >> 는 >>> 와 동일
		var xor_a: int = s ^ (s >> 15)  # 양수끼리 XOR, 결과는 [0, 2^32-1]
		var mul_a: int = 1 | s           # 결과는 [0, 2^32-1]
		# Math.imul = low 32 bits of signed multiply
		# unsigned로 계산 후 & 0xFFFFFFFF 로 low 32 bits 취득
		var t: int = (xor_a * mul_a) & 0xFFFFFFFF
		if t < 0:
			t += 0x100000000

		# t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		var old_t: int = t
		var xor_b: int = t ^ (t >> 7)  # t는 unsigned, >> 는 >>> 와 동일
		var mul_b: int = 61 | t          # 결과는 [0, 2^32-1]
		var imul2: int = (xor_b * mul_b) & 0xFFFFFFFF
		if imul2 < 0:
			imul2 += 0x100000000

		var sum: int = (t + imul2) & 0xFFFFFFFF
		if sum < 0:
			sum += 0x100000000
		t = sum ^ old_t  # XOR with old_t
		# t는 unsigned 범위 [0, 2^32-1]

		# return ((t ^ (t >>> 14)) >>> 0) / 4294967296
		var result: int = t ^ (t >> 14)  # t는 unsigned, >> 는 >>> 와 동일
		result = result & 0xFFFFFFFF
		if result < 0:
			result += 0x100000000

		return float(result) / 4294967296.0

# ============================================================
# 맵 생성 — 시드 기반 장애물 배치
# ============================================================
func generate() -> void:
	var map_cfg = GlobalConfig.MAP
	_rng = _mulberry32(_djb2_hash(map_cfg.seed))

	obstacles.clear()

	var count: int = map_cfg.obstacle_count
	var max_attempts: int = map_cfg.max_generation_attempts
	var min_size: float = map_cfg.obstacle_min_size
	var max_size: float = map_cfg.obstacle_max_size
	var map_w: float = map_cfg.width
	var map_h: float = map_cfg.height

	var attempts: int = 0
	while obstacles.size() < count and attempts < max_attempts:
		attempts += 1

		# 랜덤 크기
		var w: float = min_size + _rng.call() * (max_size - min_size)
		var h: float = min_size + _rng.call() * (max_size - min_size)

		# 랜덤 위치 (맵 경계 내부)
		var x: float = _rng.call() * (map_w - w)
		var y: float = _rng.call() * (map_h - h)

		var candidate: Rect2 = Rect2(x, y, w, h)

		# AABB 겹침 검사
		var overlaps: bool = false
		for existing in obstacles:
			if _aabb_overlap(candidate, existing):
				overlaps = true
				break

		if not overlaps:
			obstacles.append(candidate)

	# 그리기 요청
	queue_redraw()

# ============================================================
# AABB 겹침 검사
# ============================================================
static func _aabb_overlap(a: Rect2, b: Rect2) -> bool:
	return a.position.x < b.position.x + b.size.x \
		and a.position.x + a.size.x > b.position.x \
		and a.position.y < b.position.y + b.size.y \
		and a.position.y + a.size.y > b.position.y

# ============================================================
# 장애물 배열 반환
# ============================================================
func get_obstacles() -> Array[Rect2]:
	return obstacles

# ============================================================
# _draw() — 장애물 렌더링 (Node2D)
# generate() 후 queue_redraw()로 1회 호출
# ============================================================
func _draw() -> void:
	var color: Color = GlobalConfig.MAP.obstacle_color
	for obs in obstacles:
		draw_rect(obs, color)
