import React, { useEffect, useState } from 'react';
import { getAccounts } from '@/lib/storage';

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface Props {
  value?: string; // account code
  onChange: (accountCode: string | null) => void;
  onCreate?: (typed: string) => void;
  placeholder?: string;
}

export const AccountCombobox: React.FC<Props> = ({ value, onChange, onCreate, placeholder }) => {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AccountOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const accs = await getAccounts();
      const mapped = accs.map(a => ({ id: a.id, code: a.code, name: a.name }));
      setOptions(mapped);
    };
    load();

    const handler = () => load();
    window.addEventListener('ledger-updated', handler);
    return () => window.removeEventListener('ledger-updated', handler);
  }, []);

  const filtered = options.filter(o => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q);
  });

  return (
    <div className="relative">
      <input
        className="w-full border rounded px-3 py-2"
        placeholder={placeholder || 'Rechercher un compte (code ou nom)'}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto bg-white border rounded shadow">
          {filtered.length === 0 ? (
            <div className="p-2 hover:bg-gray-100 cursor-pointer" onMouseDown={() => { if (onCreate) onCreate(query); setOpen(false); }}>
              + Créer le compte "{query}"
            </div>
          ) : (
            filtered.map(o => (
              <div key={o.id} className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center" onMouseDown={() => { onChange(o.code); setQuery(`${o.code} - ${o.name}`); setOpen(false); }}>
                <div>
                  <div className="font-semibold">{o.code} - {o.name}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
