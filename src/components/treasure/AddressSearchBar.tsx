import { useState, useRef, useCallback } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult {
  address_name: string;
  x: string; // longitude
  y: string; // latitude
}

interface Props {
  onSelect: (lat: number, lng: number, label: string) => void;
}

export default function AddressSearchBar({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((keyword: string) => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }

    // Use Kakao Geocoder for address search
    if (!window.kakao?.maps?.services) {
      // Fallback: try Places keyword search
      return;
    }

    setLoading(true);
    const geocoder = new kakao.maps.services.Geocoder();
    const places = new kakao.maps.services.Places();

    // Search both address and keyword
    let combined: SearchResult[] = [];
    let done = 0;
    const finish = () => {
      done++;
      if (done >= 2) {
        // Deduplicate by address_name
        const seen = new Set<string>();
        const unique = combined.filter(r => {
          if (seen.has(r.address_name)) return false;
          seen.add(r.address_name);
          return true;
        });
        setResults(unique.slice(0, 5));
        setLoading(false);
      }
    };

    geocoder.addressSearch(keyword, (result: any[], status: any) => {
      if (status === kakao.maps.services.Status.OK) {
        combined.push(...result.map((r: any) => ({
          address_name: r.address_name,
          x: r.x,
          y: r.y,
        })));
      }
      finish();
    });

    places.keywordSearch(keyword, (result: any[], status: any) => {
      if (status === kakao.maps.services.Status.OK) {
        combined.push(...result.slice(0, 5).map((r: any) => ({
          address_name: r.place_name + ' · ' + (r.road_address_name || r.address_name),
          x: r.x,
          y: r.y,
        })));
      }
      finish();
    });
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 400);
  };

  const handleSelect = (r: SearchResult) => {
    onSelect(parseFloat(r.y), parseFloat(r.x), r.address_name);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  if (!open) {
    return (
      <Button
        size="icon"
        variant="secondary"
        className="h-8 w-8 rounded-full shadow"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
      >
        <Search className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ width: 32, opacity: 0.8 }}
      animate={{ width: 260, opacity: 1 }}
      className="relative"
    >
      <div className="flex items-center gap-1 bg-background border rounded-lg shadow px-2 py-1">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="주소 또는 장소 검색"
          className="h-7 border-0 shadow-none focus-visible:ring-0 text-sm px-1"
        />
        <button onClick={handleClose} className="shrink-0 p-0.5">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden z-[100]"
          >
            {results.map((r, i) => (
              <button
                key={i}
                className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors text-sm border-b last:border-b-0"
                onClick={() => handleSelect(r)}
              >
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span className="line-clamp-2 text-xs">{r.address_name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg p-3 text-center text-xs text-muted-foreground">
          검색 중...
        </div>
      )}
    </motion.div>
  );
}
