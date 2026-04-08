

# crafting_recipes 보너스 70% 감축

## 현재 → 변경 후 (30%만 유지)

| 아이템 | bonus_type | 현재 bonus | 감축 후 | 현재 XP | 감축 후 XP |
|--------|-----------|-----------|---------|---------|-----------|
| 루비 반지 | search_radius | 50 | 15 | 80 | 24 |
| 사파이어 목걸이 | detect_range | 30 | 9 | 80 | 24 |
| 오팔 귀걸이 | respawn_reduction | 15 | 5 | 60 | 18 |
| 에메랄드 팔찌 | xp_multiplier | 20 | 6 | 100 | 30 |
| 자수정 브로치 | move_speed | 10 | 3 | 120 | 36 |
| 토파즈 반지 | rare_chance | 15 | 5 | 150 | 45 |
| 진주 목걸이 | search_radius | 80 | 24 | 200 | 60 |
| 다이아몬드 왕관 | all_bonus | 10 | 3 | 300 | 90 |

## 변경 방법
- DB 마이그레이션으로 각 레코드의 `bonus_value`와 `xp_reward`를 UPDATE

