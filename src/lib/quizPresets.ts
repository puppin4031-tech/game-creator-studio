export interface QuizPreset {
  question: string;
  answer: string;
}

export const QUIZ_PRESETS: QuizPreset[] = [
  { question: '대한민국의 수도는?', answer: '서울' },
  { question: '태양계의 행성은 몇 개인가요?', answer: '8' },
  { question: '지구에서 가장 큰 대양은?', answer: '태평양' },
  { question: '물의 화학식은?', answer: 'H2O' },
  { question: '한글을 만든 왕은?', answer: '세종대왕' },
  { question: '지구의 자연위성 이름은?', answer: '달' },
  { question: '1 + 1 × 2 = ?', answer: '3' },
  { question: '빛의 3원색이 아닌 것은? (빨강/초록/파랑/노랑)', answer: '노랑' },
  { question: 'DNA의 풀네임은? (영어 약자 아님)', answer: '디옥시리보핵산' },
  { question: '올림픽 오륜기의 고리 수는?', answer: '5' },
  { question: '지구에서 가장 높은 산은?', answer: '에베레스트' },
  { question: '대한민국의 국화는?', answer: '무궁화' },
  { question: '1년은 몇 주인가요?', answer: '52' },
  { question: '사람의 몸에 있는 뼈의 대략적인 개수는? (약 ~개)', answer: '206' },
  { question: '태양에서 지구까지 빛이 도달하는 시간은 약 몇 분?', answer: '8' },
  { question: '세계에서 가장 긴 강은?', answer: '나일강' },
  { question: '피타고라스 정리에서 직각삼각형의 빗변² = ?', answer: '밑변²+높이²' },
  { question: '광합성에서 식물이 만들어내는 기체는?', answer: '산소' },
  { question: '원주율(π)의 소수점 둘째 자리까지 값은?', answer: '3.14' },
  { question: '대한민국의 국기 이름은?', answer: '태극기' },
];

export interface TreasurePreset {
  name: string;
  icon: string;
  points: number;
  subtype: string;
}

export const TREASURE_PRESETS: TreasurePreset[] = [
  { name: '다이아몬드', icon: '💎', points: 50, subtype: 'diamond' },
  { name: '황금', icon: '🥇', points: 30, subtype: 'gold' },
  { name: '루비', icon: '❤️', points: 15, subtype: 'ruby' },
  { name: '사파이어', icon: '💙', points: 10, subtype: 'sapphire' },
];

export const SPECIAL_ITEMS = {
  key: { name: '열쇠', icon: '🔑', points: 0, subtype: 'key' },
  chest: { name: '보물상자', icon: '📦', points: 100, subtype: 'chest' },
};
