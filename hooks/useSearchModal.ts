import { useCallback, useMemo, useState } from 'react';

export function useSearchModal() {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const open = useCallback(() => {
    setSearch('');
    setAppliedSearch('');
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const apply = useCallback(() => {
    setAppliedSearch(search.trim());
  }, [search]);

  const clear = useCallback(() => {
    setSearch('');
    setAppliedSearch('');
  }, []);

  return useMemo(
    () => ({
      visible,
      search,
      appliedSearch,
      hasAppliedSearch: appliedSearch.length > 0,
      setSearch,
      open,
      close,
      apply,
      clear,
    }),
    [visible, search, appliedSearch, open, close, apply, clear]
  );
}
