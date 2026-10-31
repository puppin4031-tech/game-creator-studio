import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PlannerInput } from '@/lib/survival/plannerInput';

export function useSurvivalPlanner() {
  const [plan, setPlan] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const stop = useCallback(() => abort.current?.abort(), []);
  useEffect(() => stop, [stop]);
  const generate = useCallback(async (input: PlannerInput) => {
    if (abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true); setPlan(''); setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survival-plan`, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? 'AI 계획을 생성하지 못했습니다.');
      }
      if (!response.body) throw new Error('AI 응답을 받지 못했습니다.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; let text = ''; let done = false;
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        const frames = buffer.split('\n\n'); buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const line = frame.split('\n').find(x => x.startsWith('data: '));
          if (!line) continue;
          const event = JSON.parse(line.slice(6)) as { type: string; text?: string; message?: string };
          if (event.type === 'delta') { text += event.text ?? ''; setPlan(text); }
          if (event.type === 'error' || event.type === 'denied') throw new Error(event.message ?? 'AI 요청이 중단되었습니다.');
          if (event.type === 'done') done = true;
        }
        if (chunk.done) break;
      }
      if (!done || !text.trim()) throw new Error('계획 응답이 완료되지 않았습니다.');
    } catch (e) {
      setError(controller.signal.aborted ? '생성을 중단했습니다. 아래 내용은 미완성 계획입니다.' : e instanceof Error ? e.message : 'AI 연결에 실패했습니다.');
    } finally {
      abort.current = null; setLoading(false);
    }
  }, []);
  return { plan, error, loading, generate, stop };
}