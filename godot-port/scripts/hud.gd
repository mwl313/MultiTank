# hud.gd — Godot Control 기반 HUD
# 용도: HP 바, 타이머, 적 카운트, 드리프트 인디케이터, 게임오버 화면
# JS 버전의 HTML div HUD를 Godot Control 노드로 대체
class_name GameHUD extends CanvasLayer

# @onready 참조 (자식 노드 — _ready() 에서 없으면 생성)
@onready var hp_bar: ProgressBar = _find_or_create_hp_bar()
@onready var hp_label: Label = _find_or_create_hp_label()
@onready var timer_label: Label = _find_or_create_timer_label()
@onready var enemy_count_label: Label = _find_or_create_enemy_count_label()
@onready var drift_indicator: Label = _find_or_create_drift_indicator()
@onready var game_over_panel: Panel = _find_or_create_game_over_panel()
@onready var survival_time_label: Label = _find_or_create_survival_time_label()
@onready var restart_hint_label: Label = _find_or_create_restart_hint_label()

# ============================================================
# 노드 찾기 또는 생성 헬퍼
# ============================================================
func _find_or_create_hp_bar() -> ProgressBar:
	var existing = find_child("HPBar", true, false)
	if existing != null and existing is ProgressBar:
		return existing
	var bar := ProgressBar.new()
	bar.name = "HPBar"
	bar.size = Vector2(300, 24)
	bar.position = Vector2(20, 20)
	bar.min_value = 0.0
	bar.max_value = 100.0
	bar.value = 100.0
	bar.show_percentage = false
	# 스타일
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.2, 0.2, 0.2, 0.8)
	bar.add_theme_stylebox_override("background", style)
	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = Color(0.18, 0.8, 0.44, 1.0)  # 초록
	bar.add_theme_stylebox_override("fill", fill_style)
	add_child(bar)
	return bar

func _find_or_create_hp_label() -> Label:
	var existing = find_child("HPLabel", true, false)
	if existing != null and existing is Label:
		return existing
	var label := Label.new()
	label.name = "HPLabel"
	label.position = Vector2(20, 48)
	label.text = "HP 100 / 100"
	label.add_theme_color_override("font_color", Color.WHITE)
	label.add_theme_font_size_override("font_size", 16)
	add_child(label)
	return label

func _find_or_create_timer_label() -> Label:
	var existing = find_child("TimerLabel", true, false)
	if existing != null and existing is Label:
		return existing
	var label := Label.new()
	label.name = "TimerLabel"
	label.position = Vector2(20, 68)
	label.text = "00:00"
	label.add_theme_color_override("font_color", Color.WHITE)
	label.add_theme_font_size_override("font_size", 14)
	add_child(label)
	return label

func _find_or_create_enemy_count_label() -> Label:
	var existing = find_child("EnemyCountLabel", true, false)
	if existing != null and existing is Label:
		return existing
	var label := Label.new()
	label.name = "EnemyCountLabel"
	label.position = Vector2(20, 88)
	label.text = "적: 0 | 무기: 없음"
	label.add_theme_color_override("font_color", Color.WHITE)
	label.add_theme_font_size_override("font_size", 14)
	add_child(label)
	return label

func _find_or_create_drift_indicator() -> Label:
	var existing = find_child("DriftIndicator", true, false)
	if existing != null and existing is Label:
		return existing
	var label := Label.new()
	label.name = "DriftIndicator"
	label.position = Vector2(20, 120)
	label.text = "DRIFT!"
	label.add_theme_color_override("font_color", Color(1.0, 0.84, 0.0, 1.0))  # 노랑
	label.add_theme_font_size_override("font_size", 24)
	label.add_theme_color_override("font_outline_color", Color.BLACK)
	label.add_theme_constant_override("outline_size", 2)
	label.visible = false
	add_child(label)
	return label

func _find_or_create_game_over_panel() -> Panel:
	var existing = find_child("GameOverPanel", true, false)
	if existing != null and existing is Panel:
		return existing
	var panel := Panel.new()
	panel.name = "GameOverPanel"
	panel.size = Vector2(1920, 1080)
	panel.position = Vector2.ZERO
	panel.visible = false
	# 어두운 배경
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.0, 0.0, 0.0, 0.75)
	panel.add_theme_stylebox_override("panel", style)
	add_child(panel)
	return panel

func _find_or_create_survival_time_label() -> Label:
	var existing = find_child("SurvivalTimeLabel", true, false)
	if existing != null and existing is Label:
		return existing
	var label := Label.new()
	label.name = "SurvivalTimeLabel"
	label.position = Vector2(960 - 150, 480 - 40)
	label.size = Vector2(300, 40)
	label.text = "생존 시간: 00:00"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color.WHITE)
	label.add_theme_font_size_override("font_size", 32)
	game_over_panel.add_child(label)
	return label

func _find_or_create_restart_hint_label() -> Label:
	var existing = find_child("RestartHintLabel", true, false)
	if existing != null and existing is Label:
		return existing
	var label := Label.new()
	label.name = "RestartHintLabel"
	label.position = Vector2(960 - 150, 540)
	label.size = Vector2(300, 30)
	label.text = "R 키를 눌러 재시작"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7, 1.0))
	label.add_theme_font_size_override("font_size", 18)
	game_over_panel.add_child(label)
	return label

# ============================================================
# HUD 갱신 함수
# ============================================================

# HP 업데이트 — 값, 텍스트, 색상 (초록/노랑/빨강)
func update_hp(current: int, max_val: int) -> void:
	hp_bar.max_value = max_val
	hp_bar.value = current
	hp_label.text = "HP %d / %d" % [current, max_val]

	var pct: float = float(current) / float(max_val) * 100.0
	var fill_style := StyleBoxFlat.new()
	if pct > 50.0:
		fill_style.bg_color = Color(0.18, 0.8, 0.44, 1.0)  # 초록
	elif pct > 25.0:
		fill_style.bg_color = Color(0.95, 0.76, 0.06, 1.0)  # 노랑
	else:
		fill_style.bg_color = Color(0.91, 0.30, 0.24, 1.0)  # 빨강
	hp_bar.add_theme_stylebox_override("fill", fill_style)

# 타이머 업데이트 (MM:SS)
func update_timer(elapsed_seconds: float) -> void:
	var total_sec: int = int(elapsed_seconds)
	var min: int = total_sec / 60
	var sec: int = total_sec % 60
	timer_label.text = "%02d:%02d" % [min, sec]

# 적 카운트 + 무기 정보 업데이트
func update_enemy_count(count: int, weapon_text: String) -> void:
	enemy_count_label.text = "적: %d | %s" % [count, weapon_text]

# 드리프트 인디케이터 표시/숨김
func set_drift_indicator(active: bool) -> void:
	drift_indicator.visible = active

# 게임오버 화면 표시
func show_game_over(survival_time_text: String) -> void:
	survival_time_label.text = survival_time_text
	game_over_panel.visible = true

# 게임오버 화면 숨김
func hide_game_over() -> void:
	game_over_panel.visible = false
