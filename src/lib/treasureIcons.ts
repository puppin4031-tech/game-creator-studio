import goldImg from '@/assets/treasure/gold.png';
import silverImg from '@/assets/treasure/silver.png';
import quizImg from '@/assets/treasure/quiz.png';
import topazImg from '@/assets/treasure/topaz.png';
import puzzleImg from '@/assets/treasure/puzzle.png';
import diamondImg from '@/assets/treasure/diamond.png';
import rubyImg from '@/assets/treasure/ruby.png';
import chestImg from '@/assets/treasure/chest.png';
import emeraldImg from '@/assets/treasure/emerald.png';
import keyImg from '@/assets/treasure/key.png';

export const TREASURE_ICON_MAP: Record<string, string> = {
  diamond: diamondImg,
  gold: goldImg,
  silver: silverImg,
  ruby: rubyImg,
  sapphire: topazImg,
  topaz: topazImg,
  emerald: emeraldImg,
  key: keyImg,
  chest: chestImg,
  // World-map additional types mapped to closest icon
  amethyst: rubyImg,
  opal: diamondImg,
  pearl: silverImg,
  copper: goldImg,
  tin: silverImg,
  alloy: silverImg,
};

export const CHALLENGE_ICON_MAP: Record<string, string> = {
  quiz: quizImg,
  puzzle: puzzleImg,
};

export function getTreasureIconSrc(challengeType: string, treasureSubtype: string | null): string {
  if (treasureSubtype && TREASURE_ICON_MAP[treasureSubtype]) {
    return TREASURE_ICON_MAP[treasureSubtype];
  }
  if (CHALLENGE_ICON_MAP[challengeType]) {
    return CHALLENGE_ICON_MAP[challengeType];
  }
  return diamondImg;
}
