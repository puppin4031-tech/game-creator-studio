import { execSync } from 'node:child_process';

export interface BuildNote { day: string; subject: string }

/** Reads recent commit subjects at build time; empty when git is unavailable. */
export function readBuildNotes(limit = 40): BuildNote[] {
  try {
    const out = execSync(`git log -n ${limit} --date=short --pretty=format:%ad%x09%s`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.split('\n').filter(Boolean).map((l) => {
      const [day, ...rest] = l.split('\t');
      return { day, subject: rest.join('\t').trim() };
    }).filter((n) => n.subject && !/^(merge|wip|chore|revert)/i.test(n.subject));
  } catch {
    return [];
  }
}
